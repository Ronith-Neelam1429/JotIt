import { AESEncryptionKey } from 'expo-crypto';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { decryptJson, encryptJson, type JotEncryptionKey } from '@/lib/jot-encryption';

const keys = new Map<string, Promise<JotEncryptionKey>>();
export function clearSharedKeys() { keys.clear(); }
export function forgetSharedKey(userId: string, jotId: string) { keys.delete(`${userId}:${jotId}`); }
export async function wrapSharedKey(key: JotEncryptionKey, personalKey: JotEncryptionKey) {
  return encryptJson(await key.encoded('base64'), personalKey);
}
export function sharedJotKey(jotId: string, userId: string, personalKey: JotEncryptionKey) {
  const id = `${userId}:${jotId}`;
  let pending = keys.get(id);
  if (!pending) {
    pending = (async () => {
      const snapshot = await getDoc(doc(getFirestoreDb(), 'jots', jotId, 'keys', userId));
      const envelope = snapshot.data()?.envelope;
      if (typeof envelope !== 'string') throw new Error('This jot’s key is not available. Ask its owner for a new invitation.');
      const encoded = await decryptJson<string>(envelope, personalKey);
      return AESEncryptionKey.import(encoded, 'base64');
    })();
    keys.set(id, pending);
    void pending.catch(() => keys.delete(id));
  }
  return pending;
}
