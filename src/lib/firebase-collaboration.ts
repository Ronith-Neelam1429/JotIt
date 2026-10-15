import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { AESEncryptionKey } from 'expo-crypto';
import { getFirebaseApp } from '@/lib/firebase';
import { getFirebaseAuth } from '@/lib/firebase-auth';
import { contentOf, type Jot } from '@/lib/jot-model';
import { decryptJson, encryptJson, getOrCreateJotEncryptionKey } from '@/lib/jot-encryption';
import { forgetSharedKey, rememberSharedKey, sharedJotKey, wrapSharedKey } from '@/lib/collaboration-keys';
import { displayName, invitationLink } from '@/lib/collaboration-model';

export async function collaborationAction<T = { updated: boolean }>(action: string, jotId: string, values: Record<string, unknown> = {}) {
  const call = httpsCallable<Record<string, unknown>, T>(getFunctions(getFirebaseApp(), 'us-central1'), 'collaboration', { timeout: 30000 });
  return (await call({ action, jotId, ...values })).data;
}
function signedInUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in to collaborate.');
  return user;
}
export async function enableCollaboration(jot: Jot) {
  const user = signedInUser();
  const personal = await getOrCreateJotEncryptionKey(user.uid);
  if (!jot.collaboration) {
    const key = await AESEncryptionKey.generate(256);
    await collaborationAction('enable', jot.id, { name: displayName(user.displayName), updatedAt: jot.updatedAt,
      encryptedPayload: await encryptJson({ ...contentOf(jot), versions: jot.versions, activity: [] }, key),
      envelope: await wrapSharedKey(key, personal) });
  }
  // Read the winning conversion's envelope, including when two owner devices race.
  forgetSharedKey(user.uid, jot.id);
  return sharedJotKey(jot.id, user.uid, personal);
}
export async function createInvitation(jot: Jot, role: 'editor' | 'viewer') {
  const key = await enableCollaboration(jot);
  const result = await collaborationAction<{ token: string; expiresAt: number; epoch: number }>('createInvite', jot.id, { role,
    encryptedPreview: await encryptJson({ title: jot.title }, key) });
  return { epoch: result.epoch, url: invitationLink(jot.id, result.token, await key.encoded('base64')), expiresAt: result.expiresAt };
}
export async function previewInvitation(jotId: string, token: string, encodedKey: string) {
  const result = await collaborationAction<{ encryptedPreview: string; role: 'editor' | 'viewer'; expiresAt: number; alreadyMember: boolean }>('previewInvite', jotId, { token });
  const key = await AESEncryptionKey.import(encodedKey, 'base64');
  const preview = await decryptJson<{ title: string }>(result.encryptedPreview, key);
  if (typeof preview.title !== 'string') throw new Error('This invitation is not valid.');
  return { ...result, title: preview.title.slice(0, 100) };
}
export async function acceptInvitation(jotId: string, token: string, encodedKey: string, name: string) {
  const user = signedInUser(), personal = await getOrCreateJotEncryptionKey(user.uid);
  const key = await AESEncryptionKey.import(encodedKey, 'base64');
  await collaborationAction('acceptInvite', jotId, { token, name: displayName(name), envelope: await wrapSharedKey(key, personal) });
  await rememberSharedKey(user.uid, jotId, key);
}
export function collaborationError(error: unknown) {
  if (error instanceof Error && /unavailable|network|deadline/i.test(error.message)) return 'Connect to the internet and try again.';
  return error instanceof Error ? error.message.replace(/^\[[^\]]+\]\s*/, '') : 'Could not save this change. Try again.';
}
