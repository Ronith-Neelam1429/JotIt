import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';

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

type JotsContextValue = {
  addEntry: (jotId: string, text: string) => void;
  createJot: (title: string, kind: JotKind) => Jot;
  jots: Jot[];
  toggleEntry: (jotId: string, entryId: string) => void;
  updateDocument: (jotId: string, content: string) => void;
};

const JotsContext = createContext<JotsContextValue | null>(null);
const ACCENT_COLORS = ['#B9CBE8', '#B7D7CF', '#D8C7E8', '#F3C969', '#E9B8B4'];

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function JotsProvider({ children }: PropsWithChildren) {
  const [jots, setJots] = useState<Jot[]>([]);

  function createJot(title: string, kind: JotKind) {
    const now = Date.now();
    const jot: Jot = {
      accent: ACCENT_COLORS[jots.length % ACCENT_COLORS.length],
      createdAt: now,
      documentContent: '',
      emoji: kind === 'list' ? '☷' : 'Aa',
      entries: [],
      id: createId(),
      kind,
      title: title.trim(),
      updatedAt: now,
    };

    setJots((currentJots) => [jot, ...currentJots]);
    return jot;
  }

  function addEntry(jotId: string, text: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const now = Date.now();
    setJots((currentJots) =>
      currentJots.map((jot) =>
        jot.id === jotId
          ? {
              ...jot,
              entries: [
                ...jot.entries,
                { completed: false, createdAt: now, id: createId(), text: trimmedText },
              ],
              updatedAt: now,
            }
          : jot,
      ),
    );
  }

  function toggleEntry(jotId: string, entryId: string) {
    setJots((currentJots) =>
      currentJots.map((jot) =>
        jot.id === jotId
          ? {
              ...jot,
              entries: jot.entries.map((entry) =>
                entry.id === entryId ? { ...entry, completed: !entry.completed } : entry,
              ),
              updatedAt: Date.now(),
            }
          : jot,
      ),
    );
  }

  function updateDocument(jotId: string, content: string) {
    setJots((currentJots) =>
      currentJots.map((jot) =>
        jot.id === jotId ? { ...jot, documentContent: content, updatedAt: Date.now() } : jot,
      ),
    );
  }

  return (
    <JotsContext.Provider
      value={{ addEntry, createJot, jots, toggleEntry, updateDocument }}>
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
