# Nourish Awards 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Nourish Awards 2026 voting and submission web app (1 HR Admin, 9 HODs, 1 GM) that decides all 18 winners.

**Architecture:** Pure-JS rule modules (flags, finalists, auth, validation) plus a `Service` layer that talks to a `Repo` interface. Tests run in Node against an in-memory repo; `SheetRepo` implements the same interface on Google Sheets and is checked by a shared contract test. `Code.js` exposes `doGet` and one `api()` dispatcher. Screens are designed in Superdesign, then implemented as HtmlService pages.

**Tech Stack:** Google Apps Script (V8) web app, Google Sheets, clasp, Node 18+ with the built-in `node --test` runner. No npm dependencies.

**Spec:** `/home/claude/docs/superpowers/specs/2026-11-18-nourish-awards-2026-design.md` (also in the Nourish Award 2026 project as `claude/nourish-awards-2026-design.md`). Project root for this plan: `/home/claude/nourish-awards-2026/`; all paths below are relative to it.

## Global Constraints

- Google Apps Script web app + Google Sheets. Voters need no Google login: they pick their name and enter a personal PIN.
- PINs are 6 digits, stored hashed (salted SHA-256) as text, never in plain text. 5 failed attempts lock a login for 15 minutes.
- Every write runs under `repo.withLock` (script lock); the "already submitted" check happens inside the lock.
- Top-level code in `src/*.js` uses only `function` and `var` declarations (Apps Script globals; the Node loader evaluates all files in one `vm` context).
- 10 departments, exactly: Floor, Bar, Cashier, Kitchen, Kitchen The Bakery, HR & Security, Finance & Accounting, Driver, Wholefood, Engineering.
- Awards: BOH (10 nominees) and FOH (10 nominees): HODs vote, GM picks 1 of the top 3. MVP of Department: HOD types a name, final. Breakthrough, Unsung Hero, Nourish Heart: HR nominees, GM picks 1. Social Butterfly: HR nominees from Nourish Ungasan, Nourish Uluwatu, Nourish Berawa; GM picks 1 per outlet. Total 18 winners, 8 GM decisions.
- Flags: red = lateness above 3 or unpaid leave above 3 (HODs cannot vote); yellow = has a lateness or unpaid-leave record and is not red; green = lateness 0 and unpaid leave 0; grey "Resigned" (HODs cannot vote). Thresholds live in the Config tab.
- Finalists = nominees with HOD votes >= the 3rd-highest count, minimum 1 vote; ties for 3rd all go through.
- One award per person across GM decisions; MVP of Department is exempt.
- Phases are manual (HR Admin): SETUP -> HOD_OPEN -> HOD_CLOSED -> GM_OPEN -> DONE. The deadline text is display-only.
- An HOD submission (BOH vote, FOH vote, MVP name(s)) is saved once, together, and is final. The server rejects a second one. The thank-you screen shows no choices. HR Admin can reset one HOD (logged).
- The GM can change picks until "Confirm winners", then it locks; HR Admin can reset.
- HR Admin sees turnout only (who submitted), never choices. The GM sees HOD vote counts next to finalists.
- UI has an ID/EN toggle, English by default, remembered on the device. Nominee data is not translated. Mobile-first.

## Review Focus

- An HOD double-taps Submit or submits from two tabs: exactly one submission is saved (Task 6).
- An MVP name or nominee note that starts with `=`, `+`, `-` or `@` is written to the sheet as text, never evaluated as a formula (Task 9).
- A PIN with leading zeros or stray spaces (`" 012345 "`) must work; a spreadsheet must not turn it into a number (Task 4, Task 9).
- Fewer than 3 nominees have votes, or nobody voted: the GM board shows an empty category with a clear message, and Confirm is blocked with `INCOMPLETE` (Task 7).
- Running the sheet import twice must not duplicate nominees or people (Task 8).

## File Structure

