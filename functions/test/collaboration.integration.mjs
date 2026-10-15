import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { handleCollaboration } from '../index.js';

const projectId = 'demo-jotit';
const db = getFirestore(initializeApp({ projectId }, 'integration'));
let env;
const call = (uid, action, jotId, values = {}) => handleCollaboration(db, uid, { action, jotId, ...values });
const client = (uid) => env.authenticatedContext(uid).firestore();
async function seed(id = 'shared') {
  await db.doc(`jots/${id}`).set({ createdAt: 1, updatedAt: 1, encryptedPayload: 'encrypted-original', encryptionVersion: 1, memberIds: ['owner'], ownerId: 'owner', trashedAt: null, expiresAt: null });
  await call('owner', 'enable', id, { name: 'Alex', encryptedPayload: 'shared-ciphertext', envelope: 'owner-envelope', updatedAt: 1 });
  return id;
}
async function invite(id, permission = 'editor', owner = 'owner') {
  await db.doc(`jots/${id}`).update({ lastInviteAt: 0 });
  return call(owner, 'createInvite', id, { role: permission, encryptedPreview: 'encrypted-preview' });
}
async function join(uid, id, token) { return call(uid, 'acceptInvite', id, { token, name: uid, envelope: `${uid}-envelope` }); }
const rejected = (promise) => assert.rejects(promise);
before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') } }); await env.clearFirestore(); });
after(async () => { await env.cleanup(); await db.terminate(); });

