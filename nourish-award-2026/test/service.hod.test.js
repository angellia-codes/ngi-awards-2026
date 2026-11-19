const test = require('node:test');
const assert = require('node:assert');
const { makeWorld } = require('./fixtures');

const goodVote = (w, mvps) => ({
  bohNomineeId: w.nid('I Wayan Agus Dwipa'), fohNomineeId: w.nid('Marlin Luta Hambabanju'), mvps: mvps || { Floor: 'Putu Ayu' }
});
const open = (w) => {
  const hr = w.login('hr');
  assert.ok(w.service.adminAdvancePhase(hr).ok); // SETUP -> HOD_OPEN
  return hr;
};

test('login, lockout, forbidden', () => {
  const w = makeWorld();
  assert.ok(w.service.login('hod2', w.pins.hod2).ok);
  assert.strictEqual(w.service.login('hod2', '000000').error, 'BAD_PIN');
  assert.ok(w.service.login('hod1', ' 012345 ').ok);
  let r;
  for (let i = 0; i < 5; i++) r = w.service.login('hod3', '000000');
  assert.strictEqual(r.error, 'LOCKED');
  assert.strictEqual(w.service.login('hod3', w.pins.hod3).error, 'LOCKED');
  assert.strictEqual(w.service.adminOverview(w.login('hod2')).error, 'FORBIDDEN');
  assert.strictEqual(w.service.submitHod(w.login('gm'), goodVote(w)).error, 'FORBIDDEN');
  assert.strictEqual(w.service.adminOverview('bogus').error, 'NOT_LOGGED_IN');
});

test('ballot: 10+10 cards, only red and resigned blocked', () => {
  const w = makeWorld();
  const b = w.service.getHodBallot(w.login('hod2'));
  assert.strictEqual(b.boh.length, 10);
  assert.strictEqual(b.foh.length, 10);
  const blocked = [...b.boh, ...b.foh].filter((c) => !c.flag.canVote).map((c) => c.name).sort();
  assert.strictEqual(blocked.length, 7);
  assert.ok(blocked.includes('Hendra Aditya'));
  assert.strictEqual([...b.boh, ...b.foh].filter((c) => c.flag.color === 'red').length, 6);
});

test('submit: once, final, secret', () => {
  const w = makeWorld();
  const hr = open(w);
  const t = w.login('hod2');
  assert.ok(w.service.submitHod(t, goodVote(w)).ok);
  assert.strictEqual(w.service.submitHod(t, goodVote(w)).error, 'ALREADY_SUBMITTED');
  assert.strictEqual(w.repo.subs.size, 1);
  assert.strictEqual(w.repo.listMvps().length, 1);
  const b = w.service.getHodBallot(w.login('hod2'));
  assert.strictEqual(b.submitted, true);
  assert.ok(b.submittedAt);
  assert.strictEqual(b.boh.length + b.foh.length, 0);
  assert.ok(!('bohNomineeId' in b));
  const o = w.service.adminOverview(hr);
  assert.strictEqual(o.turnout.length, 9);
  assert.ok(o.turnout.every((r) => Object.keys(r).every((k) => ['userId', 'name', 'submitted', 'submittedAt'].includes(k))));
});

test('submit: red nominee, wrong phase', () => {
  const w = makeWorld();
  const t = w.login('hod2');
  assert.strictEqual(w.service.submitHod(t, goodVote(w)).error, 'WRONG_PHASE'); // SETUP
  open(w);
  const bad = Object.assign(goodVote(w), { bohNomineeId: w.nid('Andrean Kusuma') });
  assert.strictEqual(w.service.submitHod(t, bad).error, 'NOT_VOTABLE');
  assert.strictEqual(w.repo.subs.size, 0);
});

test('phases advance in order and finalists are stored', () => {
  const w = makeWorld();
  const hr = open(w);
  w.service.submitHod(w.login('hod2'), goodVote(w));
  w.service.submitHod(w.login('hod3'), goodVote(w, { Bar: 'X' }));
  assert.strictEqual(w.service.adminAdvancePhase(hr).phase, 'HOD_CLOSED');
  const f = w.repo.listFinalists('BOH');
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].votes, 2);
  assert.strictEqual(w.service.adminAdvancePhase(hr).phase, 'GM_OPEN');
  assert.strictEqual(w.service.adminAdvancePhase(hr).error, 'WRONG_PHASE'); // DONE only via GM confirm
});

test('reset HOD is logged and allows resubmit', () => {
  const w = makeWorld();
  const hr = open(w);
  const t = w.login('hod2');
  w.service.submitHod(t, goodVote(w));
  assert.ok(w.service.adminResetHod(hr, 'hod2').ok);
  assert.ok(w.repo.log.some((l) => l.action === 'RESET_HOD'));
  assert.ok(w.service.submitHod(t, goodVote(w)).ok);
});

test('admin user list hides PIN data', () => {
  const w = makeWorld();
  const r = w.service.adminListUsers(w.login('hr'));
  assert.strictEqual(r.users.length, 11);
  assert.ok(!JSON.stringify(r).match(/pinHash|salt/));
  assert.strictEqual(w.service.adminListUsers(w.login('hod2')).error, 'FORBIDDEN');
});

test('admin nominee, user, pin, deadline', () => {
  const w = makeWorld();
  const hr = w.login('hr');
  const sb = { awardId: 'SOCIAL_BUTTERFLY', name: 'Z', outlet: 'The Bakery Uluwatu' };
  assert.strictEqual(w.service.adminSaveNominee(hr, sb).error, 'WRONG_OUTLET');
  assert.ok(w.service.adminSaveNominee(hr, Object.assign(sb, { outlet: 'Nourish Uluwatu' })).ok);
  const u = w.service.adminSaveUser(hr, { name: 'New HOD', role: 'HOD', departments: ['Bar'] });
  assert.ok(u.ok);
  const p = w.service.adminResetPin(hr, u.userId);
  assert.ok(w.service.login(u.userId, p.pin).ok);
  w.service.adminSetDeadlineText(hr, 'Fri 17:00');
  assert.strictEqual(w.service.getHodBallot(w.login('hod2')).deadlineText, 'Fri 17:00');
  // same typed name (different case/spaces) reuses the person
  const a = w.service.adminSaveNominee(hr, { awardId: 'BREAKTHROUGH', name: 'Siti' });
  const b = w.service.adminSaveNominee(hr, { awardId: 'NOURISH_HEART', name: '  siti ' });
  assert.strictEqual(a.nominee.personId, b.nominee.personId);
});