| File | Responsibility |
|---|---|
| `src/Config.js` | Constants: awards, departments, outlets, phases, default thresholds, error and reason codes |
| `src/Flags.js` | `computeFlag` |
| `src/Finalists.js` | `computeFinalists` |
| `src/Auth.js` | PIN normalising, hashing, lockout, sessions |
| `src/Rules.js` | HOD and GM validators, phase order |
| `src/Service.js` | All use-cases, built on `Repo` |
| `src/Import.js` | Parse the BEOTM "Detail" tab into nominees |
| `src/Sanitize.js` | `sanitizeCell` |
| `src/SheetRepo.js`, `src/Setup.js` | `Repo` on Google Sheets; tab and formula setup |
| `src/RepoContract.js` | `runRepoContract(repo)`: same checks for both repos |
| `src/I18n.js` | `I18N = { en: {...}, id: {...} }` |
| `src/Code.js` | `doGet`, `include`, `dispatch`, `api` |
| `src/client/index.html`, `styles.html`, `app.html` | UI (from Superdesign) |
| `test/load.js`, `test/MemoryRepo.js`, `test/fixtures.js`, `test/*.test.js` | Node tests |

---

### Task 1: Scaffold, constants, test loader

**Files:**
- Create: `package.json` (script `"test": "node --test test/"`), `appsscript.json` (`webapp: { executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS" }`, runtime V8), `.gitignore` (`.clasp.json`, `node_modules`), `src/Config.js`, `test/load.js`, `test/config.test.js`

**Interfaces:**
- Produces: `DEPARTMENTS: string[10]`, `SB_OUTLETS = ['Nourish Ungasan','Nourish Uluwatu','Nourish Berawa']`, `PHASES: string[]`, `AWARD_IDS = ['BOH','FOH','BREAKTHROUGH','UNSUNG_HERO','NOURISH_HEART','SOCIAL_BUTTERFLY']`, `DEFAULT_CONFIG = {redLatenessAbove:3, redUnpaidAbove:3, yellowAtLeast:1, maxFailures:5, lockMs:900000, sessionTtlMs:21600000, mvpMaxLen:80}`, `ERROR_CODES: string[]`, `REASON_KEYS: string[]` (`flag.red.lateness`, `flag.red.unpaid`, `flag.resigned`, `flag.nodata`); `loadApp(): object` in `test/load.js` (reads `src/*.js` in a fixed order into one `vm` context and returns it).

- [ ] **Step 1:** `git init` in the project root. Write `test/config.test.js`: `DEPARTMENTS.length === 10`, contains `'Kitchen The Bakery'` and `'HR & Security'`; `PHASES` deep-equals `['SETUP','HOD_OPEN','HOD_CLOSED','GM_OPEN','DONE']`; `SB_OUTLETS.length === 3`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (`DEPARTMENTS` is not defined).
- [ ] **Step 3:** Implement `src/Config.js` and `test/load.js` with the values above. `ERROR_CODES` lists every code used in Tasks 5-7 (`WRONG_PHASE`, `ALREADY_SUBMITTED`, `BAD_NOMINEE`, `NOT_VOTABLE`, `MVP_MISSING`, `MVP_TOO_LONG`, `NOT_FINALIST`, `WRONG_AWARD`, `WRONG_OUTLET`, `PERSON_ALREADY_PICKED`, `INCOMPLETE`, `GM_CONFIRMED`, `FORBIDDEN`, `BAD_PIN`, `LOCKED`, `UNKNOWN_USER`, `UNKNOWN_METHOD`, `SERVER_ERROR`, `NOT_LOGGED_IN`).
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `chore: scaffold project and constants`.

### Task 2: Flags

**Files:** Create `src/Flags.js`, `test/flags.test.js`

**Interfaces:**
- Produces: `computeFlag(n: {lateness:number|null, unpaidLeave:number|null, resigned:boolean}, cfg: {redLatenessAbove:number, redUnpaidAbove:number, yellowAtLeast:number}): {color:'red'|'yellow'|'green'|'grey', canVote:boolean, reasonKey:string|null}`

