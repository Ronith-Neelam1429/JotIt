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
