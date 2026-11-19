// In-memory Repo for tests. Same interface as SheetRepo; values are cloned in and out like sheet rows.
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

class MemoryRepo {
  constructor() {
    this.cfg = { phase: 'SETUP', deadlineText: '' };
    this.users = new Map();
    this.people = new Map();
    this.nominees = new Map();
    this.subs = new Map();
    this.mvps = [];
    this.finalists = {};
    this.picks = [];
    this.confirmedAt = null;
    this.log = [];
  }
  getConfig() { return clone(this.cfg); }
  setConfig(patch) { Object.assign(this.cfg, clone(patch)); }

  listUsers() { return [...this.users.values()].map(clone); }
  getUser(id) { return clone(this.users.get(id) || null); }
  saveUser(u) { this.users.set(u.userId, clone(u)); }

  listPeople() { return [...this.people.values()].map(clone); }
  savePerson(p) { this.people.set(p.personId, clone(p)); }

  listNominees(awardId) {
    return [...this.nominees.values()].filter((n) => !awardId || n.awardId === awardId).map(clone);
  }
  saveNominee(n) { this.nominees.set(n.nomineeId, clone(n)); }
  deleteNominee(id) { this.nominees.delete(id); }

  getHodSubmission(hodId) { return clone(this.subs.get(hodId) || null); }
  saveHodSubmission(sub, mvps) {
    this.subs.set(sub.hodId, clone(sub));
    this.mvps = this.mvps.filter((m) => m.hodId !== sub.hodId);
    mvps.forEach((m) => this.mvps.push({ hodId: sub.hodId, department: m.department, name: m.name }));
  }
  deleteHodSubmission(hodId) {
    this.subs.delete(hodId);
    this.mvps = this.mvps.filter((m) => m.hodId !== hodId);
  }
  listMvps() { return this.mvps.map(clone); }
  getVoteCounts(awardId) {
    const col = awardId === 'BOH' ? 'bohNomineeId' : 'fohNomineeId';
    return this.listNominees(awardId).map((n) => ({
      nomineeId: n.nomineeId,
      votes: [...this.subs.values()].filter((s) => s[col] === n.nomineeId).length
    }));
  }

  saveFinalists(awardId, rows) { this.finalists[awardId] = clone(rows); }
  listFinalists(awardId) { return clone(this.finalists[awardId] || []); }

  listGmPicks() { return this.picks.map(clone); }
  saveGmPick(p) {
    this.deleteGmPick(p.awardId, p.slot);
    this.picks.push(clone(p));
  }
  deleteGmPick(awardId, slot) {
    this.picks = this.picks.filter((p) => !(p.awardId === awardId && p.slot === slot));
  }
  getGmConfirmedAt() { return this.confirmedAt; }
  setGmConfirmedAt(ts) { this.confirmedAt = ts; }

  appendLog(row) { this.log.push(clone(row)); }
  withLock(fn) { return fn(); }
}

module.exports = { MemoryRepo };
