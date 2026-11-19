// Constants. Top-level uses only `var`/`function` so Apps Script and the Node vm loader share globals.
var DEPARTMENTS = ['Floor', 'Bar', 'Cashier', 'Kitchen', 'Kitchen The Bakery', 'HR & Security',
  'Finance & Accounting', 'Driver', 'Wholefood', 'Engineering'];
var SB_OUTLETS = ['Nourish Ungasan', 'Nourish Uluwatu', 'Nourish Berawa'];
var PHASES = ['SETUP', 'HOD_OPEN', 'HOD_CLOSED', 'GM_OPEN', 'DONE'];
var AWARD_IDS = ['BOH', 'FOH', 'BREAKTHROUGH', 'UNSUNG_HERO', 'NOURISH_HEART', 'SOCIAL_BUTTERFLY'];
var DEFAULT_CONFIG = {
  redLatenessAbove: 3, redUnpaidAbove: 3, yellowAtLeast: 1,
  maxFailures: 5, lockMs: 900000, sessionTtlMs: 21600000, mvpMaxLen: 80
};
var ERROR_CODES = ['WRONG_PHASE', 'ALREADY_SUBMITTED', 'BAD_NOMINEE', 'NOT_VOTABLE', 'MVP_MISSING',
  'MVP_TOO_LONG', 'NOT_FINALIST', 'WRONG_AWARD', 'WRONG_OUTLET', 'PERSON_ALREADY_PICKED', 'INCOMPLETE',
  'GM_CONFIRMED', 'FORBIDDEN', 'BAD_PIN', 'LOCKED', 'UNKNOWN_USER', 'UNKNOWN_METHOD', 'SERVER_ERROR',
  'NOT_LOGGED_IN'];
var REASON_KEYS = ['flag.red.lateness', 'flag.red.unpaid', 'flag.resigned', 'flag.nodata'];
