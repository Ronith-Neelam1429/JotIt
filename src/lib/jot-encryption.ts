import {
  AESSealedData,
  AESEncryptionKey,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_PREFIX = 'jotit.encryption-key';
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'app.jotit.encryption',
};

export type JotEncryptionKey = AESEncryptionKey;

function secureStoreKey(userId: string) {
  return `${KEY_PREFIX}.${userId}`;
}

function legacySecureStoreOptions(): SecureStore.SecureStoreOptions | null {
  const applicationId = Platform.select({
    android: Constants.expoConfig?.android?.package,
    ios: Constants.expoConfig?.ios?.bundleIdentifier,
  });

  if (!applicationId) return null;

  const keychainService = `${applicationId}.encryption`;
  if (keychainService === SECURE_STORE_OPTIONS.keychainService) return null;

  return {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    keychainService,
  };
}

async function migrateLegacyEncryptionKey(userId: string) {
  const legacyOptions = legacySecureStoreOptions();
  if (!legacyOptions) return null;

  const key = secureStoreKey(userId);
  const legacyKey = await SecureStore.getItemAsync(key, legacyOptions);
  if (!legacyKey) return null;

  await SecureStore.setItemAsync(key, legacyKey, SECURE_STORE_OPTIONS);
  await SecureStore.deleteItemAsync(key, legacyOptions);
  return legacyKey;
}

export async function getOrCreateJotEncryptionKey(userId: string) {
  const storedKey = await SecureStore.getItemAsync(
    secureStoreKey(userId),
    SECURE_STORE_OPTIONS,
  );

  if (storedKey) {
    return AESEncryptionKey.import(storedKey, 'base64');
  }

  const migratedKey = await migrateLegacyEncryptionKey(userId);
  if (migratedKey) {
    return AESEncryptionKey.import(migratedKey, 'base64');
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
