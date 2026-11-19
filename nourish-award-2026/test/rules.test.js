const test = require('node:test');
const assert = require('node:assert');
const a = require('./load').loadApp();
const { makeNominees } = require('./fixtures');

const nominees = makeNominees();
const id = (name, award) => nominees.find((n) => n.name === name && (!award || n.awardId === award)).nomineeId;
const cfg = a.DEFAULT_CONFIG;
const angel = { userId: 'hod1', departments: ['HR & Security', 'Kitchen The Bakery'] };
const floor = { userId: 'hod2', departments: ['Floor'] };
const sub = (over) => Object.assign({
  hod: floor, nominees, existing: null, phase: 'HOD_OPEN', cfg,
  payload: { bohNomineeId: id('I Wayan Agus Dwipa'), fohNomineeId: id('Marlin Luta Hambabanju'), mvps: { Floor: '  Putu   Ayu ' } }
}, over);

test('phases', () => {
  assert.strictEqual(a.nextPhase('SETUP'), 'HOD_OPEN');
  assert.strictEqual(a.nextPhase('DONE'), null);
  assert.strictEqual(a.requiredGmDecisions().length, 8);
});

test('HOD submission rules', () => {
  const ok = a.validateHodSubmission(sub());
  assert.ok(ok.ok);
  assert.strictEqual(ok.mvps[0].name, 'Putu Ayu');
  assert.strictEqual(a.validateHodSubmission(sub({ phase: 'HOD_CLOSED' })).error, 'WRONG_PHASE');
  assert.strictEqual(a.validateHodSubmission(sub({ existing: {} })).error, 'ALREADY_SUBMITTED');
  const p = (o) => Object.assign({}, sub().payload, o);
  assert.strictEqual(a.validateHodSubmission(sub({ payload: p({ bohNomineeId: id('Andrean Kusuma') }) })).error, 'NOT_VOTABLE');
  assert.strictEqual(a.validateHodSubmission(sub({ payload: p({ fohNomineeId: id('Hendra Aditya') }) })).error, 'NOT_VOTABLE');
  assert.strictEqual(a.validateHodSubmission(sub({ payload: p({ bohNomineeId: id('Norta Ota') }) })).error, 'BAD_NOMINEE');
  assert.strictEqual(a.validateHodSubmission(sub({ payload: p({ bohNomineeId: 'nope' }) })).error, 'BAD_NOMINEE');
  assert.strictEqual(a.validateHodSubmission(sub({ hod: angel, payload: p({ mvps: { 'HR & Security': 'X' } }) })).error, 'MVP_MISSING');
  assert.strictEqual(a.validateHodSubmission(sub({ payload: p({ mvps: { Floor: 'x'.repeat(81) } }) })).error, 'MVP_TOO_LONG');
});

test('GM pick rules', () => {
  const g = (name) => nominees.find((n) => n.name === name);
  const pick = (awardId, slot, n) => ({ awardId, slot, nomineeId: n.nomineeId });
  const finalists = { BOH: [id('I Wayan Agus Dwipa')], FOH: [id('Marlin Luta Hambabanju')] };
  const run = (picks, requireComplete) => a.validateGmPicks({ picks, nominees, finalists, requireComplete: !!requireComplete });
  const boh = nominees.find((n) => n.name === 'I Wayan Agus Dwipa');
  assert.ok(run([pick('BOH', '', boh)]).ok);
  assert.strictEqual(run([pick('BOH', '', g('I Nengah Andrawan'))]).error, 'NOT_FINALIST');
  const bt = nominees.find((n) => n.awardId === 'BREAKTHROUGH' && n.name === 'Budi Santoso');
  const nh = nominees.find((n) => n.awardId === 'NOURISH_HEART' && n.name === 'Budi Santoso');
  const dup = run([pick('BREAKTHROUGH', '', bt), pick('NOURISH_HEART', '', nh)]);
  assert.deepStrictEqual([dup.error, dup.detail], ['PERSON_ALREADY_PICKED', 'BREAKTHROUGH']);
  const sbBerawa = nominees.find((n) => n.name === 'Sb Berawa One');
  assert.strictEqual(run([pick('SOCIAL_BUTTERFLY', 'Nourish Ungasan', sbBerawa)]).error, 'WRONG_OUTLET');
  assert.strictEqual(run([pick('BOH', '', boh)], true).error, 'INCOMPLETE');
});
