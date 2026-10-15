import type { Jot, JotContent, JotEntry } from './jot-model';

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const contentKeys: (keyof JotContent)[] = ['accent', 'documentContent', 'emoji', 'kind', 'title', 'archivedAt', 'pinned', 'tags', 'folder', 'isTemplate'];
function mergeEntries(base: JotEntry[], local: JotEntry[], remote: JotEntry[]) {
  const b = new Map(base.map((entry) => [entry.id, entry]));
  const l = new Map(local.map((entry) => [entry.id, entry]));
  const r = new Map(remote.map((entry) => [entry.id, entry]));
  const result = new Map(r);
  for (const entry of base) if (!l.has(entry.id)) result.delete(entry.id);
  for (const entry of local) {
    const original = b.get(entry.id), latest = r.get(entry.id);
    if (!original) { result.set(entry.id, entry); continue; }
    // Deletion wins over an edit; a deliberate restore uses a fresh base.
    if (!latest) continue;
    const merged = { ...latest };
    for (const field of ['text', 'completed', 'quantity', 'note'] as const) {
      if (!equal(original[field], entry[field])) Object.assign(merged, { [field]: entry[field] });
    }
    result.set(entry.id, merged);
  }
  const baseOrder = base.filter((e) => l.has(e.id)).map((e) => e.id);
  const localOrder = local.filter((e) => b.has(e.id)).map((e) => e.id);
  const order = equal(baseOrder, localOrder) ? remote : local;
  const ids = [...new Set([...order.map((e) => e.id), ...local.map((e) => e.id), ...remote.map((e) => e.id)])];
  return ids.flatMap((id) => result.has(id) ? [result.get(id)!] : []);
}
function content(jot: Jot): JotContent {
  const { accent, documentContent, emoji, entries, kind, title, archivedAt, pinned, tags, folder, isTemplate, deletedEntries } = jot;
  return { accent, documentContent, emoji, entries, kind, title, archivedAt, pinned, tags, folder, isTemplate, deletedEntries };
}
export function mergeJotChanges(base: Jot, local: Jot, remote: Jot): Jot {
  const merged = { ...remote };
  for (const field of contentKeys) {
    if (!equal(base[field], local[field])) Object.assign(merged, { [field]: local[field] });
  }
  if (base.trashedAt !== local.trashedAt) merged.trashedAt = local.trashedAt;
  merged.entries = mergeEntries(base.entries, local.entries, remote.entries);
  const restored = new Set(base.deletedEntries.filter((e) => !local.deletedEntries.some((l) => l.id === e.id)).map((e) => e.id));
  merged.deletedEntries = [...new Map([...remote.deletedEntries, ...local.deletedEntries].map((e) => [e.id, e])).values()]
    .filter((e) => !restored.has(e.id) && !merged.entries.some((live) => live.id === e.id));
  merged.versions = [...new Map([...remote.versions, ...local.versions].map((v) => [v.id, v])).values()];
  if (base.documentContent !== local.documentContent && base.documentContent !== remote.documentContent && local.documentContent !== remote.documentContent) {
    merged.versions.push({ id: `conflict-${remote.collaboration?.revision ?? remote.updatedAt}`, savedAt: remote.updatedAt,
      label: 'Concurrent edit (saved copy)', content: content(remote) });
  }
  merged.versions = merged.versions.slice(-30);
  while (merged.versions.length > 1 && new TextEncoder().encode(JSON.stringify(merged.versions)).length > 350000) merged.versions.shift();
  merged.activity = [...new Map([...(remote.activity ?? []), ...(local.activity ?? [])].map((a) => [a.id, a])).values()].sort((a, b) => a.at - b.at).slice(-60);
  merged.updatedAt = Math.max(local.updatedAt, remote.updatedAt + 1);
  return merged;
}
export function activityDescription(before: Jot, after: Jot) {
  const added = after.entries.filter((e) => !before.entries.some((b) => b.id === e.id));
  const removed = before.entries.filter((e) => !after.entries.some((a) => a.id === e.id));
  if (added.length) return added.length === 1 ? `added ${added[0].text.slice(0, 80)}` : `added ${added.length} items`;
  if (removed.length) return removed.length === 1 ? `removed ${removed[0].text.slice(0, 80)}` : `removed ${removed.length} items`;
  if (before.title !== after.title) return 'renamed the jot';
  if (before.kind !== after.kind) return 'changed the jot format';
  if (before.documentContent !== after.documentContent) return 'edited the free write';
  const toggled = after.entries.find((e) => before.entries.some((b) => b.id === e.id && b.completed !== e.completed));
  if (toggled) return `${toggled.completed ? 'completed' : 'reopened'} ${toggled.text.slice(0, 80)}`;
  if (before.trashedAt !== after.trashedAt) return after.trashedAt ? 'moved the jot to Trash' : 'restored the jot';
  if (!equal(before.entries, after.entries)) return 'updated the list';
  return 'updated the jot';
}
