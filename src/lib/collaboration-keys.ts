import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey } from 'expo-crypto';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { decryptJson, encryptJson, type JotEncryptionKey } from '@/lib/jot-encryption';

const options = { keychainService: 'app.jotit.shared-keys', keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const storageId = (userId: string, jotId: string) => `jotit.shared.${userId}.${jotId}`;
const keys = new Map<string, Promise<JotEncryptionKey>>();
export function clearSharedKeys() { keys.clear(); }
export function forgetSharedKey(userId: string, jotId: string) { keys.delete(`${userId}:${jotId}`); }
export async function rememberSharedKey(userId: string, jotId: string, key: JotEncryptionKey) {
  await SecureStore.setItemAsync(storageId(userId, jotId), await key.encoded('base64'), options);
  keys.set(`${userId}:${jotId}`, Promise.resolve(key));
}
export async function wrapSharedKey(key: JotEncryptionKey, personalKey: JotEncryptionKey) {
  return encryptJson(await key.encoded('base64'), personalKey);
}
export function sharedJotKey(jotId: string, userId: string, personalKey: JotEncryptionKey) {
  const id = `${userId}:${jotId}`;
  let pending = keys.get(id);
  if (!pending) {
    pending = (async () => {
      const stored = await SecureStore.getItemAsync(storageId(userId, jotId), options);
      if (stored) return AESEncryptionKey.import(stored, 'base64');
      const snapshot = await getDoc(doc(getFirestoreDb(), 'jots', jotId, 'keys', userId));
      const envelope = snapshot.data()?.envelope;
      if (typeof envelope !== 'string') throw new Error('This jot’s key is not available. Ask its owner for a new invitation.');
      const encoded = await decryptJson<string>(envelope, personalKey);
      const key = await AESEncryptionKey.import(encoded, 'base64');
      await SecureStore.setItemAsync(storageId(userId, jotId), encoded, options);
      return key;
    })();
    keys.set(id, pending);
    void pending.catch(() => keys.delete(id));
  }
  return pending;
}
