const test = require('node:test');
const assert = require('node:assert');
const a = require('./load').loadApp();
const fin = (votes) => a.computeFinalists(votes.map((v, i) => ({ nomineeId: 'n' + i, votes: v })));

test('finalists', () => {
  let r = fin([5, 4, 3, 3, 1]);
  assert.deepStrictEqual([...r].map((x) => x.rank), [1, 2, 3, 3]);
  assert.strictEqual(fin([4, 3, 1, 1]).length, 4);
  assert.strictEqual(fin([4, 3, 0, 0]).length, 2);
  assert.strictEqual(fin([0, 0, 0]).length, 0);
  assert.strictEqual(fin(Array(10).fill(2)).length, 10);
  assert.ok(fin([3, 0, 0, 0]).every((x) => x.votes >= 1));
});
