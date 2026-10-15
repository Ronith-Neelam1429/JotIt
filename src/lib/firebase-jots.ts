import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} from '@react-native-firebase/firestore';

import { sharedJotKey } from '@/lib/collaboration-keys';
import { canEditJot, type Collaboration, type Activity } from '@/lib/collaboration-model';
import { mergeJotChanges, activityDescription } from '@/lib/jot-merge';
import { createId } from '@/lib/jot-model';
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
  'createdAt' | 'id' | 'memberIds' | 'ownerId' | 'trashedAt' | 'updatedAt' | 'collaboration'
>;

type EncryptedFirestoreJot = {
  createdAt: number;
  encryptedPayload: string;
  encryptionVersion: 1 | 2;
  collaboration?: Collaboration;
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
    ![1, 2].includes(data.encryptionVersion ?? 0) ||
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
    ...(data.collaboration ? { collaboration: data.collaboration, activity: Array.isArray(decrypted.activity) ? decrypted.activity.slice(-60) : [] } : {}),
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
            try {
            const data = jotSnapshot.data();
            const encryptedJot = await decryptStoredJot(
              jotSnapshot.id,
              data,
              data.encryptionVersion === 2 ? await sharedJotKey(jotSnapshot.id, userId, encryptionKey) : encryptionKey,
            );
            if (encryptedJot) return encryptedJot;

            const legacyJot = parseLegacyJot(jotSnapshot.id, data);
            if (!legacyJot) return null;

            await setDoc(
              jotDocument(legacyJot.id),
              await encryptedJotData(legacyJot, encryptionKey),
            );
            return legacyJot;
            } catch { onError(new Error('A jot could not be unlocked on this device. Ask its owner for a new invitation.')); return null; }
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
  if (jot.collaboration) throw new Error('Shared jots require a transactional save.');
  await setDoc(
    jotDocument(jot.id),
    await encryptedJotData(jot, encryptionKey),
  );
}

export async function prepareJotSave(jot: Jot, encryptionKey: JotEncryptionKey) {
  if (jot.collaboration) throw new Error('Shared jots require a transactional save.');
  const data = await encryptedJotData(jot, encryptionKey);
  return () => setDoc(jotDocument(jot.id), data);
}

export function permanentlyDeleteJot(jotId: string) {
  return deleteDoc(jotDocument(jotId));
}


/** Online transaction: retry against the latest revision, applying only this edit's delta. */
export async function saveSharedJot(base: Jot, local: Jot, userId: string, personalKey: JotEncryptionKey) {
  const key = await sharedJotKey(local.id, userId, personalKey);
  return runTransaction(getFirestoreDb(), async (transaction) => {
    const ref = jotDocument(local.id);
    const snapshot = await transaction.get(ref);
    const remote = await decryptStoredJot(local.id, snapshot.data(), key);
    if (!remote?.collaboration || !canEditJot(remote, userId)) throw new Error('Your editing access to this jot has changed.');
    const merged = mergeJotChanges(base, local, remote);
    const now = Date.now();
    const event: Activity = { id: createId(), actorId: userId, actorName: remote.collaboration.members[userId].name,
      description: activityDescription(base, local), at: now };
    const recent = merged.activity?.at(-1);
    // Coalesce consecutive typing saves by the same person into one quiet activity item.
    merged.activity = recent?.actorId === userId && recent.description === event.description && now - recent.at < 30000
      ? [...(merged.activity ?? []).slice(0, -1), { ...recent, at: now }] : [...(merged.activity ?? []), event].slice(-60);
    merged.collaboration = { ...remote.collaboration, revision: remote.collaboration.revision + 1, lastEditedBy: userId, lastEditedAt: now };
    transaction.update(ref, {
      encryptedPayload: await encryptJson({ ...contentOf(merged), versions: merged.versions, activity: merged.activity }, key),
      updatedAt: merged.updatedAt, collaboration: merged.collaboration,
      trashedAt: merged.trashedAt ? Timestamp.fromMillis(merged.trashedAt) : null,
      expiresAt: merged.trashedAt ? Timestamp.fromMillis(merged.trashedAt + TRASH_RETENTION_MS) : null,
    });
    return merged;
  });
}
