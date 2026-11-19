const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const a = require('./load').loadApp();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('pin normalise/generate', () => {
  assert.strictEqual(a.normalizePin(' 012345 '), '012345');
  assert.strictEqual(a.normalizePin('12345'), null);
  assert.strictEqual(a.normalizePin('abcdef'), null);
  assert.strictEqual(a.generatePin(() => 0), '000000');
});

test('hash/verify', () => {
  assert.notStrictEqual(a.hashPin('123456', 's1', sha), a.hashPin('123456', 's2', sha));
  const u = { salt: 's1', pinHash: a.hashPin('123456', 's1', sha) };
  assert.ok(a.verifyPin('123456', u, sha));
  assert.ok(!a.verifyPin('654321', u, sha));
});

test('lockout', () => {
  let u = { failedCount: 0, lockedUntil: 0 };
  for (let i = 0; i < 5; i++) u = a.recordFailure(u, 1000, a.DEFAULT_CONFIG);
  assert.strictEqual(u.lockedUntil, 1000 + 900000);
  assert.ok(a.checkLockout(u, 2000).locked);
  assert.ok(!a.checkLockout(u, 1000 + 900000).locked);
  assert.strictEqual(a.recordSuccess({ failedCount: 3, lockedUntil: 0 }).failedCount, 0);
});

test('sessions', () => {
  const m = {};
  const kv = { get: (k) => m[k] || null, put: (k, v) => { m[k] = v; } };
  const s = a.createSessionStore(kv, Math.random, 21600000);
  const t = s.create('u1', 0);
  assert.strictEqual(s.resolve(t, 21599999), 'u1');
  assert.strictEqual(s.resolve(t, 21600000), null);
  assert.strictEqual(s.resolve('nope', 0), null);
});
