import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditJot, memberRole, displayName, validInvitationParts, invitationLink } from '../src/lib/collaboration-model.ts';

test('only an owner or an assigned editor can edit', () => {
  const jot = { ownerId: 'owner', collaboration: { members: { editor: { role: 'editor' }, viewer: { role: 'viewer' } } } };
  assert.equal(canEditJot(jot, 'owner'), true);
  assert.equal(canEditJot(jot, 'editor'), true);
  for (const id of ['viewer', 'stranger', undefined]) assert.equal(canEditJot(jot, id), false);
  assert.equal(memberRole({ ownerId: 'owner' }, 'owner'), 'owner');
});
test('names and invitation capabilities have bounded, predictable formats', () => {
  assert.equal(displayName('  Alex\n '), 'Alex');
  assert.equal(displayName(' '), 'Member');
  assert.equal(displayName('a'.repeat(100)).length, 40);
  const token = 'f'.repeat(64), key = 'A'.repeat(43) + '=';
  assert.equal(validInvitationParts('jot-1', token, key), true);
  assert.equal(validInvitationParts('../other', token, key), false);
  assert.equal(validInvitationParts('jot-1', 'guess', key), false);
  assert.ok(invitationLink('jot-1', token, key).endsWith('%3D'));
});
