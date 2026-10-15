import { activity, cleanName, fail, identifier, notify, requireMember, requireOwner, role } from './core.js';

export async function memberAction(db, ref, uid, data) {
  return db.runTransaction(async (tx) => {
    const jot = (await tx.get(ref)).data();
    if (!jot?.collaboration) fail('not-found', 'This shared jot is no longer available.');
    requireMember(jot, uid);
    const members = { ...jot.collaboration.members }, actorName = members[uid].name, now = Date.now();
    if (data.action === 'setName') {
      const name = cleanName(data.name);
      if (name === members[uid].name) return { updated: true };
      members[uid] = { ...members[uid], name };
      tx.update(ref, { 'collaboration.members': members });
      activity(tx, ref, uid, name, 'updated their name for this jot', now);
      return { updated: true };
    }
    const target = data.action === 'leave' ? uid : identifier(data.memberId);
    if (!members[target]) fail('not-found', 'This person is no longer a member.');
    if (data.action !== 'leave') requireOwner(jot, uid);
    if (data.action === 'setRole') {
      if (target === jot.ownerId) fail('failed-precondition', 'Transfer ownership before changing the owner’s role.');
      const permission = role(data.role);
      if (members[target].role === permission) return { updated: true };
      members[target] = { ...members[target], role: permission };
      tx.update(ref, { 'collaboration.members': members });
      activity(tx, ref, uid, actorName, `made ${members[target].name} ${permission === 'editor' ? 'an editor' : 'a viewer'}`, now);
      notify(tx, db, target, ref.id, `${actorName} changed your role to ${permission}.`, now);
    } else if (data.action === 'transfer') {
      if (target === uid) fail('invalid-argument', 'Choose another member.');
      members[uid] = { ...members[uid], role: 'editor' };
      members[target] = { ...members[target], role: 'owner' };
      tx.update(ref, { ownerId: target, 'collaboration.members': members, linkEpoch: jot.linkEpoch + 1 });
      activity(tx, ref, uid, actorName, `transferred ownership to ${members[target].name}`, now);
      notify(tx, db, target, ref.id, `${actorName} made you the owner of a shared jot.`, now);
    } else if (data.action === 'remove' || data.action === 'leave') {
      if (target === jot.ownerId) fail('failed-precondition', 'Transfer ownership to another member before leaving.');
      const targetName = members[target].name;
      delete members[target];
      tx.update(ref, { memberIds: jot.memberIds.filter((id) => id !== target), 'collaboration.members': members, linkEpoch: jot.linkEpoch + 1 });
      tx.delete(ref.collection('keys').doc(target));
      tx.delete(ref.collection('presence').doc(target));
      activity(tx, ref, uid, actorName, data.action === 'leave' ? 'left the jot' : `removed ${targetName}`, now);
      notify(tx, db, target, ref.id, data.action === 'leave' ? 'You left a shared jot.' : `${actorName} removed you from a shared jot.`, now);
      if (data.action === 'leave') notify(tx, db, jot.ownerId, ref.id, `${actorName} left your jot.`, now);
    } else fail('invalid-argument', 'Unknown member action.');
    return { updated: true };
  });
}
