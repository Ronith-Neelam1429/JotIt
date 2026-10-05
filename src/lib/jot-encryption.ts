import {
  AESSealedData,
  AESEncryptionKey,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'jotit.encryption-key';
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'com.ronithneelam.jotit.encryption',
};

export type JotEncryptionKey = AESEncryptionKey;

function secureStoreKey(userId: string) {
  return `${KEY_PREFIX}.${userId}`;
}

export async function getOrCreateJotEncryptionKey(userId: string) {
  const storedKey = await SecureStore.getItemAsync(
    secureStoreKey(userId),
    SECURE_STORE_OPTIONS,
  );

  if (storedKey) {
    return AESEncryptionKey.import(storedKey, 'base64');
  }

  const encryptionKey = await AESEncryptionKey.generate(256);
  const encodedKey = await encryptionKey.encoded('base64');

  await SecureStore.setItemAsync(
    secureStoreKey(userId),
    encodedKey,
    SECURE_STORE_OPTIONS,
  );

  return encryptionKey;
}

export async function encryptJson(value: unknown, encryptionKey: JotEncryptionKey) {
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const sealedData = await aesEncryptAsync(plaintext, encryptionKey);
  return sealedData.combined('base64') as Promise<string>;
}

export async function decryptJson<T>(
  encryptedValue: string,
  encryptionKey: JotEncryptionKey,
) {
  const sealedData = AESSealedData.fromCombined(encryptedValue);
  const plaintext = await aesDecryptAsync(sealedData, encryptionKey);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
