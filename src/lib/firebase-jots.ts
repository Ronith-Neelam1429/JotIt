import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
} from '@react-native-firebase/firestore';

import { getFirestoreDb } from '@/lib/firebase';
import {
  decryptJson,
  encryptJson,
  type JotEncryptionKey,
} from '@/lib/jot-encryption';

import { contentOf, parseContent, parseVersions, type Jot } from '@/lib/jot-model';
export type { Jot, JotEntry, JotKind } from '@/lib/jot-model';

type EncryptedJotContent = Omit<
  Jot,
  'createdAt' | 'id' | 'memberIds' | 'ownerId' | 'trashedAt' | 'updatedAt'
>;

type EncryptedFirestoreJot = {
  createdAt: number;
  encryptedPayload: string;
  encryptionVersion: 1;
  expiresAt: Timestamp | null;
  memberIds: string[];
  ownerId: string;
  trashedAt: Timestamp | null;
  updatedAt: number;
};

type LegacyFirestoreJot = Omit<Jot, 'id'> & {
  memberIds: string[];
  ownerId: string;
};

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function parseLegacyJot(id: string, value: unknown): Jot | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<LegacyFirestoreJot>;
  const content = parseContent(data);
  if (!content || typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') return null;
  return { ...content, id, createdAt: data.createdAt, updatedAt: data.updatedAt,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '', trashedAt: null, versions: [] };
}

function jotDocument(jotId: string) {
  return doc(getFirestoreDb(), 'jots', jotId);
}

async function encryptedJotData(
  jot: Jot,
  encryptionKey: JotEncryptionKey,
): Promise<EncryptedFirestoreJot> {
  const content: EncryptedJotContent = {
    ...contentOf(jot), versions: jot.versions,
  };

  return {
    createdAt: jot.createdAt,
    encryptedPayload: await encryptJson(content, encryptionKey),
    encryptionVersion: 1,
    expiresAt: jot.trashedAt
      ? Timestamp.fromMillis(jot.trashedAt + TRASH_RETENTION_MS)
      : null,
    memberIds: jot.memberIds,
    ownerId: jot.ownerId,
    trashedAt: jot.trashedAt ? Timestamp.fromMillis(jot.trashedAt) : null,
    updatedAt: jot.updatedAt,
  };
}

async function decryptStoredJot(
  id: string,
  value: unknown,
  encryptionKey: JotEncryptionKey,
): Promise<Jot | null> {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<EncryptedFirestoreJot>;

  if (
    data.encryptionVersion !== 1 ||
    typeof data.encryptedPayload !== 'string' ||
    typeof data.createdAt !== 'number' ||
    typeof data.updatedAt !== 'number'
  ) {
    return null;
  }

  const decrypted = await decryptJson<EncryptedJotContent>(data.encryptedPayload, encryptionKey);
  const content = parseContent(decrypted);
  if (!content) return null;

  return {
    ...content,
    versions: parseVersions(decrypted.versions),
    createdAt: data.createdAt,
    id,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    trashedAt: data.trashedAt?.toMillis() ?? null,
    updatedAt: data.updatedAt,
  };
}

export function subscribeToJots(
  userId: string,
  encryptionKey: JotEncryptionKey,
  onJots: (jots: Jot[]) => void,
  onError: (error: Error) => void,
) {
  const jotsQuery = query(
    collection(getFirestoreDb(), 'jots'),
    where('memberIds', 'array-contains', userId),
  );

  let revision = 0;
  let active = true;
  const unsubscribe = onSnapshot(
    jotsQuery,
    (snapshot) => {
      const currentRevision = ++revision;
      void (async () => {
        const jots = await Promise.all(
          snapshot.docs.map(async (jotSnapshot) => {
            const data = jotSnapshot.data();
            const encryptedJot = await decryptStoredJot(
              jotSnapshot.id,
              data,
              encryptionKey,
            );
            if (encryptedJot) return encryptedJot;

            const legacyJot = parseLegacyJot(jotSnapshot.id, data);
            if (!legacyJot) return null;

            await setDoc(
              jotDocument(legacyJot.id),
              await encryptedJotData(legacyJot, encryptionKey),
            );
            return legacyJot;
          }),
        );

        if (!active || revision !== currentRevision) return;
        onJots(
          jots
            .filter((jot): jot is Jot => Boolean(jot))
            .sort((first, second) => second.updatedAt - first.updatedAt),
        );
      })().catch(onError);
    },
    (error) => onError(error),
  );
  return () => { active = false; unsubscribe(); };
}

export async function saveJot(
  jot: Jot,
  encryptionKey: JotEncryptionKey,
) {
  await setDoc(
    jotDocument(jot.id),
    await encryptedJotData(jot, encryptionKey),
  );
}

export async function prepareJotSave(jot: Jot, encryptionKey: JotEncryptionKey) {
  const data = await encryptedJotData(jot, encryptionKey);
  return () => setDoc(jotDocument(jot.id), data);
}

export function permanentlyDeleteJot(jotId: string) {
  return deleteDoc(jotDocument(jotId));
}
