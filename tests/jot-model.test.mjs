import test from 'node:test';
import assert from 'node:assert/strict';
import { parseContent, parseVersions, normalizeTags } from '../src/lib/jot-model.ts';

test('older jots gain safe defaults without losing their content', () => {
  const jot = parseContent({ title: 'Old jot', kind: 'document', documentContent: 'Keep me' });
  assert.equal(jot.documentContent, 'Keep me');
  assert.equal(jot.archivedAt, null);
  assert.deepEqual(jot.tags, []);
  assert.deepEqual(jot.deletedEntries, []);
});
test('rejects corrupt versions and normalizes organization labels', () => {
  assert.deepEqual(parseVersions([null, { id: 'bad', savedAt: 1 }]), []);
  assert.deepEqual(normalizeTags([' #Home ', 'HOME', '', 'shopping']), ['home', 'shopping']);
});

test('bulk deletion and individual restoration preserve item details and position', async () => {
  const { emptyContent, deleteEntries, restoreEntry } = await import('../src/lib/jot-model.ts');
  const entries = ['a', 'b', 'c'].map((id) => ({ id, text: id, completed: id !== 'b', createdAt: 1, quantity: '2 kg', note: 'ripe' }));
  const jot = { ...emptyContent(), entries };
  const cleared = deleteEntries(jot, ['a', 'c'], 123);
  assert.deepEqual(cleared.entries.map((e) => e.id), ['b']);
  assert.equal(cleared.deletedEntries.length, 2);
  const restored = restoreEntry(restoreEntry(cleared, 'a'), 'c');
  assert.deepEqual(restored.entries, entries);
  assert.equal(restored.deletedEntries.length, 0);
  assert.deepEqual(restoreEntry(restored, 'a'), restored);
});

test('sorting keeps pins first and respects each date and title mode', async () => {
  const { sortJots } = await import('../src/lib/jot-model.ts');
  const jots = [{ id: 'a', title: 'Z', createdAt: 1, updatedAt: 3, pinned: false },
    { id: 'b', title: 'A', createdAt: 2, updatedAt: 1, pinned: false },
    { id: 'c', title: 'Pinned', createdAt: 0, updatedAt: 0, pinned: true }];
  assert.deepEqual(sortJots(jots, 'updated').map((j) => j.id), ['c', 'a', 'b']);
  assert.deepEqual(sortJots(jots, 'created').map((j) => j.id), ['c', 'b', 'a']);
  assert.deepEqual(sortJots(jots, 'title').map((j) => j.id), ['c', 'b', 'a']);
  assert.equal(jots[0].id, 'a');
});

test('search finds accent-insensitive words across content, notes, quantities and labels', async () => {
  const { emptyContent, matchesSearch } = await import('../src/lib/jot-model.ts');
  const jot = { ...emptyContent(), title: 'Café', folder: 'Trips', tags: ['weekend'], entries: [
    { id: 'a', text: 'Milk', note: 'Oat', quantity: '2 litres', completed: false, createdAt: 1 }], deletedEntries: [{ text: 'secret' }] };
  assert.equal(matchesSearch(jot, 'cafe oat'), true);
  assert.equal(matchesSearch(jot, '2 weekend trips'), true);
  assert.equal(matchesSearch(jot, 'secret'), false);
});

test('undo groups typing, supports redo and clears redo when a new branch is edited', async () => {
  const { emptyContent, recordUndo, stepUndo } = await import('../src/lib/jot-model.ts');
  const a = { ...emptyContent(), documentContent: '' };
  const b = { ...a, documentContent: 'hello' };
  let state = recordUndo(undefined, a, true, 10000);
  state = recordUndo(state, b, true, 10100);
  assert.equal(state.past.length, 1);
  const undone = stepUndo(state, b, 'undo');
  assert.equal(undone.content.documentContent, '');
  assert.equal(stepUndo(undone.state, a, 'redo').content.documentContent, 'hello');
  assert.equal(recordUndo(undone.state, a, false, 12000).future.length, 0);
});

test('version checkpoints preserve the prior state and bound encrypted history size', async () => {
  const { emptyContent, checkpoint } = await import('../src/lib/jot-model.ts');
  let jot = { ...emptyContent('document'), versions: [], documentContent: 'start' };
  const original = jot;
  for (let i = 0; i < 60; i++) {
    const next = { ...jot, documentContent: `${i}:` + 'word '.repeat(6000) };
    next.versions = checkpoint(jot, next, false, 10000 + i);
    jot = next;
  }
  assert.ok(jot.versions.length <= 30);
  assert.ok(new TextEncoder().encode(JSON.stringify(jot.versions)).length <= 350000);
  assert.equal(original.documentContent, 'start');
  assert.ok(jot.versions.at(-1).content.documentContent.startsWith('58:'));
});
