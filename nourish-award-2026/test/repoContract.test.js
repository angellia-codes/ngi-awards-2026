const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');
const { MemoryRepo } = require('./MemoryRepo');
const { FakeSpreadsheet, fakeGlobals } = require('./FakeSpreadsheet');

test('MemoryRepo passes the repo contract', () => {
  const a = loadApp();
  assert.deepStrictEqual([...a.runRepoContract(new MemoryRepo())], []);
});

test('SheetRepo passes the repo contract on a fake spreadsheet', () => {
  const a = loadApp(fakeGlobals);
  const ss = new FakeSpreadsheet();
  a.setupSpreadsheet(ss);
  assert.deepStrictEqual([...a.runRepoContract(a.createSheetRepo(ss))], []);
});

test('SheetRepo: tabs exist and no number/formula coercion of text', () => {
  const a = loadApp(fakeGlobals);
  const ss = new FakeSpreadsheet();
  a.setupSpreadsheet(ss);
  ['Config', 'Users', 'People', 'Nominees', 'HodSubmissions', 'Mvps', 'Tallies', 'Finalists', 'GmPicks', 'Log']
    .forEach((t) => assert.ok(ss.getSheetByName(t), t));
  const repo = a.createSheetRepo(ss);
  repo.saveUser({ userId: 'u', name: 'N', role: 'HOD', departments: ['Bar'], pinHash: '000123', salt: '1e5', failedCount: 0, lockedUntil: 0 });
  assert.strictEqual(repo.getUser('u').pinHash, '000123');
  assert.strictEqual(repo.getUser('u').salt, '1e5');
  // raw cell is text, not a number
  assert.strictEqual(ss.getSheetByName('Users').rows[1][4], '000123');
  assert.strictEqual(repo.getConfig().maxFailures, 5);
});
