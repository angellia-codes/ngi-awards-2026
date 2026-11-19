// Run `setup` once from the Apps Script editor (the sheet is the bound one, or the SHEET_ID script property).
function setup() { setupSpreadsheet(getSpreadsheet()); }

// Creates the tabs, headers, text formats and default config.
function setupSpreadsheet(ss) {
  Object.keys(SHEET_SCHEMA).forEach(function (tab) {
    var s = ss.getSheetByName(tab) || ss.insertSheet(tab);
    var c = SHEET_SCHEMA[tab];
    s.getRange(1, 1, 1, c.length).setValues([c.map(function (x) { return x.k; })]).setFontWeight('bold');
    s.setFrozenRows(1);
    c.forEach(function (col, i) {
      // Plain text so PINs ("012345"), hashes and names like "=x" or "1/2" are never reinterpreted.
      if (col.t === 's' || col.t === 'l') s.getRange(1, i + 1, s.getMaxRows(), 1).setNumberFormat('@');
    });
  });
  var cfg = createSheetRepo(ss);
  var existing = cfg.getConfig();
  var defaults = Object.assign({ phase: 'SETUP', deadlineText: '' }, DEFAULT_CONFIG);
  Object.keys(defaults).forEach(function (k) {
    if (existing[k] === undefined) cfg.setConfig(Object.fromEntries([[k, defaults[k]]]));
  });
}

// Run once in the editor: creates the first HR Admin and logs the PIN. Refuses if an HR Admin already exists.
function createFirstAdmin(name) {
  var repo = createSheetRepo(getSpreadsheet());
  if (repo.listUsers().some(function (u) { return u.role === 'HR_ADMIN'; })) {
    throw new Error('An HR Admin already exists. Use the app to manage logins.');
  }
  var pin = generatePin(webRandom);
  var salt = Utilities.getUuid();
  repo.saveUser({ userId: 'hr_' + Utilities.getUuid().slice(0, 8), name: name || 'HR Admin', role: 'HR_ADMIN',
    departments: [], salt: salt, pinHash: hashPin(pin, salt, webSha256Hex), failedCount: 0, lockedUntil: 0 });
  Logger.log('First HR Admin PIN (shown once): ' + pin);
  return pin;
}

function runRepoContractOnScratchSheet() {
  var ss = SpreadsheetApp.create('Nourish Awards scratch (delete me)');
  setupSpreadsheet(ss);
  var failures = runRepoContract(createSheetRepo(ss));
  Logger.log(ss.getUrl());
  return failures.length ? failures.join('; ') : '0 failures';
}
