import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchJotSave } from '../src/lib/jot-save-queue.ts';

test('offline acknowledgements do not block subsequent local writes', async () => {
  const dispatched = [];
  const acknowledged = [];
  let reconnect;
  const offline = new Promise((resolve) => { reconnect = resolve; });
  const first = dispatchJotSave(Promise.resolve(), async () => () => { dispatched.push(1); return offline; }, () => acknowledged.push(1), assert.fail);
  const second = dispatchJotSave(first, async () => () => { dispatched.push(2); return offline; }, () => acknowledged.push(2), assert.fail);
  await second;
  assert.deepEqual(dispatched, [1, 2]);
  assert.deepEqual(acknowledged, []);
  reconnect();
  await offline;
  assert.deepEqual(acknowledged, [1, 2]);
});
test('a preparation failure does not poison later edits', async () => {
  const first = dispatchJotSave(Promise.resolve(), async () => { throw new Error('encryption failed'); }, () => {}, () => {});
  let dispatched = false;
  await dispatchJotSave(first, async () => () => { dispatched = true; return Promise.resolve(); }, () => {}, assert.fail);
  assert.equal(dispatched, true);
});