test('authenticated conversion protects private content and key envelopes', async () => {
  await rejected(call(null, 'enable', 'private'));
  await db.doc('jots/private').set({ createdAt: 1, updatedAt: 1, encryptedPayload: 'old', encryptionVersion: 1, memberIds: ['owner'], ownerId: 'owner', trashedAt: null, expiresAt: null });
  await rejected(call('intruder', 'enable', 'private', { name: 'X', encryptedPayload: 'overwrite', envelope: 'key', updatedAt: 1 }));
  await rejected(call('owner', 'enable', 'private', { name: 'Alex', encryptedPayload: 'overwrite', envelope: 'key', updatedAt: 0 }));
  await seed();
  await assertSucceeds(getDoc(doc(client('owner'), 'jots/shared')));
  await assertFails(getDoc(doc(client('intruder'), 'jots/shared')));
  await assertFails(setDoc(doc(client('owner'), 'jots/forged'), { createdAt: 1, updatedAt: 1, encryptedPayload: 'x', encryptionVersion: 1, memberIds: ['owner', 'intruder'], ownerId: 'owner' }));
});
test('invitation preview, decline, accept, and access are enforced', async () => {
  const id = await seed('invitations'), link = await invite(id, 'viewer');
  await rejected(call('intruder', 'createInvite', id, { role: 'editor', encryptedPreview: 'x' }));
  await rejected(call('owner', 'createInvite', id, { role: 'owner', encryptedPreview: 'x' }));
  assert.equal((await call('viewer', 'previewInvite', id, { token: link.token })).role, 'viewer');
  await call('viewer', 'declineInvite', id, { token: link.token });
  assert.deepEqual((await db.doc(`jots/${id}`).get()).data().memberIds, ['owner']);
  await assertFails(getDoc(doc(client('viewer'), `jots/${id}`)));
  await join('viewer', id, link.token);
  await join('viewer', id, link.token); // idempotent acceptance
  const jot = (await db.doc(`jots/${id}`).get()).data();
  assert.deepEqual(jot.memberIds, ['owner', 'viewer']);
  assert.equal(jot.collaboration.members.viewer.role, 'viewer');
  await assertSucceeds(getDoc(doc(client('viewer'), `jots/${id}`)));
  await assertSucceeds(getDoc(doc(client('viewer'), `jots/${id}/keys/viewer`)));
  await assertFails(getDoc(doc(client('viewer'), `jots/${id}/keys/owner`)));
  await assertFails(getDocs(collection(client('viewer'), `jots/${id}/invitations`)));
  await assertFails(updateDoc(doc(client('viewer'), `jots/${id}`), { encryptedPayload: 'viewer-write' }));
  const notifications = await getDocs(collection(client('viewer'), 'users/viewer/notifications'));
  assert.equal(notifications.size, 1);
  await assertSucceeds(updateDoc(notifications.docs[0].ref, { read: true }));
  await assertFails(updateDoc(notifications.docs[0].ref, { description: 'forged' }));
  await assertFails(getDocs(collection(client('owner'), 'users/viewer/notifications')));
});
test('editor writes require revisions and cannot modify ownership or membership', async () => {
  const id = await seed('permissions'), link = await invite(id); await join('editor', id, link.token);
  const ref = doc(client('editor'), `jots/${id}`);
  const update = { encryptedPayload: 'edited', updatedAt: 2, 'collaboration.revision': 1, 'collaboration.lastEditedBy': 'editor', 'collaboration.lastEditedAt': 2 };
  await assertSucceeds(updateDoc(ref, update));
  await assertFails(updateDoc(ref, update)); // stale revision
  await assertFails(updateDoc(ref, { ...update, 'collaboration.revision': 2, ownerId: 'editor' }));
  await assertFails(updateDoc(ref, { ...update, 'collaboration.revision': 2, 'collaboration.members.editor.role': 'owner' }));
  await assertFails(updateDoc(ref, { ...update, 'collaboration.revision': 2, 'collaboration.lastEditedBy': 'owner' }));
  await assertSucceeds(setDoc(doc(client('editor'), `jots/${id}/presence/editor`), { active: true, seenAt: serverTimestamp() }));
  await assertFails(setDoc(doc(client('editor'), `jots/${id}/presence/owner`), { active: true, seenAt: serverTimestamp() }));
  await assertFails(setDoc(doc(client('editor'), `jots/${id}/events/fake`), { description: 'forged' }));
  await assertSucceeds(getDocs(query(collection(client('editor'), 'jots'), where('memberIds', 'array-contains', 'editor'))));
});
test('disabled and expired invitations cannot grant access', async () => {
  const id = await seed('revocation'), link = await invite(id);
  await call('owner', 'disableInvite', id);
  await rejected(join('new', id, link.token));
  await rejected(call('new', 'previewInvite', id, { token: link.token }));
  const expired = await invite(id); await db.doc(`jots/${id}/invitations/${expired.id}`).update({ expiresAt: 1 });
  await rejected(join('new', id, expired.token));
  await rejected(call('new', 'disableInvite', id));
});
test('concurrent joins, group names, roles, removal and ownership transfer stay consistent', async () => {
  const id = await seed('lifecycle'), link = await invite(id);
  await Promise.all([join('alice', id, link.token), join('bob', id, link.token)]);
  assert.equal((await db.doc(`jots/${id}`).get()).data().memberIds.length, 3);
  await call('alice', 'setName', id, { name: 'Mom' });
  assert.equal((await db.doc(`jots/${id}`).get()).data().collaboration.members.alice.name, 'Mom');
  await rejected(call('alice', 'setRole', id, { memberId: 'bob', role: 'viewer' }));
  await call('owner', 'setRole', id, { memberId: 'alice', role: 'viewer' });
  await rejected(call('owner', 'leave', id));
  await call('owner', 'remove', id, { memberId: 'bob' });
  await assertFails(getDoc(doc(client('bob'), `jots/${id}`)));
  assert.equal((await db.doc(`jots/${id}/keys/bob`).get()).exists, false);
  await rejected(join('bob', id, link.token));
  const removed = await db.collection('users/bob/notifications').get();
  assert.ok(removed.docs.some(d => d.data().description.includes('removed')));
  await call('owner', 'transfer', id, { memberId: 'alice' });
  const jot = (await db.doc(`jots/${id}`).get()).data();
  assert.equal(jot.ownerId, 'alice'); assert.equal(jot.collaboration.members.owner.role, 'editor');
  assert.equal(Object.values(jot.collaboration.members).filter(m => m.role === 'owner').length, 1);
  await rejected(call('owner', 'remove', id, { memberId: 'alice' }));
  await call('owner', 'leave', id);
  await assertFails(getDoc(doc(client('owner'), `jots/${id}`)));
});
