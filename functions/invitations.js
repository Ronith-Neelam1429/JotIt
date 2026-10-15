import { Timestamp } from 'firebase-admin/firestore';
import { activity, cleanName, fail, hashToken, newToken, notify, requireOwner, role, text } from './core.js';

export async function invitationAction(db, ref, uid, data) {
  const now = Date.now();
  if (data.action === 'createInvite') {
    const permission = role(data.role);
    const encryptedPreview = text(data.encryptedPreview, 'encrypted preview', 4096);
    const token = newToken(), id = hashToken(token);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref), jot = snap.data();
      if (!jot?.collaboration || jot.trashedAt) fail('failed-precondition', 'This jot cannot be shared right now.');
      requireOwner(jot, uid);
      if (now - (jot.lastInviteAt ?? 0) < 2000) fail('resource-exhausted', 'Wait a moment before making another link.');
      if (jot.memberIds.length >= 30) fail('resource-exhausted', 'This jot has reached its 30-member limit.');
      const epoch = jot.linkEpoch + 1;
      tx.update(ref, { linkEpoch: epoch, lastInviteAt: now });
      tx.set(ref.collection('invitations').doc(id), { role: permission, encryptedPreview, epoch,
        createdBy: uid, createdAt: now, expiresAt: now + 7 * 86400000, expiresOn: Timestamp.fromMillis(now + 7 * 86400000), active: true });
      return { token, id, epoch, expiresAt: now + 7 * 86400000 };
    });
  }
  if (data.action === 'disableInvite') {
    return db.runTransaction(async (tx) => {
      const jot = (await tx.get(ref)).data();
      if (!jot) fail('not-found', 'This jot is no longer available.');
      requireOwner(jot, uid);
      tx.update(ref, { linkEpoch: (jot.linkEpoch ?? 0) + 1 });
      return { disabled: true };
    });
  }
  const inviteRef = ref.collection('invitations').doc(hashToken(data.token));
  return db.runTransaction(async (tx) => {
    const [jotSnap, inviteSnap, responseSnap] = await Promise.all([tx.get(ref), tx.get(inviteRef), tx.get(inviteRef.collection('responses').doc(uid))]);
    const jot = jotSnap.data(), invite = inviteSnap.data();
    if (!jot?.collaboration || jot.trashedAt || !invite?.active || invite.expiresAt <= now || invite.epoch !== jot.linkEpoch)
      fail('not-found', 'This invitation expired or was disabled. Ask the owner for a new link.');
    if (data.action === 'previewInvite') return { encryptedPreview: invite.encryptedPreview, role: invite.role,
      expiresAt: invite.expiresAt, alreadyMember: jot.memberIds.includes(uid) };
    const responseRef = inviteRef.collection('responses').doc(uid);
    if (data.action === 'declineInvite') {
      if (!jot.memberIds.includes(uid)) tx.set(responseRef, { status: 'declined', at: now });
      return { declined: true };
    }
    if (data.action !== 'acceptInvite') fail('invalid-argument', 'Unknown invitation action.');
    const name = cleanName(data.name), envelope = text(data.envelope, 'encrypted key', 2048);
    if (!jot.memberIds.includes(uid)) {
      if (jot.memberIds.length >= 30) fail('resource-exhausted', 'This jot has reached its 30-member limit.');
      const members = { ...jot.collaboration.members, [uid]: { name, role: invite.role, joinedAt: now } };
      tx.update(ref, { memberIds: [...jot.memberIds, uid], 'collaboration.members': members });
      activity(tx, ref, uid, name, 'joined the jot', now);
      notify(tx, db, uid, ref.id, 'You were added to a shared jot.', now);
      notify(tx, db, jot.ownerId, ref.id, `${name} joined your jot.`, now);
    }
    // Each member stores only a copy wrapped by their own device key.
    tx.set(ref.collection('keys').doc(uid), { envelope });
    if (responseSnap.data()?.status !== 'accepted') tx.set(responseRef, { status: 'accepted', at: now });
    return { joined: true };
  });
}
