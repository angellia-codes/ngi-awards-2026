// Test data. Attendance numbers for the 19 Detail-tab rows are chosen to match the flag colours in the
// design doc (6 red, 6 yellow, 7 green); Andrean=7, Cloudia={4,3}, Kadek Riska={2,4}, Norta Ota={3,0} come from the plan.
// [awardId, name, position, outlet, department, lateness, unpaidLeave, resigned]
const BOH_FOH = [
  ['BOH', 'Andrean Kusuma', 'Cook', 'Nourish Ungasan', 'Kitchen', 7, 0],
  ['BOH', 'I Made Ananta Wijayakusuma P', 'Cook', 'Nourish Uluwatu', 'Kitchen', 0, 5],
  ['BOH', 'I Komang Tri Artanadi', 'Steward', 'Nourish Berawa', 'Kitchen', 4, 0],
  ['BOH', 'Esaldo Moto Ubbu Lele', 'Cook', 'Nourish Ungasan', 'Kitchen', 1, 4],
  ['BOH', 'I Nengah Andrawan', 'Cook', 'Nourish Ungasan', 'Kitchen', 1, 0],
  ['BOH', 'I Kadek Adiasa', 'Steward', 'Nourish Uluwatu', 'Kitchen', 1, 0],
  ['BOH', 'I Made Kartina Putra', 'Cook', 'Nourish Berawa', 'Kitchen', 0, 1],
  ['BOH', 'I Gede Defry Wisnu Sastrawan', 'Cook', 'Nourish Ungasan', 'Kitchen', 0, 0],
  ['BOH', 'I Wayan Agus Dwipa', 'Steward', 'Nourish Uluwatu', 'Kitchen', 0, 0],
  ['BOH', 'Ni Luh Putu Arisyawati', 'Cook The Bakery', 'The Bakery Kitchen', 'Kitchen The Bakery', 0, 0],
  ['FOH', 'Ni Luh Putu Cloudia Wulandari', 'Waitress', 'Nourish Ungasan', 'Floor', 4, 3],
  ['FOH', 'Kadek Riska Dewi', 'Waitress', 'Nourish Uluwatu', 'Floor', 2, 4],
  ['FOH', 'Norta Ota', 'Barista', 'Nourish Berawa', 'Bar', 3, 0],
  ['FOH', 'Putu Sunil Laksana', 'Waiter', 'Nourish Ungasan', 'Floor', 1, 0],
  ['FOH', 'I Kadek Okawa Juniasa', 'Cashier', 'Nourish Uluwatu', 'Cashier', 0, 1],
  ['FOH', 'Ni Komang Ayu Mekar Sari', 'Waitress', 'Nourish Berawa', 'Floor', 0, 0],
  ['FOH', 'I Gusti Ayu Made Desiana', 'Waitress', 'Nourish Ungasan', 'Floor', 0, 0],
  ['FOH', 'Ni Putu Kusumawati', 'Barista', 'Nourish Uluwatu', 'Bar', 0, 0],
  ['FOH', 'Marlin Luta Hambabanju', 'Waiter', 'Nourish Berawa', 'Floor', 0, 0],
  ['FOH', 'Hendra Aditya', 'Waiter', 'Nourish Ungasan', 'Floor', null, null, true]
];

// GM-decided awards. BT1 and NH1 share a person on purpose (one-award-per-person).
const GM_ROWS = [
  ['BREAKTHROUGH', 'Budi Santoso', 'Cook', 'Nourish Ungasan', 'Kitchen', 'p_budi'],
  ['BREAKTHROUGH', 'Dewi Lestari', 'Waitress', 'Nourish Uluwatu', 'Floor', 'p_dewi'],
  ['UNSUNG_HERO', 'Wayan Sari', 'Steward', 'Nourish Berawa', 'Kitchen', 'p_wayan'],
  ['UNSUNG_HERO', 'Komang Adi', 'Driver', 'Nourish Ungasan', 'Driver', 'p_komang'],
  ['NOURISH_HEART', 'Budi Santoso', 'Cook', 'Nourish Ungasan', 'Kitchen', 'p_budi'],
  ['NOURISH_HEART', 'Putu Ayu', 'Cashier', 'Nourish Uluwatu', 'Cashier', 'p_putu'],
  ['SOCIAL_BUTTERFLY', 'Sb Ungasan One', 'Waiter', 'Nourish Ungasan', 'Floor', 'p_sbu1'],
  ['SOCIAL_BUTTERFLY', 'Sb Ungasan Two', 'Waiter', 'Nourish Ungasan', 'Floor', 'p_sbu2'],
  ['SOCIAL_BUTTERFLY', 'Sb Uluwatu One', 'Waiter', 'Nourish Uluwatu', 'Floor', 'p_sbl1'],
  ['SOCIAL_BUTTERFLY', 'Sb Berawa One', 'Waiter', 'Nourish Berawa', 'Floor', 'p_sbb1']
];

