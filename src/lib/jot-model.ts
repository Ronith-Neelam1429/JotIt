export type JotKind = 'document' | 'list';
export type JotEntry = {
  completed: boolean;
  createdAt: number;
  id: string;
  text: string;
  quantity?: string;
  note?: string;
};
export type DeletedEntry = JotEntry & { deletedAt: number; position: number };
export type JotContent = {
  accent: string;
  documentContent: string;
  emoji: string;
  entries: JotEntry[];
  kind: JotKind;
  title: string;
  archivedAt: number | null;
  pinned: boolean;
  tags: string[];
  folder: string;
  isTemplate: boolean;
  deletedEntries: DeletedEntry[];
};
export type JotVersion = { id: string; savedAt: number; label: string; content: JotContent };
export type Jot = JotContent & {
  id: string;
  createdAt: number;
  updatedAt: number;
  trashedAt: number | null;
  memberIds: string[];
  ownerId: string;
  versions: JotVersion[];
};

export const ACCENTS = [
  { name: 'Sky', color: '#B9CBE8' }, { name: 'Sage', color: '#B7D7CF' },
  { name: 'Lilac', color: '#D8C7E8' }, { name: 'Honey', color: '#F3C969' },
  { name: 'Rose', color: '#E9B8B4' }, { name: 'Peach', color: '#F2CFB0' },
];
export const JOT_ICONS = ['☷', 'Aa', '🛒', '🏠', '💡', '✈️', '📚', '🌱', '💼', '🎯', '🍳', '🎁', '❤️', '⭐', '🎵', '🐾'];
export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function emptyContent(kind: JotKind = 'list'): JotContent {
  return {
    accent: ACCENTS[0].color, documentContent: '', emoji: kind === 'list' ? '☷' : 'Aa',
    entries: [], kind, title: 'Untitled', archivedAt: null, pinned: false,
    tags: [], folder: '', isTemplate: false, deletedEntries: [],
  };
}
export function contentOf(jot: JotContent): JotContent {
  const { accent, documentContent, emoji, entries, kind, title, archivedAt, pinned, tags, folder, isTemplate, deletedEntries } = jot;
  return { accent, documentContent, emoji, entries, kind, title, archivedAt, pinned, tags, folder, isTemplate, deletedEntries };
}
export function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().replace(/^#+/, '').toLocaleLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 12);
}
export function parseEntries(value: unknown): JotEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.text === 'string'
    && typeof entry.completed === 'boolean' && Number.isFinite(entry.createdAt))
    .map((entry) => ({ id: entry.id, text: entry.text, completed: entry.completed, createdAt: entry.createdAt,
      ...(typeof entry.quantity === 'string' ? { quantity: entry.quantity } : {}),
      ...(typeof entry.note === 'string' ? { note: entry.note } : {}) }));
}
export function parseContent(value: unknown): JotContent | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<JotContent>;
  if (typeof data.title !== 'string' || (data.kind !== 'list' && data.kind !== 'document')) return null;
  return {
    ...emptyContent(data.kind), title: data.title,
    accent: typeof data.accent === 'string' && /^#[\da-f]{6}$/i.test(data.accent) ? data.accent : ACCENTS[0].color,
    emoji: typeof data.emoji === 'string' ? data.emoji : emptyContent(data.kind).emoji,
    documentContent: typeof data.documentContent === 'string' ? data.documentContent : '',
    entries: parseEntries(data.entries),
    archivedAt: typeof data.archivedAt === 'number' ? data.archivedAt : null,
    pinned: data.pinned === true, isTemplate: data.isTemplate === true,
    tags: normalizeTags(Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : []),
    folder: typeof data.folder === 'string' ? data.folder.slice(0, 50) : '',
    deletedEntries: Array.isArray(data.deletedEntries) ? data.deletedEntries.flatMap((entry) => {
      const parsed = parseEntries([entry])[0];
      return parsed && Number.isFinite(entry.deletedAt) && Number.isFinite(entry.position)
        ? [{ ...parsed, deletedAt: entry.deletedAt, position: Math.max(0, entry.position) }] : [];
    }) : [],
  };
}
export function parseVersions(value: unknown): JotVersion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((version) => {
    if (!version || typeof version.id !== 'string' || !Number.isFinite(version.savedAt)) return [];
    const content = parseContent(version.content);
    return content ? [{ id: version.id, savedAt: version.savedAt, label: typeof version.label === 'string' ? version.label : 'Edited jot', content }] : [];
  }).slice(-30);
}

