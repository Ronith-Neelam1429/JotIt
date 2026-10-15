import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyContent } from '../src/lib/jot-model.ts';
import { mergeJotChanges, activityDescription } from '../src/lib/jot-merge.ts';
const entry = (id) => ({ id, text: id, completed: false, createdAt: 1 });
const base = () => ({ ...emptyContent(), entries: [entry('milk'), entry('bread')], versions: [], updatedAt: 1, trashedAt: null });
test('independent list additions and fields survive concurrent writes', () => {
  const b = base(), l = structuredClone(b), r = structuredClone(b);
  l.entries[0].text = 'Oat milk'; l.entries.push(entry('eggs'));
  r.entries[0].completed = true; r.entries.push(entry('tea'));
  const merged = mergeJotChanges(b, l, r);
  assert.deepEqual(new Set(merged.entries.map(e => e.id)), new Set(['milk', 'bread', 'eggs', 'tea']));
  assert.equal(merged.entries[0].text, 'Oat milk'); assert.equal(merged.entries[0].completed, true);
});
test('deletion wins over concurrent edits, without resurrecting entries', () => {
  const b = base(), l = structuredClone(b), r = structuredClone(b);
  l.entries[0].text = 'Edited'; r.entries.shift();
  assert.deepEqual(mergeJotChanges(b, l, r).entries.map(e => e.id), ['bread']);
  assert.deepEqual(mergeJotChanges(b, r, l).entries.map(e => e.id), ['bread']);
});
test('last committed field wins and competing writing is recoverable', () => {
  const b = base(), l = { ...b, documentContent: 'Alice' }, r = { ...b, documentContent: 'Bob', title: 'Remote title' };
  const merged = mergeJotChanges(b, l, r);
  assert.equal(merged.title, 'Remote title'); assert.equal(merged.documentContent, 'Alice');
  assert.equal(merged.versions.at(-1).content.documentContent, 'Bob');
});
test('reordering keeps a concurrently added item and activity is specific', () => {
  const b = base(), l = { ...b, entries: [...b.entries].reverse() }, r = { ...b, entries: [...b.entries, entry('tea')] };
  assert.deepEqual(mergeJotChanges(b, l, r).entries.map(e => e.id), ['bread', 'milk', 'tea']);
  assert.equal(activityDescription(b, r), 'added tea');
});
