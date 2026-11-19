// Pure validators and phase order.
function nextPhase(current) {
  var i = PHASES.indexOf(current);
  return i < 0 || i === PHASES.length - 1 ? null : PHASES[i + 1];
}

function requiredGmDecisions() {
  var out = [];
  ['BOH', 'FOH', 'BREAKTHROUGH', 'UNSUNG_HERO', 'NOURISH_HEART'].forEach(function (id) {
    out.push({ awardId: id, slot: '' });
  });
  SB_OUTLETS.forEach(function (o) { out.push({ awardId: 'SOCIAL_BUTTERFLY', slot: o }); });
  return out;
}

function validateHodSubmission(a) {
  if (a.phase !== 'HOD_OPEN') return { ok: false, error: 'WRONG_PHASE' };
  if (a.existing) return { ok: false, error: 'ALREADY_SUBMITTED' };
  var p = a.payload || {};
  var picks = [['BOH', p.bohNomineeId], ['FOH', p.fohNomineeId]];
  for (var i = 0; i < picks.length; i++) {
    var n = a.nominees.filter(function (x) { return x.nomineeId === picks[i][1]; })[0];
    if (!n || n.awardId !== picks[i][0]) return { ok: false, error: 'BAD_NOMINEE' };
    if (!computeFlag(n, a.cfg).canVote) return { ok: false, error: 'NOT_VOTABLE' };
  }
  var mvps = [];
  for (var j = 0; j < a.hod.departments.length; j++) {
    var d = a.hod.departments[j];
    var name = String((p.mvps || {})[d] == null ? '' : p.mvps[d]).replace(/\s+/g, ' ').trim();
    if (!name) return { ok: false, error: 'MVP_MISSING' };
    if (name.length > a.cfg.mvpMaxLen) return { ok: false, error: 'MVP_TOO_LONG' };
    mvps.push({ department: d, name: name });
  }
  return { ok: true, mvps: mvps };
}

// picks: [{awardId, slot, nomineeId}]; finalists: {BOH:[ids], FOH:[ids]}
function validateGmPicks(a) {
  var seen = {}; // personId -> awardId
  for (var i = 0; i < a.picks.length; i++) {
    var pk = a.picks[i];
    var n = a.nominees.filter(function (x) { return x.nomineeId === pk.nomineeId; })[0];
    if (!n || n.awardId !== pk.awardId) return { ok: false, error: 'WRONG_AWARD' };
    if ((pk.awardId === 'BOH' || pk.awardId === 'FOH') && a.finalists[pk.awardId].indexOf(pk.nomineeId) < 0) {
      return { ok: false, error: 'NOT_FINALIST' };
    }
    if (pk.awardId === 'SOCIAL_BUTTERFLY' && n.outlet !== pk.slot) return { ok: false, error: 'WRONG_OUTLET' };
    if (seen[n.personId]) return { ok: false, error: 'PERSON_ALREADY_PICKED', detail: seen[n.personId] };
    seen[n.personId] = pk.awardId;
  }
  if (a.requireComplete) {
    var need = requiredGmDecisions();
    for (var k = 0; k < need.length; k++) {
      var has = a.picks.some(function (x) { return x.awardId === need[k].awardId && x.slot === need[k].slot; });
      if (!has) return { ok: false, error: 'INCOMPLETE' };
    }
  }
  return { ok: true };
}
