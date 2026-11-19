# Nourish Awards 2026

Voting and submission app (Google Apps Script + Google Sheets). 1 HR Admin, 9 HODs, 1 GM, 18 winners.
Design: `docs/nourish-awards-2026-design.md`. Plan: `docs/nourish-awards-2026-implementation-plan.md`.

## Develop

- `npm test` runs all tests in Node (no dependencies, Node 18+).
- `node dev/server.js` serves the UI at http://localhost:5173 with a fake `google.script.run` on an in-memory
  repo. Test logins: `hr` 111111, `hod1` 012345, `hod2` 222222, `gm` 123123. `/dev/gm-round` fast-forwards to the GM
  round, `/dev/phone` shows a 390px-wide frame. Local preview only, not deployed.

## Deploy (Task 13, needs Angel's Google account)

1. Create the Google Sheet "Nourish Awards 2026 - Data", owned by Angel. Share it with nobody else (raw votes are visible to anyone with access).
2. Push with `npx @google/clasp push` (`rootDir` is `src`, so `src/appsscript.json` and the client files `client/index`, `client/styles`, `client/app` are pushed). `npx @google/clasp create-script --type sheets --rootDir src` makes the bound sheet and project but overwrites `src/appsscript.json` with a default: restore it from git before pushing. If the project is not bound, set the script property `SHEET_ID`.
3. In the Apps Script editor run `setup` once, then `runRepoContractOnScratchSheet`. Expected result of the second: `0 failures`.
4. Run `createFirstAdmin("Angel")`. The HR Admin PIN is shown once in the execution log.
5. Deploy as web app: Execute as **Me**, access **Anyone**.
6. Rehearse on a copy of the sheet with a second deployment, then run the acceptance checklist in the plan (Task 13 Step 3).
7. For the real run: fresh sheet, import the real nominees, add Hendra Aditya as a resigned FOH nominee, create the 11 logins and hand out the PINs once.

## Known limits

- Indonesian text is a draft; Angel reviews it before launch.
- No screen designs were approved in Superdesign; the UI uses a neutral Nourish look and is a draft for Angel to review.
- Attendance numbers in `test/fixtures.js` are stand-ins that match the flag colours in the design; replace with the live Detail tab for a real rehearsal.
- Sessions use CacheService (max 6 hours) and can end earlier if the cache is evicted; HODs just sign in again.
- A GM who never confirms leaves the round open; HR Admin cannot force it closed.
