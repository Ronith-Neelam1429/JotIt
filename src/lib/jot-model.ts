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