- [ ] **Step 1:** Write tests (cfg = `DEFAULT_CONFIG`): `{4,3}` (Cloudia) -> `red`, `canVote:false`, `flag.red.lateness`; `{2,4}` (Kadek Riska) -> `red`, `flag.red.unpaid`; `{3,0}` (Norta Ota) -> `yellow`, `canVote:true`; `{1,0}` and `{0,1}` -> `yellow`; `{0,0}` -> `green`; `{0,0,resigned:true}` -> `grey`, `canVote:false`, `flag.resigned`; `{null,null,resigned:false}` -> `grey`, `canVote:true`, `flag.nodata`; with `redLatenessAbove:5`, `{4,0}` -> `yellow`.
- [ ] **Step 2:** Run `node --test test/flags.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `computeFlag` in `src/Flags.js`. Order: resigned, then no data, then red, then yellow, then green. Add `'Flags.js'` to the loader order.
- [ ] **Step 4:** Run it again. Expected: PASS.
- [ ] **Step 5:** Commit `feat: attendance flags`.

### Task 3: Finalists

**Files:** Create `src/Finalists.js`, `test/finalists.test.js`

**Interfaces:**
- Produces: `computeFinalists(entries: Array<{nomineeId:string, votes:number}>, size?: number = 3): Array<{nomineeId:string, votes:number, rank:number}>` (competition ranking, so ties share a rank, ordered by votes descending).

- [ ] **Step 1:** Write tests: votes `[5,4,3,3,1]` -> 4 finalists, ranks `1,2,3,3`; `[4,3,1,1]` -> 4 finalists; only 2 nominees with votes -> 2 finalists; all 0 votes -> `[]`; ten nominees tied at 2 votes -> all ten; nominees with 0 votes are never included even when 0 ties for 3rd.
- [ ] **Step 2:** Run `node --test test/finalists.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement per the Global Constraints rule (threshold = 3rd-highest count among nominees with at least 1 vote).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: top-3 finalists with ties`.

### Task 4: Auth primitives

**Files:** Create `src/Auth.js`, `test/auth.test.js`

**Interfaces:**
- Produces:
  - `normalizePin(raw: any): string|null` (trims; returns the 6-digit string or `null`)
  - `generatePin(random: () => number): string`
  - `hashPin(pin: string, salt: string, sha256Hex: (s:string) => string): string`
  - `verifyPin(pin: string, user: {pinHash:string, salt:string}, sha256Hex): boolean`
  - `checkLockout(user: {lockedUntil:number}, nowMs: number): {locked:boolean, until:number}`
  - `recordFailure(user, nowMs: number, cfg): user` (copy with `failedCount`, `lockedUntil`)
  - `recordSuccess(user): user`
  - `createSessionStore(kv: {get(k):string|null, put(k:string, v:string, ttlSec:number):void}, random): {create(userId:string, nowMs:number): string, resolve(token:string, nowMs:number): string|null}`

- [ ] **Step 1:** Write tests: `normalizePin(' 012345 ') === '012345'`; `normalizePin('12345')` and `normalizePin('abcdef')` are `null`; `generatePin(() => 0) === '000000'`; same pin with different salts hashes differently; `verifyPin` true for the right PIN and false for the wrong one (use Node `crypto` as `sha256Hex`); 5 `recordFailure` calls set `lockedUntil = now + 900000`, and `checkLockout` is locked until then, then free; `recordSuccess` resets `failedCount` to 0; a session resolves before the TTL and returns `null` after 6 hours.
- [ ] **Step 2:** Run `node --test test/auth.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `src/Auth.js`; hash input is `salt + ':' + pin`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: PIN auth primitives`.

### Task 5: Rules (validators and phases)

**Files:** Create `src/Rules.js`, `test/rules.test.js`

**Interfaces:**
- Consumes: `computeFlag`, `DEFAULT_CONFIG`, `PHASES`, `SB_OUTLETS`.
- Produces:
  - `Nominee = {nomineeId, awardId, personId, name, position, outlet, department, lateness:number|null, unpaidLeave:number|null, lastAward:string, lastWarningLetter:string, whyNominated:string, photoUrl:string, resigned:boolean}`
  - `nextPhase(current: string): string|null`
  - `requiredGmDecisions(): Array<{awardId:string, slot:string}>` (8 entries; `slot` is the outlet for Social Butterfly, otherwise `''`)
  - `validateHodSubmission(a: {hod:{userId, departments:string[]}, payload:{bohNomineeId, fohNomineeId, mvps:{[department:string]:string}}, nominees:Nominee[], existing:object|null, phase:string, cfg}): {ok:true, mvps:Array<{department,name}>} | {ok:false, error:string}`
  - `validateGmPicks(a: {picks:Array<{awardId,slot,nomineeId}>, nominees:Nominee[], finalists:{BOH:string[], FOH:string[]}, requireComplete:boolean}): {ok:true} | {ok:false, error:string, detail?:string}`

- [ ] **Step 1:** Write tests using the fixtures from Task 6 Step 1 (create `test/fixtures.js` here if it does not exist yet): `nextPhase('SETUP') === 'HOD_OPEN'`, `nextPhase('DONE') === null`; `requiredGmDecisions().length === 8`; HOD submit: valid -> ok with whitespace-collapsed MVP names; phase `HOD_CLOSED` -> `WRONG_PHASE`; `existing` set -> `ALREADY_SUBMITTED`; red nominee -> `NOT_VOTABLE`; Hendra -> `NOT_VOTABLE`; an FOH id in the BOH slot -> `BAD_NOMINEE`; Angel (two departments) with one MVP missing -> `MVP_MISSING`; 81-character name -> `MVP_TOO_LONG`. GM picks: a non-finalist BOH -> `NOT_FINALIST`; same `personId` picked for NOURISH_HEART and BREAKTHROUGH -> `PERSON_ALREADY_PICKED` (detail names the other award); a Berawa nominee in the Ungasan slot -> `WRONG_OUTLET`; `requireComplete` with 7 of 8 picks -> `INCOMPLETE`.
- [ ] **Step 2:** Run `node --test test/rules.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement the signatures above in `src/Rules.js`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: HOD and GM validation rules`.

### Task 6: Service, part 1 (login, HOD ballot, submit, admin phases)

**Files:** Create `src/Service.js`, `test/MemoryRepo.js`, `test/fixtures.js`, `test/service.hod.test.js`

**Interfaces:**
- Consumes: Tasks 2-5.
- Produces (`Repo`, implemented by `MemoryRepo` here and by `SheetRepo` in Task 9):
  - `getConfig(): Config` where `Config = DEFAULT_CONFIG & {phase:string, deadlineText:string}`; `setConfig(patch)`
  - `listUsers(): User[]`; `getUser(id)`; `saveUser(u)` where `User = {userId, name, role:'HR_ADMIN'|'HOD'|'GM', departments:string[], pinHash, salt, failedCount, lockedUntil}`
  - `listPeople()`; `savePerson({personId, name})`
  - `listNominees(awardId?)`; `saveNominee(n)`; `deleteNominee(id)`
  - `getHodSubmission(hodId): {hodId, submittedAt, bohNomineeId, fohNomineeId}|null`; `saveHodSubmission(sub, mvps)`; `deleteHodSubmission(hodId)`; `listMvps(): Array<{hodId, department, name}>`
  - `getVoteCounts(awardId): Array<{nomineeId, votes}>`
  - `saveFinalists(awardId, rows)`; `listFinalists(awardId): Array<{nomineeId, votes, rank}>`
  - `listGmPicks(): Array<{awardId, slot, nomineeId, personId, pickedAt}>`; `saveGmPick(p)`; `deleteGmPick(awardId, slot)`; `getGmConfirmedAt(): number|null`; `setGmConfirmedAt(ts|null)`
  - `appendLog({ts, actor, action, detail})`; `withLock(fn)`
- Produces (`createService(deps: {repo, sessions, sha256Hex, now: () => number, random: () => number})`), every method except `listLoginNames` and `login` takes `token` first and returns `{ok:true, ...} | {ok:false, error}`:
  - `listLoginNames(): Array<{userId, name}>`
  - `login(userId, rawPin): {ok:true, token, role, name, departments} | {ok:false, error}`
  - `getHodBallot(token): {phase, deadlineText, submitted:boolean, submittedAt?:number, departments:string[], boh:Card[], foh:Card[]}` where `Card = Nominee & {flag: Flag}`; after submission `boh`/`foh` are empty
  - `submitHod(token, payload)`
  - `adminOverview(token): {phase, turnout:Array<{userId, name, submitted, submittedAt?}>, gmConfirmedAt}`
  - `adminAdvancePhase(token)` (on `HOD_OPEN -> HOD_CLOSED` it stores finalists for BOH and FOH)
  - `adminResetHod(token, hodId)` (deletes the submission and logs it)
  - `adminSaveNominee(token, nominee)` (a Social Butterfly nominee whose outlet is not in `SB_OUTLETS` -> `WRONG_OUTLET`), `adminDeleteNominee(token, nomineeId)`, `adminListNominees(token, awardId)`
  - `adminSaveUser(token, {userId?, name, role, departments})`, `adminSetDeadlineText(token, text)`
  - `adminResetPin(token, userId): {ok:true, pin}` (the only place a plaintext PIN is returned)

- [ ] **Step 1:** Create `test/fixtures.js` with `makeWorld()`: the 20 BOH/FOH nominees from the spec (names and Lateness/Unpaid Leave values from the BEOTM Detail tab plus Hendra with `resigned:true` and `null` attendance), 11 users (1 HR Admin, 9 HODs, 1 GM; one HOD with departments `['HR & Security','Kitchen The Bakery']`), PINs known to the test, and a `MemoryRepo`, `MemoryKV`, fake clock. Write `test/service.hod.test.js`: login ok; wrong PIN -> `BAD_PIN`; 5 wrong PINs -> `LOCKED`; `" 012345 "` logs in; an HOD calling `adminOverview` -> `FORBIDDEN`; the GM calling `submitHod` -> `FORBIDDEN`; `getHodBallot` returns 10 + 10 cards with `canVote:false` for exactly the 6 red nominees and Hendra; a valid `submitHod` stores one submission and its MVPs; **two `submitHod` calls in a row** -> the second is `ALREADY_SUBMITTED` and the repo holds exactly one submission; a red nominee -> `NOT_VOTABLE` and nothing saved; `HOD_CLOSED` -> `WRONG_PHASE`; `getHodBallot` after submit returns `submitted:true`, `submittedAt`, and no card or choice fields; `adminAdvancePhase` moves SETUP -> HOD_OPEN -> HOD_CLOSED, stores finalists, and cannot skip a phase; `adminResetHod` removes the submission, writes a log row, and the HOD can submit again; `adminOverview.turnout` has 9 HOD rows and no vote fields; a Social Butterfly nominee at `The Bakery Uluwatu` -> `WRONG_OUTLET`; `adminSaveUser` creates a user who can then be given a PIN with `adminResetPin`; `adminSetDeadlineText` shows up in `getHodBallot.deadlineText`.
- [ ] **Step 2:** Run `node --test test/service.hod.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `MemoryRepo` (counts votes from submissions) and `createService` in `src/Service.js`. Every mutating method runs inside `repo.withLock`, with the "already submitted" check inside it. Role guard: a private `requireRole(token, roles)` helper.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: service for login, HOD submission, admin phases`.

### Task 7: Service, part 2 (GM board, picks, confirm, results)

**Files:** Modify `src/Service.js`; Create `test/service.gm.test.js`

**Interfaces:**
- Consumes: Task 6 `Repo` and service.
- Produces:
  - `getGmBoard(token): {phase, confirmedAt:number|null, decisions:Array<{awardId, slot, options:Array<Nominee & {flag?:Flag}>, votes?:{[nomineeId:string]:number}, pickedNomineeId:string|null}>}` (BOH/FOH options are the stored finalists with HOD vote counts; GM-award options are all nominees, with `slot` = outlet for Social Butterfly)
  - `saveGmPick(token, {awardId, slot, nomineeId})`; `clearGmPick(token, {awardId, slot})`; `confirmGm(token)`
  - `adminResetGm(token)`
  - `adminResults(token): {winners:Array<{awardId, slot, nominee:Nominee}>, mvps:Array<{department, name, hodName}>}` (available once the GM has confirmed)

- [ ] **Step 1:** Write tests on a world advanced to `GM_OPEN`: the GM before `GM_OPEN` -> `WRONG_PHASE`; a non-finalist BOH -> `NOT_FINALIST`; picking the same person for BOH and NOURISH_HEART -> `PERSON_ALREADY_PICKED`; `clearGmPick` on the earlier pick frees the person; `confirmGm` with 7 of 8 picks -> `INCOMPLETE`; with all 8 it sets `confirmedAt`, then `saveGmPick` -> `GM_CONFIRMED`; `adminResetGm` unlocks; `adminResults` returns 8 winners and 10 MVPs (18 in total); **a BOH category with no votes** -> its decision has `options: []` and `confirmGm` -> `INCOMPLETE`; the board's BOH/FOH vote counts match the stored finalists; an HOD calling `getGmBoard` -> `FORBIDDEN`.
- [ ] **Step 2:** Run `node --test test/service.gm.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement in `src/Service.js` using `validateGmPicks` (pass `requireComplete:true` only for confirm). Moving to `DONE` happens in `confirmGm`.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: GM board, picks, confirm, results`.

### Task 8: Import from the BEOTM "Detail" tab

**Files:** Create `src/Import.js`, `test/import.test.js`, `test/fixtures/detail-rows.js` (the 19 rows from the live sheet: spreadsheet `1gOJBG4YrBQT4DlO0gkNDWki-gIlRhqRNCToW4fZ3SHE`, tab "Detail", header row `NO, Period, Employee, Position, Outlet, Department, Lateness, Unpaid Leave, Last Award, Last Warning Letter`, with the "BACK OF THE HOUSE" and "FRONT OF THE HOUSE" section rows)

**Interfaces:**
- Produces:
  - `mapDepartment(raw: string, position: string, outlet: string): string|null` (maps onto `DEPARTMENTS`; `Security` -> `HR & Security`; the Bakery Kitchen cook -> `Kitchen The Bakery`)
  - `parseDetailRows(values: string[][]): {nominees: Nominee[], warnings: string[]}` (BOH/FOH decided by section row; `nomineeId`/`personId` left empty)
  - `applyImport(repo, nominees: Nominee[]): {added:number, skipped:number}` (idempotent by `awardId` + normalised name; creates one `Person` per name)
  - Service method `adminImportDetail(token, values: string[][]): {ok:true, preview, added, skipped}`

- [ ] **Step 1:** Write tests: 10 BOH + 9 FOH parsed; `Security` -> `HR & Security`; Ni Luh Putu Arisyawati (`Cook The Bakery`, `The Bakery Kitchen`, `Kitchen`) -> `Kitchen The Bakery`; lateness parsed as a number (Andrean Kusuma = 7); blank Last Warning Letter -> `''`; unmappable department -> warning, not a crash; `applyImport` twice -> 19 nominees and 19 people; adding Hendra via `adminSaveNominee` with `resigned:true`, `lateness:null`, `unpaidLeave:null` gives 20 nominees (10 BOH + 10 FOH).
- [ ] **Step 2:** Run `node --test test/import.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `src/Import.js` (columns found by header name, not position) and `adminImportDetail`.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: import nominees from Detail tab`.

### Task 9: SheetRepo, setup, repo contract

**Files:** Create `src/Sanitize.js`, `src/SheetRepo.js`, `src/Setup.js`, `src/RepoContract.js`, `test/sanitize.test.js`, `test/repoContract.test.js`

**Interfaces:**
- Consumes: the `Repo` interface from Task 6.
- Produces:
  - `sanitizeCell(v: any): any` (strings starting with `=`, `+`, `-` or `@` get a leading `'`; non-strings are unchanged)
  - `createSheetRepo(spreadsheet: Spreadsheet): Repo`
  - `setupSpreadsheet(spreadsheet): void` (creates tabs Config, Users, People, Nominees, HodSubmissions, Mvps, Tallies, Finalists, GmPicks, Log with headers; sets text format on `pinHash`, `salt` and every free-text column; `Tallies` has one row per BOH/FOH nominee with `=COUNTIF(HodSubmissions!C:C, <nomineeId>)` or the FOH column)
  - `createFirstAdmin(name: string): string` (Apps Script editor function: creates the HR Admin user, logs the PIN once, returns it; needed because nobody can log in before one admin exists)
  - `runRepoContract(repo: Repo): string[]` (list of failures; empty means pass)
  - `runRepoContractOnScratchSheet(): string` (Apps Script editor function; creates a scratch spreadsheet and returns `"0 failures"`)

