// Repo on Google Sheets. One schema drives tab setup, reads and writes.
// Types: s = text (column is formatted as plain text), n = number or blank, b = boolean, l = list joined by "|".
var SHEET_SCHEMA = {
  Config: [{ k: 'key', t: 's' }, { k: 'value', t: 's' }],
  Users: [{ k: 'userId', t: 's' }, { k: 'name', t: 's' }, { k: 'role', t: 's' }, { k: 'departments', t: 'l' },
    { k: 'pinHash', t: 's' }, { k: 'salt', t: 's' }, { k: 'failedCount', t: 'n' }, { k: 'lockedUntil', t: 'n' }],
  People: [{ k: 'personId', t: 's' }, { k: 'name', t: 's' }],
  Nominees: [{ k: 'nomineeId', t: 's' }, { k: 'awardId', t: 's' }, { k: 'personId', t: 's' }, { k: 'name', t: 's' },
    { k: 'position', t: 's' }, { k: 'outlet', t: 's' }, { k: 'department', t: 's' }, { k: 'lateness', t: 'n' },
    { k: 'unpaidLeave', t: 'n' }, { k: 'lastAward', t: 's' }, { k: 'lastWarningLetter', t: 's' },
    { k: 'whyNominated', t: 's' }, { k: 'photoUrl', t: 's' }, { k: 'resigned', t: 'b' }],
  // Column C = BOH vote, D = FOH vote. Tallies formulas count these columns.
  HodSubmissions: [{ k: 'hodId', t: 's' }, { k: 'submittedAt', t: 'n' }, { k: 'bohNomineeId', t: 's' },
    { k: 'fohNomineeId', t: 's' }],
  Mvps: [{ k: 'hodId', t: 's' }, { k: 'department', t: 's' }, { k: 'name', t: 's' }],
  Tallies: [{ k: 'nomineeId', t: 's' }, { k: 'awardId', t: 's' }, { k: 'name', t: 's' }, { k: 'votes', t: 'n' }],
  Finalists: [{ k: 'awardId', t: 's' }, { k: 'nomineeId', t: 's' }, { k: 'votes', t: 'n' }, { k: 'rank', t: 'n' }],
  GmPicks: [{ k: 'awardId', t: 's' }, { k: 'slot', t: 's' }, { k: 'nomineeId', t: 's' }, { k: 'personId', t: 's' },
    { k: 'pickedAt', t: 'n' }],
  Log: [{ k: 'ts', t: 'n' }, { k: 'actor', t: 's' }, { k: 'action', t: 's' }, { k: 'detail', t: 's' }]
};

var CONFIG_NUMERIC = ['redLatenessAbove', 'redUnpaidAbove', 'yellowAtLeast', 'maxFailures', 'lockMs',
  'sessionTtlMs', 'mvpMaxLen', 'gmConfirmedAt'];

function toCell(v, t) {
  if (t === 'n') return v === null || v === undefined || v === '' ? '' : Number(v);
  if (t === 'b') return !!v;
  if (t === 'l') return sanitizeCell((v || []).join('|'));
  return sanitizeCell(v === null || v === undefined ? '' : String(v));
}

function fromCell(v, t) {
  if (t === 'n') return v === '' || v === null || v === undefined ? null : Number(v);
  if (t === 'b') return v === true || String(v).toLowerCase() === 'true';
  if (t === 'l') return String(v === null || v === undefined ? '' : v).split('|').filter(function (x) { return x; })
    .map(unsanitizeCell);
  return unsanitizeCell(String(v === null || v === undefined ? '' : v));
}

