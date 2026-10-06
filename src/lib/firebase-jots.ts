import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { getFirestoreDb } from '@/lib/firebase';
import {
  decryptJson,
  encryptJson,
  type JotEncryptionKey,
} from '@/lib/jot-encryption';

export type JotEntry = {
  completed: boolean;
  createdAt: number;
  id: string;
  text: string;
};

export type JotKind = 'document' | 'list';

export type Jot = {
  accent: string;
  createdAt: number;
  documentContent: string;
  emoji: string;
  entries: JotEntry[];
  id: string;
  kind: JotKind;
  memberIds: string[];
  ownerId: string;
  title: string;
  trashedAt: number | null;
  updatedAt: number;
};

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

function isJotKind(value: unknown): value is JotKind {
  return value === 'document' || value === 'list';
}

function parseEntries(value: unknown): JotEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is JotEntry => {
    if (!entry || typeof entry !== 'object') return false;
    const candidate = entry as Partial<JotEntry>;
    return (
      typeof candidate.completed === 'boolean' &&
      typeof candidate.createdAt === 'number' &&
      typeof candidate.id === 'string' &&
      typeof candidate.text === 'string'
    );
  });
}

function parseContent(value: unknown): EncryptedJotContent | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<EncryptedJotContent>;

  if (
    typeof data.accent !== 'string' ||
    typeof data.documentContent !== 'string' ||
    typeof data.emoji !== 'string' ||
    !isJotKind(data.kind) ||
    typeof data.title !== 'string'
  ) {
    return null;
  }

  return {
    accent: data.accent,
    documentContent: data.documentContent,
    emoji: data.emoji,
    entries: parseEntries(data.entries),
    kind: data.kind,
    title: data.title,
  };
}

function parseLegacyJot(id: string, value: unknown): Jot | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<LegacyFirestoreJot>;

  if (
    typeof data.accent !== 'string' ||
    typeof data.createdAt !== 'number' ||
    !isJotKind(data.kind) ||
    typeof data.title !== 'string' ||
    typeof data.updatedAt !== 'number'
  ) {
    return null;
  }

  return {
    accent: data.accent,
    createdAt: data.createdAt,
    documentContent: typeof data.documentContent === 'string' ? data.documentContent : '',
    emoji: typeof data.emoji === 'string' ? data.emoji : data.kind === 'list' ? '☷' : 'Aa',
    entries: parseEntries(data.entries),
    id,
    kind: data.kind,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    title: data.title,
    trashedAt: null,
    updatedAt: data.updatedAt,
  };
}

function jotDocument(jotId: string) {
  return doc(getFirestoreDb(), 'jots', jotId);
}

async function encryptedJotData(
  jot: Jot,
  encryptionKey: JotEncryptionKey,
): Promise<EncryptedFirestoreJot> {
  const content: EncryptedJotContent = {
    accent: jot.accent,
    documentContent: jot.documentContent,
    emoji: jot.emoji,
    entries: jot.entries,
    kind: jot.kind,
    title: jot.title,
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

  const content = parseContent(
    await decryptJson<EncryptedJotContent>(data.encryptedPayload, encryptionKey),
  );
  if (!content) return null;

  return {
    ...content,
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

  return onSnapshot(
    jotsQuery,
    (snapshot) => {
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

        onJots(
          jots
            .filter((jot): jot is Jot => Boolean(jot))
            .sort((first, second) => second.updatedAt - first.updatedAt),
        );
      })().catch(onError);
    },
    (error) => onError(error),
  );
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

export async function saveJotChanges(jot: Jot, encryptionKey: JotEncryptionKey) {
  const content: EncryptedJotContent = {
    accent: jot.accent,
    documentContent: jot.documentContent,
    emoji: jot.emoji,
    entries: jot.entries,
    kind: jot.kind,
    title: jot.title,
  };

  await updateDoc(jotDocument(jot.id), {
    encryptedPayload: await encryptJson(content, encryptionKey),
    encryptionVersion: 1,
    updatedAt: jot.updatedAt,
  });
}

export async function moveJotsToTrash(jotIds: string[], trashedAt: number) {
  await Promise.all(
    jotIds.map((jotId) =>
      updateDoc(jotDocument(jotId), {
        expiresAt: Timestamp.fromMillis(trashedAt + TRASH_RETENTION_MS),
        trashedAt: Timestamp.fromMillis(trashedAt),
        updatedAt: trashedAt,
      }),
    ),
  );
}

export function restoreJotFromTrash(jotId: string) {
  return updateDoc(jotDocument(jotId), {
    expiresAt: null,
    trashedAt: null,
    updatedAt: Date.now(),
  });
}

export function permanentlyDeleteJot(jotId: string) {
  return deleteDoc(jotDocument(jotId));
}