- [ ] **Step 1:** Write `test/sanitize.test.js`: `sanitizeCell('=SUM(A1)') === "'=SUM(A1)"`, same for `'+1'`, `'-1'`, `'@x'`; `'Budi'` and `42` unchanged. Write `test/repoContract.test.js`: `runRepoContract(new MemoryRepo())` returns `[]`. The contract covers: a saved nominee reads back with `lateness` as a number and `resigned` as a boolean; a user saved with `pinHash '0123...'` reads back as the same string; a submission saves with its MVPs and `getVoteCounts` counts it; `deleteHodSubmission` removes both; `saveGmPick`/`deleteGmPick` round-trip; and a nominee named `=HYPERLINK("x")` reads back unchanged.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `sanitizeCell` (strip the leading `'` on read) and `RepoContract.js`; make `MemoryRepo` pass. Then implement `SheetRepo` (every write passes through `sanitizeCell`; `getVoteCounts` reads the `Tallies` column after `SpreadsheetApp.flush()`; `withLock` uses `LockService.getScriptLock().waitLock(10000)`) and `setupSpreadsheet`. Not testable in Node; verified in Step 4.
- [ ] **Step 4:** Run `npm test` (Expected: all PASS). Then in the Apps Script editor run `runRepoContractOnScratchSheet`. Expected: returns `0 failures`, and the scratch sheet's `Tallies` tab shows the vote counted by the contract.
- [ ] **Step 5:** Commit `feat: Google Sheets repo, setup and contract test`.

