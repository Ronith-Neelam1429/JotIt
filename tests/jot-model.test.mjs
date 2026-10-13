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
