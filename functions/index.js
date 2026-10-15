import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { cleanName, fail, identifier, requireOwner, text } from './core.js';
initializeApp();

export async function handleCollaboration(db, uid, data) {
  if (!uid) fail('unauthenticated', 'Sign in to collaborate.');
  const jotId = identifier(data?.jotId);
  const ref = db.collection('jots').doc(jotId);
  if (data.action === 'enable') {
    const name = cleanName(data.name);
    const encryptedPayload = text(data.encryptedPayload, 'encrypted jot', 900000);
    const envelope = text(data.envelope, 'encrypted key', 2048);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail('not-found', 'Save this jot before sharing it.');
      const jot = snap.data(); requireOwner(jot, uid);
      if (jot.collaboration) return { enabled: true };
      if (jot.trashedAt || jot.updatedAt !== data.updatedAt) fail('failed-precondition', 'The jot changed. Wait for it to sync and try again.');
      const now = Date.now();
      tx.update(ref, { encryptedPayload, encryptionVersion: 2, linkEpoch: 0,
        collaboration: { revision: 0, members: { [uid]: { name, role: 'owner', joinedAt: now } }, lastEditedBy: uid, lastEditedAt: now } });
      tx.set(ref.collection('keys').doc(uid), { envelope });
      return { enabled: true };
    });
  }
  fail('invalid-argument', 'Unknown collaboration action.');
}
export const collaboration = onCall({ region: 'us-central1', maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' },
  (request) => handleCollaboration(getFirestore(), request.auth?.uid, request.data));
