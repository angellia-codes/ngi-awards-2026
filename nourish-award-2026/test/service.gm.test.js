const test = require('node:test');
const assert = require('node:assert');
const { makeWorld } = require('./fixtures');

// All 9 HODs vote. BOH: Agus Dwipa 5, Defry 3, Arisyawati 1. FOH: Marlin 4, Desiana 3, Kusumawati 2.
const HODS = ['hod1', 'hod2', 'hod3', 'hod4', 'hod5', 'hod6', 'hod7', 'hod8', 'hod9'];
const DEPT = { hod1: ['HR & Security', 'Kitchen The Bakery'], hod2: ['Floor'], hod3: ['Bar'], hod4: ['Cashier'],
  hod5: ['Kitchen'], hod6: ['Finance & Accounting'], hod7: ['Driver'], hod8: ['Wholefood'], hod9: ['Engineering'] };
const BOH = ['I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Wayan Agus Dwipa', 'I Wayan Agus Dwipa',
  'I Gede Defry Wisnu Sastrawan', 'I Gede Defry Wisnu Sastrawan', 'I Gede Defry Wisnu Sastrawan', 'Ni Luh Putu Arisyawati'];
const FOH = ['Marlin Luta Hambabanju', 'Marlin Luta Hambabanju', 'Marlin Luta Hambabanju', 'Marlin Luta Hambabanju',
  'I Gusti Ayu Made Desiana', 'I Gusti Ayu Made Desiana', 'I Gusti Ayu Made Desiana', 'Ni Putu Kusumawati', 'Ni Putu Kusumawati'];

function gmWorld(opts) {
  const w = makeWorld();
  const hr = w.login('hr');
  w.service.adminAdvancePhase(hr);
  if (!(opts && opts.noVotes)) {
    HODS.forEach((h, i) => {
      const mvps = {};
      DEPT[h].forEach((d) => { mvps[d] = 'MVP ' + d; });
      const r = w.service.submitHod(w.login(h), { bohNomineeId: w.nid(BOH[i]), fohNomineeId: w.nid(FOH[i]), mvps });
      assert.ok(r.ok, h + ' ' + r.error);
    });
  }
  w.service.adminAdvancePhase(hr); // HOD_CLOSED
  w.service.adminAdvancePhase(hr); // GM_OPEN
  return Object.assign(w, { hr, gm: w.login('gm') });
}
const pick = (w, awardId, slot, name, award) =>
  w.service.saveGmPick(w.gm, { awardId, slot, nomineeId: w.nid(name, award || awardId) });
const pickAll = (w) => {
  pick(w, 'BOH', '', 'I Wayan Agus Dwipa');
  pick(w, 'FOH', '', 'Marlin Luta Hambabanju');
  pick(w, 'BREAKTHROUGH', '', 'Dewi Lestari');
  pick(w, 'UNSUNG_HERO', '', 'Wayan Sari');
  pick(w, 'NOURISH_HEART', '', 'Putu Ayu');
  pick(w, 'SOCIAL_BUTTERFLY', 'Nourish Ungasan', 'Sb Ungasan One');
  pick(w, 'SOCIAL_BUTTERFLY', 'Nourish Uluwatu', 'Sb Uluwatu One');
};

test('GM blocked before GM_OPEN; HOD forbidden', () => {
  const w = makeWorld();
  assert.strictEqual(w.service.getGmBoard(w.login('gm')).error, 'WRONG_PHASE');
  const g = gmWorld();
  assert.strictEqual(g.service.getGmBoard(g.login('hod2')).error, 'FORBIDDEN');
});

test('board shows finalists with counts', () => {
  const w = gmWorld();
  const b = w.service.getGmBoard(w.gm);
  assert.strictEqual(b.decisions.length, 8);
  const boh = b.decisions.find((d) => d.awardId === 'BOH');
  assert.strictEqual(boh.options.length, 3);
  assert.strictEqual(boh.votes[w.nid('I Wayan Agus Dwipa')], 5);
  const sb = b.decisions.filter((d) => d.awardId === 'SOCIAL_BUTTERFLY');
  assert.ok(sb.every((d) => d.options.length >= 1 && d.options.every((o) => o.outlet === d.slot)));
});

test('pick rules, one award per person, confirm, reset, results', () => {
  const w = gmWorld();
  assert.strictEqual(pick(w, 'BOH', '', 'I Nengah Andrawan').error, 'NOT_FINALIST');
  assert.ok(pick(w, 'BREAKTHROUGH', '', 'Budi Santoso').ok);
  const dup = pick(w, 'NOURISH_HEART', '', 'Budi Santoso');
  assert.deepStrictEqual([dup.error, dup.detail], ['PERSON_ALREADY_PICKED', 'BREAKTHROUGH']);
  assert.ok(w.service.clearGmPick(w.gm, { awardId: 'BREAKTHROUGH', slot: '' }).ok);
  assert.ok(pick(w, 'NOURISH_HEART', '', 'Budi Santoso').ok); // freed
  assert.ok(pick(w, 'BREAKTHROUGH', '', 'Dewi Lestari').ok);

  pick(w, 'BOH', '', 'I Wayan Agus Dwipa');
  pick(w, 'FOH', '', 'Marlin Luta Hambabanju');
  pick(w, 'UNSUNG_HERO', '', 'Wayan Sari');
  pick(w, 'SOCIAL_BUTTERFLY', 'Nourish Ungasan', 'Sb Ungasan One');
  pick(w, 'SOCIAL_BUTTERFLY', 'Nourish Uluwatu', 'Sb Uluwatu One');
  assert.strictEqual(w.service.confirmGm(w.gm).error, 'INCOMPLETE'); // 7 of 8
  pick(w, 'SOCIAL_BUTTERFLY', 'Nourish Berawa', 'Sb Berawa One');
  assert.ok(w.service.confirmGm(w.gm).ok);
  assert.ok(w.repo.getGmConfirmedAt());
  assert.strictEqual(pick(w, 'BOH', '', 'Ni Luh Putu Arisyawati').error, 'GM_CONFIRMED');

  const r = w.service.adminResults(w.hr);
  assert.strictEqual(r.winners.length, 8);
  assert.strictEqual(r.mvps.length, 10);
  assert.ok(w.service.adminResetGm(w.hr).ok);
  assert.ok(pick(w, 'BOH', '', 'I Gede Defry Wisnu Sastrawan').ok);
});

test('no votes: empty finalists, confirm blocked', () => {
  const w = gmWorld({ noVotes: true });
  const b = w.service.getGmBoard(w.gm);
  assert.strictEqual(b.decisions.find((d) => d.awardId === 'BOH').options.length, 0);
  pickAll(w);
  assert.strictEqual(w.service.confirmGm(w.gm).error, 'INCOMPLETE');
});