### Task 10: I18n and web entry points

**Files:** Create `src/I18n.js`, `src/Code.js`, `test/i18n.test.js`, `test/dispatch.test.js`

**Interfaces:**
- Consumes: `ERROR_CODES`, `REASON_KEYS`, service methods from Tasks 6-8.
- Produces:
  - `I18N = {en:{[key:string]:string}, id:{[key:string]:string}}` (keys for every UI label, button, phase name, award name and description, error code as `error.<CODE>`, reason key, and the review-screen warning that the submission cannot be changed)
  - `dispatch(service, method: string, token: string|null, args: any): object` (`getI18n` returns `{ok:true, i18n: I18N}`; all other names go through the whitelist of service method names; unknown method -> `{ok:false, error:'UNKNOWN_METHOD'}`; a thrown error -> `{ok:false, error:'SERVER_ERROR'}`)
  - `doGet(): HtmlOutput`; `include(name: string): string`; `api(method, token, args): object` (builds the real service from `SheetRepo`, `CacheService`, `Utilities.computeDigest`, `Date.now`, `Math.random`, then calls `dispatch`)

- [ ] **Step 1:** Write tests: `Object.keys(I18N.en)` equals `Object.keys(I18N.id)` (same set, no blanks); every `ERROR_CODES` entry has `error.<CODE>` and every `REASON_KEYS` entry exists in both languages; `dispatch(service, 'constructor', ...)` and `'__proto__'` -> `UNKNOWN_METHOD`; a service method that throws -> `SERVER_ERROR` with no stack text in the result.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. The Indonesian copy is drafted here; Angel reviews it in Task 13.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: i18n dictionary and API dispatcher`.

### Task 11: Screen designs in Superdesign (gate: Angel approves)

**Files:** Create `docs/design/screens.md` (links or exports of the approved designs and the list below)

**Interfaces:**
- Produces: approved mobile-first designs for these 8 screens, each shown in EN and ID, using the flag colours, a placeholder photo on every nominee card, and a neutral Nourish look (no palette has been given): (1) Login (name + PIN, language toggle); (2) HOD ballot (BOH and FOH nominee cards with flag, disabled vote button and reason on red/resigned; MVP field per department); (3) HOD review and confirm ("cannot be changed"); (4) HOD thank-you (submission time only); (5) GM board (8 decisions, finalists with HOD vote counts, one-award-per-person message, Confirm winners); (6) Admin overview (phase button, deadline text, turnout list, reset HOD); (7) Admin nominees and people (add/edit/delete, Resigned toggle, Photo URL, import button); (8) Admin users/PINs and final results (18 winners).

- [ ] **Step 1:** Use the `superdesign:superdesign` skill to design the 8 screens from the list above.
- [ ] **Step 2:** Send Angel the designs; ask her for a palette or logo if she has one.
- [ ] **Step 3:** Wait for approval. Do not start Task 12 before it. Commit `docs: approved screen designs`.

### Task 12: Client UI

**Files:** Create `src/client/index.html`, `src/client/styles.html`, `src/client/app.html`

**Interfaces:**
- Consumes: `api(method, token, args)` through `google.script.run`; `I18N` through `api('getI18n')` (Task 10); the approved designs from Task 11.
- Produces: the 8 screens as one single-page app; the token is kept in `sessionStorage`; language in `localStorage` (default `en`); no choices are ever rendered after submission; the Submit button is disabled while a request is in flight; a nominee card shows a placeholder photo (silhouette or initials) unless `photoUrl` is set.

- [ ] **Step 1:** Implement the shell, the language toggle and the login screen from the designs. Verify on a test deployment (Task 13 Step 1 creates it): the toggle flips every visible string; a wrong PIN shows the translated `error.BAD_PIN`.
- [ ] **Step 2:** Implement the HOD screens (ballot, review, thank-you). Verify: on the red nominee the vote button is disabled with the reason; after confirming, signing out and back in shows only the thank-you; opening the page at a 390px width has no horizontal scroll.
- [ ] **Step 3:** Implement the GM board and the admin screens. Verify: the one-award-per-person error names the other award; Confirm winners stays disabled until all 8 are picked; the admin turnout list shows no choices.
- [ ] **Step 4:** Commit `feat: client UI`.

### Task 13: Deploy and acceptance

**Files:** Create `README.md` (deploy and rehearsal steps)

**Interfaces:**
- Needs from Angel before starting: the names and departments of the 11 logins, and her Indonesian copy review.

- [ ] **Step 1:** Create the Google Sheet "Nourish Awards 2026 - Data" owned by Angel (share with nobody else, or HR Admin only if needed). Push the code with clasp (or paste the files into the bound Apps Script project), run `setupSpreadsheet`, deploy as web app: Execute as **Me**, access **Anyone**.
- [ ] **Step 2:** Rehearse on a copy of the sheet with a second deployment. Run `createFirstAdmin` in the editor, log in as HR Admin, create the other 10 users with `adminSaveUser`, give each a PIN with `adminResetPin`; import the Detail tab; add Hendra Aditya (resigned) as FOH; add test nominees for the four GM awards (Social Butterfly across the three outlets).
- [ ] **Step 3:** Run this acceptance checklist; every line must pass:
  - 9 HODs submit; the 10th MVP slot is covered by Angel's two fields; turnout shows 9 submitted.
  - A second submit from the same HOD, from a second browser tab, is refused.
  - A red nominee and Hendra cannot be voted for, including by calling `api('submitHod', ...)` directly from the browser console.
  - Closing the HOD round creates finalists (ties for 3rd all appear).
  - The GM cannot act before `GM_OPEN`; picking one person twice is blocked; Confirm winners locks the board.
  - `adminResults` shows 18 winners (8 picks + 10 MVPs).
  - ID/EN toggle works on every screen; Angel signs off the Indonesian copy.
  - Raw sheet check: no plain-text PINs anywhere; `Tallies` matches the votes.
- [ ] **Step 4:** Create the real deployment against the real sheet (fresh `setupSpreadsheet`, no test data), import the real nominees, generate the 11 real PINs and hand them to Angel once. Commit `docs: deployment README`.
