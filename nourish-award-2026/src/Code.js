// Web entry points. Everything the browser can call goes through api() -> dispatch().
// true = first argument is the session token; false = public (login screen).
var API_METHODS = {
  listLoginNames: false, login: false,
  getHodBallot: true, submitHod: true,
  getGmBoard: true, saveGmPick: true, clearGmPick: true, confirmGm: true,
  adminOverview: true, adminAdvancePhase: true, adminResetHod: true, adminResetGm: true,
  adminSaveNominee: true, adminDeleteNominee: true, adminListNominees: true, adminImportDetail: true,
  adminListUsers: true, adminSaveUser: true, adminSetDeadlineText: true, adminResetPin: true, adminResults: true
};

function dispatch(service, method, token, args) {
  try {
    if (method === 'getI18n') {
      return { ok: true, i18n: I18N, departments: DEPARTMENTS, outlets: SB_OUTLETS, awardIds: AWARD_IDS };
    }
    if (!Object.prototype.hasOwnProperty.call(API_METHODS, method)) return { ok: false, error: 'UNKNOWN_METHOD' };
    var list = Array.isArray(args) ? args : (args === undefined || args === null ? [] : [args]);
    var r = service[method].apply(null, API_METHODS[method] ? [token].concat(list) : list);
    return Array.isArray(r) ? { ok: true, names: r } : r;
  } catch (e) {
    console.error('api ' + method + ': ' + (e && e.stack ? e.stack : e)); // server log only, never sent to the browser
    return { ok: false, error: 'SERVER_ERROR' };
  }
}

// ---- Apps Script only below ----
function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

// UUIDs are random; Math.random is not good enough for PINs and session tokens.
function webRandom() {
  return parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) / 0x1000000000000;
}

function webSha256Hex(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function doGet() {
  return HtmlService.createTemplateFromFile('client/index').evaluate()
    .setTitle('Nourish Awards 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function api(method, token, args) {
  var cache = CacheService.getScriptCache();
  var kv = {
    get: function (k) { return cache.get(k); },
    put: function (k, v, ttlSec) { cache.put(k, v, Math.min(ttlSec, 21600)); } // CacheService max is 6 hours
  };
  var service = createService({
    repo: createSheetRepo(getSpreadsheet()),
    sessions: createSessionStore(kv, webRandom, DEFAULT_CONFIG.sessionTtlMs),
    sha256Hex: webSha256Hex,
    now: function () { return Date.now(); },
    random: webRandom
  });
  return dispatch(service, method, token, args);
}
