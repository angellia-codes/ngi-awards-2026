const test = require('node:test');
const assert = require('node:assert');
const { makeWorld } = require('./fixtures');
const rows = require('./fixtures/detail-rows');

const app = makeWorld({ empty: true }).app;

test('parse: 10 BOH + 9 FOH, mapping, numbers', () => {
  const { nominees, warnings } = app.parseDetailRows(rows);
  assert.strictEqual(nominees.filter((n) => n.awardId === 'BOH').length, 10);
  assert.strictEqual(nominees.filter((n) => n.awardId === 'FOH').length, 9);
  assert.strictEqual(warnings.length, 0);
  const cook = nominees.find((n) => n.name === 'Ni Luh Putu Arisyawati');
  assert.strictEqual(cook.department, 'Kitchen The Bakery');
  assert.strictEqual(nominees.find((n) => n.name === 'Andrean Kusuma').lateness, 7);
  assert.strictEqual(nominees[0].lastWarningLetter, '');
  assert.strictEqual(app.mapDepartment('Security', 'Guard', 'Nourish Ungasan'), 'HR & Security');
});

test('parse: unknown department warns, does not crash', () => {
  const bad = rows.map((r) => r.slice());
  bad[3][5] = 'Spa';
  const { nominees, warnings } = app.parseDetailRows(bad);
  assert.strictEqual(nominees.length, 19);
  assert.strictEqual(warnings.length, 1);
});

test('import twice = no duplicates; Hendra makes 10+10', () => {
  const w = makeWorld({ empty: true });
  const hr = w.login('hr');
  const dry = w.service.adminImportDetail(hr, rows, true);
  assert.strictEqual(dry.preview.length, 19);
  assert.strictEqual(w.repo.nominees.size, 0);
  assert.strictEqual(w.service.adminImportDetail(hr, rows).added, 19);
  const again = w.service.adminImportDetail(hr, rows);
  assert.deepStrictEqual([again.added, again.skipped], [0, 19]);
  assert.strictEqual(w.repo.nominees.size, 19);
  assert.strictEqual(w.repo.people.size, 19);
  const h = w.service.adminSaveNominee(hr, { awardId: 'FOH', name: 'Hendra Aditya', resigned: true, lateness: null, unpaidLeave: null });
  assert.ok(h.ok);
  assert.strictEqual(w.repo.listNominees('BOH').length, 10);
  assert.strictEqual(w.repo.listNominees('FOH').length, 10);
});

test('import only in SETUP', () => {
  const w = makeWorld({ empty: true });
  const hr = w.login('hr');
  w.service.adminAdvancePhase(hr);
  assert.strictEqual(w.service.adminImportDetail(hr, rows).error, 'WRONG_PHASE');
});
