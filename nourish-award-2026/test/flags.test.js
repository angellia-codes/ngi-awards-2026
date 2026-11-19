const test = require('node:test');
const assert = require('node:assert');
const a = require('./load').loadApp();
const f = (lateness, unpaidLeave, resigned, cfg) =>
  a.computeFlag({ lateness, unpaidLeave, resigned: !!resigned }, cfg || a.DEFAULT_CONFIG);

test('flags', () => {
  let r = f(4, 3);
  assert.deepStrictEqual([r.color, r.canVote, r.reasonKey], ['red', false, 'flag.red.lateness']);
  r = f(2, 4);
  assert.deepStrictEqual([r.color, r.canVote, r.reasonKey], ['red', false, 'flag.red.unpaid']);
  r = f(3, 0);
  assert.deepStrictEqual([r.color, r.canVote], ['yellow', true]);
  assert.strictEqual(f(1, 0).color, 'yellow');
  assert.strictEqual(f(0, 1).color, 'yellow');
  assert.strictEqual(f(0, 0).color, 'green');
  r = f(0, 0, true);
  assert.deepStrictEqual([r.color, r.canVote, r.reasonKey], ['grey', false, 'flag.resigned']);
  r = f(null, null, false);
  assert.deepStrictEqual([r.color, r.canVote, r.reasonKey], ['grey', true, 'flag.nodata']);
  assert.strictEqual(f(4, 0, false, Object.assign({}, a.DEFAULT_CONFIG, { redLatenessAbove: 5 })).color, 'yellow');
});
