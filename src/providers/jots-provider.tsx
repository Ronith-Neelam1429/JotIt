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
  saveJot,
  saveJotChanges,
  subscribeToJots,
} from '@/lib/firebase-jots';
import { useAuth } from '@/providers/auth-provider';

export type { Jot, JotEntry, JotKind } from '@/lib/firebase-jots';

type JotsContextValue = {
  addEntry: (jotId: string, text: string) => void;
  createJot: (title: string, kind: JotKind) => Jot;
  isLoading: boolean;
  jots: Jot[];
  syncError: string | null;
  toggleEntry: (jotId: string, entryId: string) => void;
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

    return subscribeToJots(
      user.uid,
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
    if (!user) {
      throw new Error('A signed-in user is required to create a jot.');
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
      title: title.trim(),
      updatedAt: now,
    };

    replaceJots([jot, ...jotsRef.current]);
    void saveJot(user.uid, jot).catch(reportSyncError);
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
      void saveJotChanges(jotId, {
        entries: updatedJot.entries,
        updatedAt: updatedJot.updatedAt,
      }).catch(reportSyncError);
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
      void saveJotChanges(jotId, {
        entries: updatedJot.entries,
        updatedAt: updatedJot.updatedAt,
      }).catch(reportSyncError);
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
      void saveJotChanges(jotId, {
        documentContent: updatedJot.documentContent,
        updatedAt: updatedJot.updatedAt,
      }).catch(reportSyncError);
    }, 400);

    documentSaveTimers.current.set(jotId, timer);
  }

  return (
    <JotsContext.Provider
      value={{
        addEntry,
        createJot,
        isLoading,
        jots,
        syncError,
        toggleEntry,
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
