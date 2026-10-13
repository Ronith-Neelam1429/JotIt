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
