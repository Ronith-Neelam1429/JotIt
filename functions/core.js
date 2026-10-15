import { Timestamp } from 'firebase-admin/firestore';
import { createHash, randomBytes } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
export const fail = (code, message) => { throw new HttpsError(code, message); };
export function text(value, name, max = 128) {
  if (typeof value !== 'string' || !value.length || value.length > max) fail('invalid-argument', `Invalid ${name}.`);
  return value;
}
export function identifier(value) {
  if (!/^[\w-]{1,128}$/.test(text(value, 'identifier'))) fail('invalid-argument', 'Invalid identifier.');
  return value;
}
export const cleanName = (value) => text(value, 'display name', 40).replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'Member';
export function role(value) {
  if (!['editor', 'viewer'].includes(value)) fail('invalid-argument', 'Choose editor or viewer.');
  return value;
}
export const hashToken = (value) => {
  if (!/^[a-f0-9]{64}$/.test(text(value, 'invitation', 64))) fail('invalid-argument', 'Invalid invitation.');
  return createHash('sha256').update(value).digest('hex');
};
export const newToken = () => randomBytes(32).toString('hex');
export function requireOwner(jot, uid) {
  if (jot.ownerId !== uid) fail('permission-denied', 'Only the owner can do that.');
}
export function requireMember(jot, uid) {
  if (!jot.memberIds?.includes(uid)) fail('permission-denied', 'You no longer have access to this jot.');
}
export function activity(tx, ref, uid, name, description, now) {
  tx.set(ref.collection('events').doc(), { actorId: uid, actorName: name, description, at: now, expiresAt: Timestamp.fromMillis(now + 90 * 86400000) });
}
export function notify(tx, db, uid, jotId, description, now) {
  tx.set(db.collection('users').doc(uid).collection('notifications').doc(), { jotId, description, createdAt: now, read: false, expiresAt: Timestamp.fromMillis(now + 90 * 86400000) });
}
