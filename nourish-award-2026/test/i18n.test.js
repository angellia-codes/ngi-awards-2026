const test = require('node:test');
const assert = require('node:assert');
const a = require('./load').loadApp();

test('en and id have the same keys, none blank', () => {
  const en = Object.keys(a.I18N.en).sort();
  const id = Object.keys(a.I18N.id).sort();
  assert.deepStrictEqual(en, id);
  for (const k of en) {
    assert.ok(a.I18N.en[k].trim(), 'en blank: ' + k);
    assert.ok(a.I18N.id[k].trim(), 'id blank: ' + k);
  }
});

test('placeholders match between languages', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const k of Object.keys(a.I18N.en)) assert.strictEqual(ph(a.I18N.en[k]), ph(a.I18N.id[k]), k);
});

test('every error code, reason key, phase, role and award has text', () => {
  for (const c of a.ERROR_CODES) assert.ok(a.I18N.en['error.' + c], 'error.' + c);
  for (const k of a.REASON_KEYS) assert.ok(a.I18N.en[k], k);
  for (const p of a.PHASES) assert.ok(a.I18N.en['phase.' + p], p);
  for (const r of ['HR_ADMIN', 'HOD', 'GM']) assert.ok(a.I18N.en['role.' + r], r);
  for (const w of [...a.AWARD_IDS, 'MVP']) {
    assert.ok(a.I18N.en['award.' + w + '.name'], w);
    assert.ok(a.I18N.en['award.' + w + '.desc'], w);
  }
});