function makeNominees() {
  const out = [];
  BOH_FOH.forEach((r, i) => out.push({
    nomineeId: 'n' + (i + 1), awardId: r[0], personId: 'p' + (i + 1), name: r[1], position: r[2], outlet: r[3],
    department: r[4], lateness: r[5], unpaidLeave: r[6], lastAward: '', lastWarningLetter: '',
    whyNominated: '', photoUrl: '', resigned: !!r[7]
  }));
  GM_ROWS.forEach((r, i) => out.push({
    nomineeId: 'g' + (i + 1), awardId: r[0], personId: r[5], name: r[1], position: r[2], outlet: r[3],
    department: r[4], lateness: null, unpaidLeave: null, lastAward: '', lastWarningLetter: '',
    whyNominated: '', photoUrl: '', resigned: false
  }));
  return out;
}

// Angel (hod1) covers two departments. 9 HODs cover the 10 departments.
const USER_DEFS = [
  { userId: 'hr', name: 'Angel HR', role: 'HR_ADMIN', departments: [], pin: '111111' },
  { userId: 'hod1', name: 'Angel', role: 'HOD', departments: ['HR & Security', 'Kitchen The Bakery'], pin: '012345' },
  { userId: 'hod2', name: 'HOD Floor', role: 'HOD', departments: ['Floor'], pin: '222222' },
  { userId: 'hod3', name: 'HOD Bar', role: 'HOD', departments: ['Bar'], pin: '333333' },
  { userId: 'hod4', name: 'HOD Cashier', role: 'HOD', departments: ['Cashier'], pin: '444444' },
  { userId: 'hod5', name: 'HOD Kitchen', role: 'HOD', departments: ['Kitchen'], pin: '555555' },
  { userId: 'hod6', name: 'HOD Finance', role: 'HOD', departments: ['Finance & Accounting'], pin: '666666' },
  { userId: 'hod7', name: 'HOD Driver', role: 'HOD', departments: ['Driver'], pin: '777777' },
  { userId: 'hod8', name: 'HOD Wholefood', role: 'HOD', departments: ['Wholefood'], pin: '888888' },
  { userId: 'hod9', name: 'HOD Engineering', role: 'HOD', departments: ['Engineering'], pin: '999999' },
  { userId: 'gm', name: 'GM', role: 'GM', departments: [], pin: '123123' }
];

// A full service wired to a MemoryRepo: 20+10 nominees, 11 users with known PINs, fake clock.
function makeWorld(opts) {
  const crypto = require('node:crypto');
  const { loadApp } = require('./load');
  const { MemoryRepo } = require('./MemoryRepo');
  const app = loadApp();
  const repo = new MemoryRepo();
  const clock = { t: 1000000 };
  const sha256Hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const mem = {};
  const kv = { get: (k) => mem[k] || null, put: (k, v) => { mem[k] = v; } };
  const random = Math.random;
  const sessions = app.createSessionStore(kv, random, app.DEFAULT_CONFIG.sessionTtlMs);
  (opts && opts.empty ? [] : makeNominees()).forEach((n) => {
    repo.saveNominee(n);
    repo.savePerson({ personId: n.personId, name: n.name });
  });
  USER_DEFS.forEach((u) => {
    const salt = 'salt-' + u.userId;
    repo.saveUser({
      userId: u.userId, name: u.name, role: u.role, departments: u.departments,
      salt, pinHash: app.hashPin(u.pin, salt, sha256Hex), failedCount: 0, lockedUntil: 0
    });
  });
  const service = app.createService({ repo, sessions, sha256Hex, now: () => clock.t, random });
  const pins = {};
  USER_DEFS.forEach((u) => { pins[u.userId] = u.pin; });
  const login = (userId) => service.login(userId, pins[userId]).token;
  const nid = (name, awardId) =>
    repo.listNominees().find((n) => n.name === name && (!awardId || n.awardId === awardId)).nomineeId;
  return { app, repo, service, clock, pins, login, nid, sha256Hex };
}

module.exports = { makeNominees, USER_DEFS, makeWorld };
