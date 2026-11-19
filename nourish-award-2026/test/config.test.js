const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

test('constants', () => {
  const a = loadApp();
  assert.strictEqual(a.DEPARTMENTS.length, 10);
  assert.ok(a.DEPARTMENTS.includes('Kitchen The Bakery'));
  assert.ok(a.DEPARTMENTS.includes('HR & Security'));
  assert.deepStrictEqual([...a.PHASES], ['SETUP', 'HOD_OPEN', 'HOD_CLOSED', 'GM_OPEN', 'DONE']);
  assert.strictEqual(a.SB_OUTLETS.length, 3);
});
