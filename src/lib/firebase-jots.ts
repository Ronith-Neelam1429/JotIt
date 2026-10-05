import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { getFirestoreDb } from '@/lib/firebase';

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
  title: string;
  updatedAt: number;
};

type FirestoreJot = Omit<Jot, 'id'> & {
  memberIds: string[];
  ownerId: string;
};

type JotChanges = Partial<Pick<Jot, 'documentContent' | 'entries' | 'updatedAt'>>;

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

function parseJot(id: string, value: unknown): Jot | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<FirestoreJot>;

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
    title: data.title,
    updatedAt: data.updatedAt,
  };
}

function jotDocument(jotId: string) {
  return doc(getFirestoreDb(), 'jots', jotId);
}

export function subscribeToJots(
  userId: string,
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
      const jots = snapshot.docs
        .map((jotSnapshot) => parseJot(jotSnapshot.id, jotSnapshot.data()))
        .filter((jot): jot is Jot => Boolean(jot))
        .sort((first, second) => second.updatedAt - first.updatedAt);

      onJots(jots);
    },
    (error) => onError(error),
  );
}

export function saveJot(userId: string, jot: Jot) {
  const { id, ...jotData } = jot;
  const storedJot: FirestoreJot = {
    ...jotData,
    memberIds: [userId],
    ownerId: userId,
  };

  return setDoc(jotDocument(id), storedJot);
}

export function saveJotChanges(jotId: string, changes: JotChanges) {
  return updateDoc(jotDocument(jotId), changes);
}