export function deleteEntries(jot: Jot, ids: string[], now = Date.now()): Jot {
  const removed = new Set(ids);
  return { ...jot, entries: jot.entries.filter((entry) => !removed.has(entry.id)),
    deletedEntries: [...jot.deletedEntries, ...jot.entries.flatMap((entry, position) =>
      removed.has(entry.id) ? [{ ...entry, position, deletedAt: now }] : [])] };
}
export function restoreEntry(jot: Jot, id: string): Jot {
  const entry = jot.deletedEntries.find((item) => item.id === id);
  if (!entry) return jot;
  const { deletedAt: _deletedAt, position, ...restored } = entry;
  const entries = [...jot.entries];
  if (!entries.some((item) => item.id === id)) entries.splice(Math.min(position, entries.length), 0, restored);
  return { ...jot, entries, deletedEntries: jot.deletedEntries.filter((item) => item.id !== id) };
}

export type JotSort = 'updated' | 'created' | 'title';
export function sortJots(jots: Jot[], sort: JotSort): Jot[] {
  return [...jots].sort((a, b) => Number(b.pinned) - Number(a.pinned)
    || (sort === 'title' ? a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
      : sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt)
    || a.id.localeCompare(b.id));
}
export function relativeDate(timestamp: number, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function searchText(jot: Jot) {
  return [jot.title, jot.folder, ...jot.tags, jot.documentContent,
    ...jot.entries.flatMap((entry) => [entry.text, entry.quantity ?? '', entry.note ?? ''])].join('\n');
}
function fold(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(); }
export function matchesSearch(jot: Jot, query: string) {
  const haystack = fold(searchText(jot));
  return fold(query).trim().split(/\s+/).every((term) => haystack.includes(term));
}
export function searchPreview(jot: Jot, query: string) {
  const text = searchText(jot).replace(/\s+/g, ' ');
  const term = fold(query).trim().split(/\s+/)[0];
  const index = term ? fold(text).indexOf(term) : 0;
  const start = Math.max(0, index - 24);
  return `${start ? '…' : ''}${text.slice(start, start + 140)}${start + 140 < text.length ? '…' : ''}`;
}

export type UndoState = { past: JotContent[]; future: JotContent[]; lastEdit: number; groupStarted: number };
export function recordUndo(state: UndoState | undefined, previous: JotContent, typing: boolean, now: number): UndoState {
  const current = state ?? { past: [], future: [], lastEdit: 0, groupStarted: 0 };
  const grouped = typing && current.lastEdit > 0 && now - current.lastEdit < 1200 && now - current.groupStarted < 5000;
  let past = grouped ? current.past : [...current.past, contentOf(previous)].slice(-40);
  while (past.length > 1 && new TextEncoder().encode(JSON.stringify(past)).length > 750000) past = past.slice(1);
  return { past, future: [], lastEdit: typing ? now : 0, groupStarted: grouped ? current.groupStarted : now };
}
export function stepUndo(state: UndoState, current: JotContent, direction: 'undo' | 'redo') {
  const source = direction === 'undo' ? state.past : state.future;
  const content = source.at(-1);
  if (!content) return null;
  return { content, state: direction === 'undo'
    ? { past: state.past.slice(0, -1), future: [...state.future, contentOf(current)], lastEdit: 0, groupStarted: 0 }
    : { past: [...state.past, contentOf(current)], future: state.future.slice(0, -1), lastEdit: 0, groupStarted: 0 } };
}
