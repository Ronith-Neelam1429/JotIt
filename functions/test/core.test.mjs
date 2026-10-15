import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, identifier, hashToken, newToken, requireOwner, requireMember, role } from '../core.js';
test('untrusted membership inputs are validated', () => {
  for (const invalid of ['../other', '', 'a/b', null]) assert.throws(() => identifier(invalid));
  assert.throws(() => role('owner'));
  assert.throws(() => requireOwner({ ownerId: 'a' }, 'b'));
  assert.throws(() => requireMember({ memberIds: ['a'] }, 'b'));
  assert.equal(cleanName(' Alex '), 'Alex');
});
test('invitation capabilities use independent 256-bit random secrets and one-way lookup', () => {
  const first = newToken(), second = newToken();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second); assert.notEqual(hashToken(first), first);
  assert.throws(() => hashToken('guess'));
});
