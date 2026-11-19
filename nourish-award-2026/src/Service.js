// Use-cases. Talks only to `repo`; every mutation runs inside repo.withLock.
function createService(deps) {
  var repo = deps.repo;
  var sessions = deps.sessions;
  var sha = deps.sha256Hex;
  var now = deps.now;
  var random = deps.random;
  var idCounter = 0;

  function cfg() { return Object.assign({}, DEFAULT_CONFIG, repo.getConfig()); }
  function fail(error, detail) { return detail ? { ok: false, error: error, detail: detail } : { ok: false, error: error }; }
  function newId(prefix) {
    idCounter++;
    return prefix + Math.floor(random() * 0x7fffffff).toString(36) + now().toString(36) + idCounter;
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // Resolves the token and checks the role. Returns {ok:true, user} or {ok:false, error}.
  function requireRole(token, roles) {
    var userId = sessions.resolve(token, now());
    var user = userId ? repo.getUser(userId) : null;
    if (!user) return fail('NOT_LOGGED_IN');
    if (roles.indexOf(user.role) < 0) return fail('FORBIDDEN');
    return { ok: true, user: user };
  }

  function listLoginNames() {
    return repo.listUsers().map(function (u) { return { userId: u.userId, name: u.name }; });
  }

  function login(userId, rawPin) {
    return repo.withLock(function () {
      var user = repo.getUser(userId);
      if (!user) return fail('UNKNOWN_USER');
      var c = cfg();
      if (checkLockout(user, now()).locked) return fail('LOCKED');
      var pin = normalizePin(rawPin);
      if (!pin || !user.pinHash || !verifyPin(pin, user, sha)) {
        var failed = recordFailure(user, now(), c);
        repo.saveUser(failed);
        return fail(checkLockout(failed, now()).locked ? 'LOCKED' : 'BAD_PIN');
      }
      repo.saveUser(recordSuccess(user));
      return { ok: true, token: sessions.create(user.userId, now()), role: user.role, name: user.name,
        departments: user.departments };
    });
  }

  function withFlag(n, c) {
    return Object.assign({}, n, { flag: computeFlag(n, c) });
  }

  function getHodBallot(token) {
    var g = requireRole(token, ['HOD']);
    if (!g.ok) return g;
    var c = cfg();
    var sub = repo.getHodSubmission(g.user.userId);
    var out = { ok: true, phase: c.phase, deadlineText: c.deadlineText || '', submitted: !!sub,
      departments: g.user.departments, boh: [], foh: [] };
    if (sub) { out.submittedAt = sub.submittedAt; return out; }
    out.boh = repo.listNominees('BOH').map(function (n) { return withFlag(n, c); });
    out.foh = repo.listNominees('FOH').map(function (n) { return withFlag(n, c); });
    return out;
  }

  function submitHod(token, payload) {
    var g = requireRole(token, ['HOD']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var c = cfg();
      var v = validateHodSubmission({
        hod: g.user, payload: payload, nominees: repo.listNominees(),
        existing: repo.getHodSubmission(g.user.userId), phase: c.phase, cfg: c
      });
      if (!v.ok) return v;
      repo.saveHodSubmission({ hodId: g.user.userId, submittedAt: now(),
        bohNomineeId: payload.bohNomineeId, fohNomineeId: payload.fohNomineeId }, v.mvps);
      return { ok: true, submittedAt: now() };
    });
  }

  function adminOverview(token) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    var c = cfg();
    var turnout = repo.listUsers().filter(function (u) { return u.role === 'HOD'; }).map(function (u) {
      var s = repo.getHodSubmission(u.userId);
      var row = { userId: u.userId, name: u.name, submitted: !!s };
      if (s) row.submittedAt = s.submittedAt;
      return row;
    });
    return { ok: true, phase: c.phase, deadlineText: c.deadlineText || '', turnout: turnout,
      gmConfirmedAt: repo.getGmConfirmedAt() };
  }

  function storeFinalists() {
    ['BOH', 'FOH'].forEach(function (awardId) {
      repo.saveFinalists(awardId, computeFinalists(repo.getVoteCounts(awardId), 3));
    });
  }

  function adminAdvancePhase(token) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var from = cfg().phase;
      var to = nextPhase(from);
      // GM_OPEN -> DONE only happens through the GM's "Confirm winners".
      if (!to || from === 'GM_OPEN') return fail('WRONG_PHASE');
      if (from === 'HOD_OPEN') storeFinalists();
      repo.setConfig({ phase: to });
      repo.appendLog({ ts: now(), actor: g.user.userId, action: 'PHASE', detail: from + '->' + to });
      return { ok: true, phase: to };
    });
  }

  function adminResetHod(token, hodId) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var u = repo.getUser(hodId);
      if (!u || u.role !== 'HOD') return fail('UNKNOWN_USER');
      // Finalists are fixed when the HOD round closes, so a reset only makes sense before that.
      if (cfg().phase !== 'HOD_OPEN') return fail('WRONG_PHASE');
      repo.deleteHodSubmission(hodId);
      repo.appendLog({ ts: now(), actor: g.user.userId, action: 'RESET_HOD', detail: hodId });
      return { ok: true };
    });
  }

  function personIdFor(name) {
    var key = normName(name);
    var hit = repo.listPeople().filter(function (p) { return normName(p.name) === key; })[0];
    if (hit) return hit.personId;
    var p = { personId: newId('p_'), name: String(name).trim() };
    repo.savePerson(p);
    return p.personId;
  }

  function toNum(v) {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }

  function adminSaveNominee(token, n) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    if (AWARD_IDS.indexOf(n.awardId) < 0) return fail('WRONG_AWARD');
    if (n.awardId === 'SOCIAL_BUTTERFLY' && SB_OUTLETS.indexOf(n.outlet) < 0) return fail('WRONG_OUTLET');
    if (!String(n.name || '').trim()) return fail('BAD_NOMINEE');
    return repo.withLock(function () {
      var rec = {
        nomineeId: n.nomineeId || newId('n_'), awardId: n.awardId, personId: n.personId || personIdFor(n.name),
        name: String(n.name).trim(), position: n.position || '', outlet: n.outlet || '',
        department: n.department || '', lateness: toNum(n.lateness), unpaidLeave: toNum(n.unpaidLeave),
        lastAward: n.lastAward || '', lastWarningLetter: n.lastWarningLetter || '',
        whyNominated: n.whyNominated || '', photoUrl: n.photoUrl || '', resigned: !!n.resigned
      };
      repo.saveNominee(rec);
      return { ok: true, nominee: rec };
    });
  }

  function adminDeleteNominee(token, nomineeId) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      if (cfg().phase !== 'SETUP') return fail('WRONG_PHASE'); // votes and finalists point at nominees
      repo.deleteNominee(nomineeId);
      return { ok: true };
    });
  }

  function adminListNominees(token, awardId) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return { ok: true, nominees: repo.listNominees(awardId) };
  }

  function adminSaveUser(token, u) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    if (['HR_ADMIN', 'HOD', 'GM'].indexOf(u.role) < 0) return fail('FORBIDDEN');
    var deps_ = (u.departments || []).filter(function (d) { return DEPARTMENTS.indexOf(d) >= 0; });
    if (!String(u.name || '').trim() || (u.role === 'HOD' && !deps_.length)) return fail('BAD_NOMINEE');
    return repo.withLock(function () {
      var old = u.userId ? repo.getUser(u.userId) : null;
      var rec = Object.assign({ pinHash: '', salt: '', failedCount: 0, lockedUntil: 0 }, old || {}, {
        userId: u.userId || newId('u_'), name: String(u.name).trim(), role: u.role,
        departments: u.role === 'HOD' ? deps_ : []
      });
      repo.saveUser(rec);
      return { ok: true, userId: rec.userId };
    });
  }

  // Never returns pinHash or salt.
  function adminListUsers(token) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return { ok: true, users: repo.listUsers().map(function (u) {
      return { userId: u.userId, name: u.name, role: u.role, departments: u.departments, hasPin: !!u.pinHash };
    }) };
  }

  function adminSetDeadlineText(token, text) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      repo.setConfig({ deadlineText: String(text || '') });
      return { ok: true };
    });
  }

  function adminResetPin(token, userId) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var u = repo.getUser(userId);
      if (!u) return fail('UNKNOWN_USER');
      var pin = generatePin(random);
      var salt = newId('s_');
      repo.saveUser(Object.assign({}, u, { salt: salt, pinHash: hashPin(pin, salt, sha), failedCount: 0, lockedUntil: 0 }));
      repo.appendLog({ ts: now(), actor: g.user.userId, action: 'RESET_PIN', detail: userId });
      return { ok: true, pin: pin };
    });
  }

  // dryRun=true returns the preview only, so HR can check the department mapping before importing.
  function adminImportDetail(token, values, dryRun) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      if (cfg().phase !== 'SETUP') return fail('WRONG_PHASE');
      var parsed = parseDetailRows(values || []);
      var preview = parsed.nominees.map(function (n) {
        return { awardId: n.awardId, name: n.name, outlet: n.outlet, department: n.department };
      });
      if (dryRun) return { ok: true, preview: preview, warnings: parsed.warnings, added: 0, skipped: 0 };
      var r = applyImport(repo, parsed.nominees);
      return { ok: true, preview: preview, warnings: parsed.warnings, added: r.added, skipped: r.skipped };
    });
  }

  // ---- GM ----
  function finalistMap() {
    return { BOH: repo.listFinalists('BOH').map(function (f) { return f.nomineeId; }),
      FOH: repo.listFinalists('FOH').map(function (f) { return f.nomineeId; }) };
  }

  function getGmBoard(token) {
    var g = requireRole(token, ['GM']);
    if (!g.ok) return g;
    var c = cfg();
    if (c.phase !== 'GM_OPEN' && c.phase !== 'DONE') return fail('WRONG_PHASE');
    var nominees = repo.listNominees();
    var picks = repo.listGmPicks();
    var decisions = requiredGmDecisions().map(function (d) {
      var dec = { awardId: d.awardId, slot: d.slot, options: [], pickedNomineeId: null };
      if (d.awardId === 'BOH' || d.awardId === 'FOH') {
        var fin = repo.listFinalists(d.awardId);
        dec.votes = {};
        fin.forEach(function (f) { dec.votes[f.nomineeId] = f.votes; });
        dec.options = fin.map(function (f) {
          return withFlag(nominees.filter(function (n) { return n.nomineeId === f.nomineeId; })[0], c);
        });
      } else {
        dec.options = nominees.filter(function (n) {
          return n.awardId === d.awardId && (!d.slot || n.outlet === d.slot);
        });
      }
      var p = picks.filter(function (x) { return x.awardId === d.awardId && x.slot === d.slot; })[0];
      if (p) dec.pickedNomineeId = p.nomineeId;
      return dec;
    });
    return { ok: true, phase: c.phase, confirmedAt: repo.getGmConfirmedAt(), decisions: decisions };
  }

  function gmWritable() {
    if (repo.getGmConfirmedAt()) return fail('GM_CONFIRMED');
    if (cfg().phase !== 'GM_OPEN') return fail('WRONG_PHASE');
    return { ok: true };
  }

  function saveGmPick(token, p) {
    var g = requireRole(token, ['GM']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var w = gmWritable();
      if (!w.ok) return w;
      var known = requiredGmDecisions().some(function (d) { return d.awardId === p.awardId && d.slot === (p.slot || ''); });
      if (!known) return fail('WRONG_AWARD');
      var slot = p.slot || '';
      var picks = repo.listGmPicks().filter(function (x) { return !(x.awardId === p.awardId && x.slot === slot); });
      picks.push({ awardId: p.awardId, slot: slot, nomineeId: p.nomineeId });
      var nominees = repo.listNominees();
      var v = validateGmPicks({ picks: picks, nominees: nominees, finalists: finalistMap(), requireComplete: false });
      if (!v.ok) return v;
      var n = nominees.filter(function (x) { return x.nomineeId === p.nomineeId; })[0];
      repo.saveGmPick({ awardId: p.awardId, slot: slot, nomineeId: n.nomineeId, personId: n.personId, pickedAt: now() });
      return { ok: true };
    });
  }

  function clearGmPick(token, p) {
    var g = requireRole(token, ['GM']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var w = gmWritable();
      if (!w.ok) return w;
      repo.deleteGmPick(p.awardId, p.slot || '');
      return { ok: true };
    });
  }

  function confirmGm(token) {
    var g = requireRole(token, ['GM']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      var w = gmWritable();
      if (!w.ok) return w;
      var v = validateGmPicks({ picks: repo.listGmPicks(), nominees: repo.listNominees(),
        finalists: finalistMap(), requireComplete: true });
      if (!v.ok) return v;
      repo.setGmConfirmedAt(now());
      repo.setConfig({ phase: 'DONE' });
      repo.appendLog({ ts: now(), actor: g.user.userId, action: 'GM_CONFIRM', detail: '' });
      return { ok: true, confirmedAt: now() };
    });
  }

  function adminResetGm(token) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    return repo.withLock(function () {
      if (!repo.getGmConfirmedAt()) return fail('WRONG_PHASE');
      repo.setGmConfirmedAt(null);
      repo.setConfig({ phase: 'GM_OPEN' });
      repo.appendLog({ ts: now(), actor: g.user.userId, action: 'RESET_GM', detail: '' });
      return { ok: true };
    });
  }

  function adminResults(token) {
    var g = requireRole(token, ['HR_ADMIN']);
    if (!g.ok) return g;
    if (!repo.getGmConfirmedAt()) return fail('WRONG_PHASE');
    var nominees = repo.listNominees();
    var users = repo.listUsers();
    return {
      ok: true,
      winners: repo.listGmPicks().map(function (p) {
        return { awardId: p.awardId, slot: p.slot,
          nominee: nominees.filter(function (n) { return n.nomineeId === p.nomineeId; })[0] };
      }),
      mvps: repo.listMvps().map(function (m) {
        var u = users.filter(function (x) { return x.userId === m.hodId; })[0];
        return { department: m.department, name: m.name, hodName: u ? u.name : '' };
      })
    };
  }

  return {
    getGmBoard: getGmBoard, saveGmPick: saveGmPick, clearGmPick: clearGmPick, confirmGm: confirmGm,
    adminResetGm: adminResetGm, adminResults: adminResults, adminImportDetail: adminImportDetail,
    listLoginNames: listLoginNames, login: login, getHodBallot: getHodBallot, submitHod: submitHod,
    adminOverview: adminOverview, adminAdvancePhase: adminAdvancePhase, adminResetHod: adminResetHod,
    adminSaveNominee: adminSaveNominee, adminDeleteNominee: adminDeleteNominee,
    adminListNominees: adminListNominees, adminListUsers: adminListUsers, adminSaveUser: adminSaveUser,
    adminSetDeadlineText: adminSetDeadlineText, adminResetPin: adminResetPin,
    _internals: { requireRole: requireRole, cfg: cfg, fail: fail, storeFinalists: storeFinalists }
  };
}