function createSheetRepo(ss) {
  function sheet(tab) {
    var s = ss.getSheetByName(tab);
    if (!s) throw new Error('Missing tab: ' + tab + ' (run setupSpreadsheet)');
    return s;
  }
  function cols(tab) { return SHEET_SCHEMA[tab]; }

  // [{rowNumber, obj}] for every non-empty data row.
  function readRows(tab) {
    var c = cols(tab);
    var vals = sheet(tab).getDataRange().getValues();
    var out = [];
    for (var r = 1; r < vals.length; r++) {
      var o = {};
      var any = false;
      for (var i = 0; i < c.length; i++) {
        if (vals[r][i] !== '' && vals[r][i] !== null) any = true;
        o[c[i].k] = fromCell(vals[r][i], c[i].t);
      }
      if (any) out.push({ rowNumber: r + 1, obj: o });
    }
    return out;
  }
  function read(tab) { return readRows(tab).map(function (x) { return x.obj; }); }
  function rowValues(tab, obj) {
    return cols(tab).map(function (c) { return toCell(obj[c.k], c.t); });
  }
  function writeRow(tab, rowNumber, obj) {
    var s = sheet(tab);
    var n = cols(tab).length;
    s.getRange(rowNumber, 1, 1, n).setValues([rowValues(tab, obj)]);
  }
  function appendRow(tab, obj) { writeRow(tab, sheet(tab).getLastRow() + 1, obj); }
  function upsert(tab, match, obj) {
    var hit = readRows(tab).filter(function (x) { return match(x.obj); })[0];
    if (hit) writeRow(tab, hit.rowNumber, obj); else appendRow(tab, obj);
  }
  function removeWhere(tab, match) {
    var hits = readRows(tab).filter(function (x) { return match(x.obj); });
    for (var i = hits.length - 1; i >= 0; i--) sheet(tab).deleteRow(hits[i].rowNumber); // bottom up
  }

  // ---- Config (key/value) ----
  function configMap() {
    var m = {};
    readRows('Config').forEach(function (x) { m[x.obj.key] = x.obj.value; });
    return m;
  }
  function getConfig() {
    var m = configMap();
    var out = {};
    Object.keys(m).forEach(function (k) {
      if (CONFIG_NUMERIC.indexOf(k) >= 0) { if (m[k] !== '') out[k] = Number(m[k]); } else out[k] = m[k];
    });
    return out;
  }
  function setConfig(patch) {
    Object.keys(patch).forEach(function (k) {
      upsert('Config', function (o) { return o.key === k; }, { key: k, value: String(patch[k]) });
    });
  }

  // ---- Tallies: one row per BOH/FOH nominee; the votes column is a COUNTIF formula ----
  function ensureTally(n) {
    if (n.awardId !== 'BOH' && n.awardId !== 'FOH') return;
    var hit = readRows('Tallies').filter(function (x) { return x.obj.nomineeId === n.nomineeId; })[0];
    var s = sheet('Tallies');
    if (hit) {
      s.getRange(hit.rowNumber, 2, 1, 2).setValues([[toCell(n.awardId, 's'), toCell(n.name, 's')]]);
      return;
    }
    var row = s.getLastRow() + 1;
    var col = n.awardId === 'BOH' ? 'C' : 'D';
    s.getRange(row, 1, 1, 4).setValues([[toCell(n.nomineeId, 's'), n.awardId, toCell(n.name, 's'),
      '=COUNTIF(HodSubmissions!' + col + ':' + col + ',A' + row + ')']]);
  }

  var repo = {
    getConfig: getConfig,
    setConfig: setConfig,

    listUsers: function () { return read('Users'); },
    getUser: function (id) { return read('Users').filter(function (u) { return u.userId === id; })[0] || null; },
    saveUser: function (u) { upsert('Users', function (o) { return o.userId === u.userId; }, u); },

    listPeople: function () { return read('People'); },
    savePerson: function (p) { upsert('People', function (o) { return o.personId === p.personId; }, p); },

    listNominees: function (awardId) {
      return read('Nominees').filter(function (n) { return !awardId || n.awardId === awardId; });
    },
    saveNominee: function (n) {
      upsert('Nominees', function (o) { return o.nomineeId === n.nomineeId; }, n);
      ensureTally(n);
    },
    deleteNominee: function (id) {
      removeWhere('Nominees', function (o) { return o.nomineeId === id; });
      removeWhere('Tallies', function (o) { return o.nomineeId === id; });
    },

    getHodSubmission: function (hodId) {
      return read('HodSubmissions').filter(function (s) { return s.hodId === hodId; })[0] || null;
    },
    saveHodSubmission: function (sub, mvps) {
      upsert('HodSubmissions', function (o) { return o.hodId === sub.hodId; }, sub);
      removeWhere('Mvps', function (o) { return o.hodId === sub.hodId; });
      mvps.forEach(function (m) { appendRow('Mvps', { hodId: sub.hodId, department: m.department, name: m.name }); });
    },
    deleteHodSubmission: function (hodId) {
      removeWhere('HodSubmissions', function (o) { return o.hodId === hodId; });
      removeWhere('Mvps', function (o) { return o.hodId === hodId; });
    },
    listMvps: function () { return read('Mvps'); },
    getVoteCounts: function (awardId) {
      SpreadsheetApp.flush(); // make sure COUNTIF formulas have recalculated
      return read('Tallies').filter(function (t) { return t.awardId === awardId; })
        .map(function (t) { return { nomineeId: t.nomineeId, votes: t.votes || 0 }; });
    },

    saveFinalists: function (awardId, rows) {
      removeWhere('Finalists', function (o) { return o.awardId === awardId; });
      rows.forEach(function (r) {
        appendRow('Finalists', { awardId: awardId, nomineeId: r.nomineeId, votes: r.votes, rank: r.rank });
      });
    },
    listFinalists: function (awardId) {
      return read('Finalists').filter(function (f) { return f.awardId === awardId; })
        .map(function (f) { return { nomineeId: f.nomineeId, votes: f.votes, rank: f.rank }; });
    },

    listGmPicks: function () { return read('GmPicks'); },
    saveGmPick: function (p) {
      upsert('GmPicks', function (o) { return o.awardId === p.awardId && o.slot === p.slot; }, p);
    },
    deleteGmPick: function (awardId, slot) {
      removeWhere('GmPicks', function (o) { return o.awardId === awardId && o.slot === slot; });
    },
    getGmConfirmedAt: function () {
      var v = configMap().gmConfirmedAt;
      return v === undefined || v === '' ? null : Number(v);
    },
    setGmConfirmedAt: function (ts) { setConfig({ gmConfirmedAt: ts === null ? '' : ts }); },

    appendLog: function (row) { appendRow('Log', row); },
    withLock: function (fn) {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        return fn();
      } finally {
        SpreadsheetApp.flush();
        lock.releaseLock();
      }
    }
  };
  return repo;
}
