// Same checks for MemoryRepo (Node) and SheetRepo (Apps Script). Returns a list of failures; [] = pass.
function runRepoContract(repo) {
  var fails = [];
  function check(ok, msg) { if (!ok) fails.push(msg); }
  var base = { personId: 'pc1', position: 'Cook', outlet: 'Nourish Ungasan', department: 'Kitchen', lastAward: '',
    lastWarningLetter: '', whyNominated: '', photoUrl: '', resigned: false };
  function nominee(id, awardId, name, over) {
    return Object.assign({}, base, { nomineeId: id, awardId: awardId, name: name, lateness: 2, unpaidLeave: 0 }, over || {});
  }

  // nominee types, and formula-looking text stays text
  repo.saveNominee(nominee('c_boh1', 'BOH', 'Contract One', { resigned: true }));
  repo.saveNominee(nominee('c_boh2', 'BOH', '=HYPERLINK("x")', { lateness: null, unpaidLeave: null }));
  repo.saveNominee(nominee('c_foh1', 'FOH', '+1 Plus', {}));
  var n1 = repo.listNominees('BOH').filter(function (n) { return n.nomineeId === 'c_boh1'; })[0];
  var n2 = repo.listNominees('BOH').filter(function (n) { return n.nomineeId === 'c_boh2'; })[0];
  check(n1 && n1.lateness === 2 && typeof n1.lateness === 'number', 'lateness reads back as number');
  check(n1 && n1.resigned === true, 'resigned reads back as boolean true');
  check(n2 && n2.lateness === null && n2.resigned === false, 'blank lateness is null, resigned false');
  check(n2 && n2.name === '=HYPERLINK("x")', 'formula-looking name reads back unchanged');
  check(repo.listNominees().length === 3 && repo.listNominees('FOH').length === 1, 'listNominees filters by award');

  // user: pinHash with leading zeros stays a string; departments round-trip
  repo.saveUser({ userId: 'cu1', name: 'Contract User', role: 'HOD', departments: ['HR & Security', 'Kitchen The Bakery'],
    pinHash: '0123456789', salt: '000777', failedCount: 2, lockedUntil: 0 });
  var u = repo.getUser('cu1');
  check(u && u.pinHash === '0123456789' && u.salt === '000777', 'pinHash and salt stay text');
  check(u && u.departments.length === 2 && u.departments[1] === 'Kitchen The Bakery', 'departments round-trip');
  check(u && u.failedCount === 2, 'failedCount is a number');
  check(repo.getUser('nobody') === null, 'unknown user is null');

  // submission, MVPs, vote counts
  repo.saveHodSubmission({ hodId: 'cu1', submittedAt: 12345, bohNomineeId: 'c_boh1', fohNomineeId: 'c_foh1' },
    [{ department: 'HR & Security', name: '=SUM(1)' }, { department: 'Kitchen The Bakery', name: 'Bu Ayu' }]);
  var s = repo.getHodSubmission('cu1');
  check(s && s.submittedAt === 12345 && s.bohNomineeId === 'c_boh1', 'submission reads back');
  var mv = repo.listMvps();
  check(mv.length === 2 && mv[0].name === '=SUM(1)', 'MVPs saved, formula-looking name unchanged');
  var boh = repo.getVoteCounts('BOH');
  var c1 = boh.filter(function (x) { return x.nomineeId === 'c_boh1'; })[0];
  check(c1 && c1.votes === 1, 'getVoteCounts counts the BOH vote');
  var c2 = boh.filter(function (x) { return x.nomineeId === 'c_boh2'; })[0];
  check(c2 && c2.votes === 0, 'nominee with no votes counts 0');
  var f1 = repo.getVoteCounts('FOH').filter(function (x) { return x.nomineeId === 'c_foh1'; })[0];
  check(f1 && f1.votes === 1, 'getVoteCounts counts the FOH vote');
  repo.deleteHodSubmission('cu1');
  check(repo.getHodSubmission('cu1') === null && repo.listMvps().length === 0, 'deleteHodSubmission removes both');
  check(repo.getVoteCounts('BOH').filter(function (x) { return x.nomineeId === 'c_boh1'; })[0].votes === 0,
    'vote count drops after delete');

  // finalists
  repo.saveFinalists('BOH', [{ nomineeId: 'c_boh1', votes: 3, rank: 1 }]);
  repo.saveFinalists('BOH', [{ nomineeId: 'c_boh2', votes: 2, rank: 1 }, { nomineeId: 'c_boh1', votes: 2, rank: 1 }]);
  check(repo.listFinalists('BOH').length === 2, 'saveFinalists replaces the previous rows');

  // GM picks, confirmed flag
  repo.saveGmPick({ awardId: 'SOCIAL_BUTTERFLY', slot: 'Nourish Ungasan', nomineeId: 'c_foh1', personId: 'pc1', pickedAt: 99 });
  repo.saveGmPick({ awardId: 'SOCIAL_BUTTERFLY', slot: 'Nourish Ungasan', nomineeId: 'c_boh1', personId: 'pc1', pickedAt: 100 });
  var picks = repo.listGmPicks();
  check(picks.length === 1 && picks[0].nomineeId === 'c_boh1' && picks[0].pickedAt === 100, 'saveGmPick replaces the same slot');
  repo.deleteGmPick('SOCIAL_BUTTERFLY', 'Nourish Ungasan');
  check(repo.listGmPicks().length === 0, 'deleteGmPick removes it');
  check(repo.getGmConfirmedAt() === null, 'gm not confirmed at start');
  repo.setGmConfirmedAt(555);
  check(repo.getGmConfirmedAt() === 555, 'gmConfirmedAt round-trips');
  repo.setGmConfirmedAt(null);
  check(repo.getGmConfirmedAt() === null, 'gmConfirmedAt can be cleared');

  // config
  repo.setConfig({ phase: 'HOD_OPEN', deadlineText: '17:00' });
  var cfg = repo.getConfig();
  check(cfg.phase === 'HOD_OPEN' && cfg.deadlineText === '17:00', 'config text (even "17:00") round-trips');

  // people, deleting a nominee
  repo.savePerson({ personId: 'pc1', name: '-Dash Name' });
  check(repo.listPeople()[0].name === '-Dash Name', 'person name starting with "-" unchanged');
  repo.deleteNominee('c_boh2');
  check(repo.listNominees('BOH').length === 1, 'deleteNominee removes it');
  check(repo.getVoteCounts('BOH').length === 1, 'deleteNominee removes its tally');
  repo.appendLog({ ts: 1, actor: 'x', action: 'A', detail: '' });
  check(repo.withLock(function () { return 7; }) === 7, 'withLock returns the callback result');
  return fails;
}
