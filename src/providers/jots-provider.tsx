import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type Jot,
  type JotKind,
  moveJotsToTrash,
  permanentlyDeleteJot,
  restoreJotFromTrash,
  saveJot,
  saveJotChanges,
  subscribeToJots,
} from '@/lib/firebase-jots';
import {
  getOrCreateJotEncryptionKey,
  type JotEncryptionKey,
} from '@/lib/jot-encryption';
import { useAuth } from '@/providers/auth-provider';

export type { Jot, JotEntry, JotKind } from '@/lib/firebase-jots';

type JotsContextValue = {
  addEntry: (jotId: string, text: string) => void;
  createJot: (title: string, kind: JotKind) => Jot;
  deleteJotPermanently: (jotId: string) => Promise<void>;
  isLoading: boolean;
  jots: Jot[];
  renameJot: (jotId: string, title: string) => Promise<void>;
  restoreJot: (jotId: string) => Promise<void>;
  syncError: string | null;
  toggleEntry: (jotId: string, entryId: string) => void;
  trashJots: (jotIds: string[]) => Promise<void>;
  trashedJots: Jot[];
  updateDocument: (jotId: string, content: string) => void;
};

const JotsContext = createContext<JotsContextValue | null>(null);
const ACCENT_COLORS = ['#B9CBE8', '#B7D7CF', '#D8C7E8', '#F3C969', '#E9B8B4'];

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function JotsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [jots, setJots] = useState<Jot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const jotsRef = useRef<Jot[]>([]);
  const encryptionKeyRef = useRef<JotEncryptionKey | null>(null);
  const documentSaveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  function replaceJots(nextJots: Jot[]) {
    jotsRef.current = nextJots;
    setJots(nextJots);
  }

  function reportSyncError(error: unknown) {
    console.error('Jot sync failed:', error);
    setSyncError('Your changes could not be synced. Check your connection and try again.');
  }

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    void getOrCreateJotEncryptionKey(user.uid)
      .then((encryptionKey) => {
        if (isCancelled) return;
        encryptionKeyRef.current = encryptionKey;
        unsubscribe = subscribeToJots(
          user.uid,
          encryptionKey,
          (nextJots) => {
            replaceJots(nextJots);
            setIsLoading(false);
            setSyncError(null);
          },
          (error) => {
            reportSyncError(error);
            setIsLoading(false);
          },
        );
      })
      .catch((error) => {
        reportSyncError(error);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      unsubscribe?.();
      encryptionKeyRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    const timers = documentSaveTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  function updateLocalJot(jotId: string, update: (jot: Jot) => Jot) {
    const currentJot = jotsRef.current.find((jot) => jot.id === jotId);
    if (!currentJot) return null;

    const updatedJot = update(currentJot);
    replaceJots(
      jotsRef.current
        .map((jot) => (jot.id === jotId ? updatedJot : jot))
        .sort((first, second) => second.updatedAt - first.updatedAt),
    );
    return updatedJot;
  }

  function createJot(title: string, kind: JotKind) {
    const encryptionKey = encryptionKeyRef.current;
    if (!user || !encryptionKey) {
      throw new Error('Jot encryption is not ready yet.');
    }

    const now = Date.now();
    const jot: Jot = {
      accent: ACCENT_COLORS[jotsRef.current.length % ACCENT_COLORS.length],
      createdAt: now,
      documentContent: '',
      emoji: kind === 'list' ? '☷' : 'Aa',
      entries: [],
      id: createId(),
      kind,
      memberIds: [user.uid],
      ownerId: user.uid,
      title: title.trim(),
      trashedAt: null,
      updatedAt: now,
    };

    replaceJots([jot, ...jotsRef.current]);
    void saveJot(jot, encryptionKey).catch(reportSyncError);
    return jot;
  }

  function addEntry(jotId: string, text: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const now = Date.now();
    const updatedJot = updateLocalJot(jotId, (jot) => ({
      ...jot,
      entries: [
        ...jot.entries,
        { completed: false, createdAt: now, id: createId(), text: trimmedText },
      ],
      updatedAt: now,
    }));

    if (updatedJot) {
      const encryptionKey = encryptionKeyRef.current;
      if (!encryptionKey) return;
      void saveJotChanges(updatedJot, encryptionKey).catch(reportSyncError);
    }
  }

  function toggleEntry(jotId: string, entryId: string) {
    const updatedJot = updateLocalJot(jotId, (jot) => ({
      ...jot,
      entries: jot.entries.map((entry) =>
        entry.id === entryId ? { ...entry, completed: !entry.completed } : entry,
      ),
      updatedAt: Date.now(),
    }));

    if (updatedJot) {
      const encryptionKey = encryptionKeyRef.current;
      if (!encryptionKey) return;
      void saveJotChanges(updatedJot, encryptionKey).catch(reportSyncError);
    }
  }

  function updateDocument(jotId: string, content: string) {
    const updatedJot = updateLocalJot(jotId, (jot) => ({
      ...jot,
      documentContent: content,
      updatedAt: Date.now(),
    }));

    if (!updatedJot) return;

    const existingTimer = documentSaveTimers.current.get(jotId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      documentSaveTimers.current.delete(jotId);
      const encryptionKey = encryptionKeyRef.current;
      const latestJot = jotsRef.current.find((jot) => jot.id === jotId);
      if (!encryptionKey || !latestJot) return;
      void saveJotChanges(latestJot, encryptionKey).catch(reportSyncError);
    }, 400);

    documentSaveTimers.current.set(jotId, timer);
  }

  async function renameJot(jotId: string, title: string) {
    const trimmedTitle = title.trim().slice(0, 100);
    if (!trimmedTitle) throw new Error('A jot needs a name.');

    const previousJots = jotsRef.current;
    const currentJot = previousJots.find((jot) => jot.id === jotId);
    if (!currentJot || currentJot.title === trimmedTitle) return;

    const updatedJot = updateLocalJot(jotId, (jot) => ({
      ...jot,
      title: trimmedTitle,
      updatedAt: Date.now(),
    }));
    const encryptionKey = encryptionKeyRef.current;

    if (!updatedJot || !encryptionKey) {
      replaceJots(previousJots);
      throw new Error('Jot encryption is not ready yet.');
    }

    try {
      await saveJotChanges(updatedJot, encryptionKey);
    } catch (error) {
      replaceJots(previousJots);
      reportSyncError(error);
      throw error;
    }
  }

  async function trashJots(jotIds: string[]) {
    if (!jotIds.length) return;

    const previousJots = jotsRef.current;
    const trashedAt = Date.now();
    const trashedIds = new Set(jotIds);
    replaceJots(
      jotsRef.current.map((jot) =>
        trashedIds.has(jot.id) ? { ...jot, trashedAt, updatedAt: trashedAt } : jot,
      ),
    );

    try {
      await moveJotsToTrash(jotIds, trashedAt);
    } catch (error) {
      replaceJots(previousJots);
      reportSyncError(error);
      throw error;
    }
  }

  async function restoreJot(jotId: string) {
    const previousJots = jotsRef.current;
    const restoredAt = Date.now();
    updateLocalJot(jotId, (jot) => ({ ...jot, trashedAt: null, updatedAt: restoredAt }));

    try {
      await restoreJotFromTrash(jotId);
    } catch (error) {
      replaceJots(previousJots);
      reportSyncError(error);
      throw error;
    }
  }

  async function deleteJotPermanently(jotId: string) {
    const previousJots = jotsRef.current;
    replaceJots(jotsRef.current.filter((jot) => jot.id !== jotId));

    try {
      await permanentlyDeleteJot(jotId);
    } catch (error) {
      replaceJots(previousJots);
      reportSyncError(error);
      throw error;
    }
  }

  const activeJots = jots.filter((jot) => jot.trashedAt === null);
  const trashedJots = jots.filter((jot) => jot.trashedAt !== null);

  return (
    <JotsContext.Provider
      value={{
        addEntry,
        createJot,
        deleteJotPermanently,
        isLoading,
        jots: activeJots,
        renameJot,
        restoreJot,
        syncError,
        toggleEntry,
        trashJots,
        trashedJots,
        updateDocument,
      }}>
      {children}
    </JotsContext.Provider>
  );
}

export function useJots() {
  const context = useContext(JotsContext);

  if (!context) {
    throw new Error('useJots must be used inside JotsProvider.');
  }

  return context;
}
