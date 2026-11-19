const test = require('node:test');
const assert = require('node:assert');
const { makeWorld } = require('./fixtures');

test('unknown and prototype method names are rejected', () => {
  const w = makeWorld();
  for (const m of ['constructor', '__proto__', 'toString', 'hasOwnProperty', '_internals', 'nope', '']) {
    assert.strictEqual(w.app.dispatch(w.service, m, null, []).error, 'UNKNOWN_METHOD', m);
  }
});

test('getI18n, public login and token-first methods', () => {
  const w = makeWorld();
  assert.ok(w.app.dispatch(w.service, 'getI18n', null).i18n.en['app.title']);
  const names = w.app.dispatch(w.service, 'listLoginNames', null, []);
  assert.ok(names.ok && names.names.length === 11);
  const l = w.app.dispatch(w.service, 'login', null, ['hod2', w.pins.hod2]);
  assert.ok(l.ok && l.token);
  assert.strictEqual(w.app.dispatch(w.service, 'getHodBallot', l.token, []).boh.length, 10);
  assert.strictEqual(w.app.dispatch(w.service, 'getHodBallot', null, []).error, 'NOT_LOGGED_IN');
});

test('a throwing service method gives SERVER_ERROR with no stack', () => {
  const w = makeWorld();
  const boom = { getHodBallot() { throw new Error('secret stack detail'); } };
  const quiet = w.app.dispatch(Object.assign({}, boom), 'getHodBallot', 't', []);
  assert.deepStrictEqual(Object.keys(quiet).sort(), ['error', 'ok']);
  assert.strictEqual(quiet.error, 'SERVER_ERROR');
  assert.ok(!JSON.stringify(quiet).includes('secret'));
});
