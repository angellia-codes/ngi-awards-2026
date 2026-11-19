# Nourish Awards 2026 — Voting & Submission Web App: Design

Date: 2026-11-18
Owner: Angel (HR Manager, PT Nourish Group Indonesia)
Status: Draft for approval

## 1. Intent and why

NGI runs the Nourish Awards 2026. Angel needs one web app where the decisions behind every award are made and recorded: HR enters the nominees, the 9 Heads of Department (HODs) vote or submit, and the General Manager (GM) makes the final call on the awards that need him. The result is a clean list of 18 winners that HR can read off and announce.

The app replaces ad-hoc collection (chats, paper, spreadsheets passed around). Its value is in the rules it enforces: one vote per HOD, a fixed order of stages, and top-3 finalists computed correctly.

## 2. Goals, non-goals, anti-goals

**Goals**
- All 18 winners are decided through the app.
- Every voter can only act as themselves, once per category.
- Works well on a phone (HODs will open it on phones).
- Results are readable and auditable in Google Sheets with formulas, not hidden logic.
- The whole interface can be switched between Indonesian (ID) and English (EN) with a toggle.
- Each HOD submits once, and that submission is final.

**Non-goals**
- No public or staff-facing page, no live awards-night reveal screen.
- No translation of nominee data (names, positions, last awards, "why nominated" notes); it is shown as entered.
- No roster or employee master import. MVP names are typed.
- No dates baked in: phases are opened and closed manually by HR Admin.

**Anti-goals (failure even if it technically works)**
- An HOD voting twice, voting as another HOD, or re-entering the voting page to change a submission (an HR Admin reset excepted).
- The GM voting before the HOD round is closed.
- A wrong top-3 (for example, silently dropping a nominee who ties for 3rd).
- HODs seeing results or each other's votes through the UI.
- An HOD voting for a red-flag or resigned nominee (see section 3), including by sending a hand-made request.
- The same person winning two awards (MVP of Department excepted).

## 3. Awards

| # | Award | Nominees from | Decided by | Winners |
|---|---|---|---|---|
| 1 | Best Employee of the Year, Back of the House (BOH) | HR: 10 nominees | 9 HODs vote 1 each, then the GM picks 1 of the top 3 | 1 |
| 2 | Best Employee of the Year, Front of the House (FOH) | HR: 10 nominees, including Hendra Aditya (shown with a "Resigned" badge) | 9 HODs vote 1 each, then the GM picks 1 of the top 3 | 1 |
| 3 | MVP of Department ("most entertaining / helpful person in each department") | The HOD types a name | The HOD alone; the submission is final | 10 (one per department) |
| 4 | Breakthrough Award (personal growth; overcame a challenge) | HR | GM | 1 |
| 5 | Unsung Hero Award (important contribution, often behind the scenes) | HR | GM | 1 |
| 6 | Nourish Heart Award (care and compassion toward guests or colleagues) | HR | GM | 1 |
| 7 | Social Butterfly Award (most connected across the Nourish family) | HR, only from Nourish Ungasan, Nourish Uluwatu and Nourish Berawa | GM picks 1 per outlet | 3 |

Total: 18 winners, 8 GM decisions (BOH, FOH, Breakthrough, Unsung Hero, Nourish Heart, and 3 Social Butterfly picks).

### Departments (the master list for MVP, 10)
1. Floor 2. Bar 3. Cashier 4. Kitchen 5. Kitchen The Bakery 6. HR & Security 7. Finance & Accounting 8. Driver 9. Wholefood 10. Engineering

### Nominee data for BOH and FOH
Source: Google Sheet "BEOTM 2026 – Winner Recap", tab "Detail" (spreadsheet ID 1gOJBG4YrBQT4DlO0gkNDWki-gIlRhqRNCToW4fZ3SHE). Columns: Period, Employee, Position, Outlet, Department, Lateness, Unpaid Leave, Last Award, Last Warning Letter. Lateness and Unpaid Leave are totals from the Absentee tab. The Last Warning Letter column is currently empty for everyone; blank is treated as "none".

- BOH: 10 nominees (Jan–Oct winners).
- FOH: 9 nominees in the sheet (Feb–Oct) plus Hendra Aditya (January winner, per the Recap tab), who resigned and is not in the Detail tab. He is added by HR as the tenth FOH nominee with a "Resigned" flag.
- Department values in the Detail tab differ slightly from the master list: "Security" maps to "HR & Security", and the Bakery Kitchen cook (Ni Luh Putu Arisyawati) is listed under "Kitchen" but belongs to "Kitchen The Bakery". Map on import and show HR a preview to confirm.

### Nominee cards and attendance flags (BOH and FOH)
Every BOH and FOH nominee gets a card with: a placeholder photo, name, position, outlet, department, Lateness, Unpaid Leave, Last Award, Last Warning Letter, and a colour flag computed from Lateness and Unpaid Leave.

| Flag | Rule | Can HODs vote? |
|---|---|---|
| Red | Lateness more than 3, or Unpaid Leave more than 3 | **No.** The card is shown with the vote button disabled and the reason stated |
| Yellow | Has a lateness or unpaid-leave record and is not red (Angel's rule: lateness more than 1; extended by me, see section 8) | Yes |
| Green | Lateness 0 and Unpaid Leave 0 | Yes |
| Grey "Resigned" | Resigned, no attendance data (Hendra Aditya) | **No.** The card is shown with a "Resigned" badge and the vote button disabled |

With the current sheet this gives:
- **Red (6):** BOH: Andrean Kusuma, I Made Ananta Wijayakusuma P, I Komang Tri Artanadi, Esaldo Moto Ubbu Lele. FOH: Ni Luh Putu Cloudia Wulandari, Kadek Riska Dewi.
- **Yellow (6):** BOH: I Nengah Andrawan, I Kadek Adiasa, I Made Kartina Putra. FOH: Norta Ota, Putu Sunil Laksana, I Kadek Okawa Juniasa.
- **Green (7):** BOH: I Gede Defry Wisnu Sastrawan, I Wayan Agus Dwipa, Ni Luh Putu Arisyawati. FOH: Ni Komang Ayu Mekar Sari, I Gusti Ayu Made Desiana, Ni Putu Kusumawati, Marlin Luta Hambabanju.
- **Grey, not votable (1):** FOH: Hendra Aditya.
- So HODs can vote for 6 of the 10 BOH nominees and 7 of the 10 FOH nominees. Red and resigned nominees can never reach the top 3.

Implementation rules:
- The flag is calculated from the Lateness and Unpaid Leave values. The thresholds (red above 3, yellow at 1 or more) live in a Config tab so HR can change them.
- "More than 3 lateness or unpaid leave" is read as each measure on its own. On the current data this gives the same result as adding them together.
- The "no vote" rule for red and resigned nominees is enforced when a vote is saved, not only by greying out the button. HR Admin can mark any nominee "Resigned" and the same block applies.
- Each card shows a placeholder photo (silhouette or initials). The Nominees tab has an optional Photo URL column; if filled, that photo replaces the placeholder.
- Flags apply to BOH and FOH only. Cards for the four GM-decided awards (4 to 7) show no flag.

### Nominee data for the new awards (4 to 7)
HR enters: name, position, outlet, department, and a short "why nominated" note (optional but encouraged). Social Butterfly nominees must be from one of the three outlets above.

## 4. People and roles (11 logins)

| Role | Count | Can do |
|---|---|---|
| HR Admin | 1 | Manage nominees and the "Resigned" flag; manage logins and PINs; open and close phases; see turnout (who has submitted, not their choices); reset one HOD's submission if a real mistake must be corrected (logged); see final results |
| HOD | 9 | Once, final: vote 1 BOH, vote 1 FOH, submit MVP for own department |
| GM | 1 | After the HOD round closes: pick winners for BOH, FOH (from top 3), Breakthrough, Unsung Hero, Nourish Heart, and Social Butterfly (1 per outlet) |

Angel covers two departments, HR & Security and Kitchen The Bakery. Her HOD login therefore has two MVP slots. 9 HODs cover 10 departments this way.

## 5. Flow

1. **Setup (HR Admin):** load nominees for all 6 voted awards, check the department mapping preview, create the 11 logins and PINs.
2. **HOD round (open):** each HOD sees three items: vote BOH, vote FOH, type the MVP name (Angel has two MVP fields). Nothing is saved until the HOD confirms on a review screen that says the submission cannot be changed. After that, logging in again shows only a thank-you message with the submission time. The HOD cannot re-enter the voting page or re-vote.
3. **HOD round closed (HR Admin):** the app computes the BOH and FOH top 3.
4. **GM round (open):** the GM sees 8 decisions on one screen: BOH finalists, FOH finalists, Breakthrough nominees, Unsung Hero nominees, Nourish Heart nominees, and Social Butterfly nominees grouped by outlet.
5. **Done (HR Admin closes):** results screen lists all 18 winners.

Phase transitions are manual buttons for HR Admin. An optional deadline text can be shown to voters. It is informational and does not close anything automatically.

### Rules
- **Top 3:** finalists are the nominees whose HOD vote count is greater than or equal to the 3rd-highest count, with a minimum of 1 vote. Ties for 3rd place are all included, so the GM can see more than 3 finalists. Nominees with 0 votes are never finalists.
- **Hendra Aditya:** he appears on the FOH list with a "Resigned" badge but HODs cannot vote for him, so he never reaches the GM screen.
- **One award per person:** a person can win at most one award. The GM screen blocks picking someone already picked in another GM decision (BOH, FOH, Breakthrough, Unsung Hero, Nourish Heart, Social Butterfly) and says why; changing the earlier pick frees them. MVP of Department is exempt because its names are typed free text and are not matched. Each person has a single ID in the data, so the same person is recognised across awards even if HR types the name slightly differently. If a category has nobody left to pick, the GM sees a clear message.
- **Final submission:** an HOD's BOH vote, FOH vote and MVP name(s) are saved together in one confirmed submission. A second submission from the same HOD is rejected by the server, not only hidden in the screen. The thank-you screen does not show their choices.
- **Own-department voting:** an HOD may vote for a BOH/FOH nominee from their own department.
- **Secrecy:** HODs never see results or other votes. HR Admin sees turnout only. The GM sees finalists with their HOD vote counts.
- **MVP:** free text, final once submitted by the HOD (HR can correct a display name). No tallying.

## 6. Approaches considered

- **A. React + Vite + TypeScript on Supabase.** Same stack as the Badminton and GOT Talent apps. Rules enforced in the database; strongest secrecy and phase locks. Trade-off: a new project, and results live in a database rather than Sheets.
- **B. Google Apps Script + Google Sheets (chosen by Angel).** Same stack as the Daily Updates and Beauty Class apps. Nominees import straight from her sheet and results are formulas she can read and edit. Trade-off: votes sit in a sheet, so anyone with edit access to that spreadsheet can read them raw, and Apps Script enforces PINs and phase locks only as strictly as the code is written. Accepted for 11 voters.
- **C. A Claude-hosted page.** Ruled out: HODs would need Claude accounts; they should only need a PIN.

## 7. Constraints and consequences of choosing B

- The data spreadsheet is created and owned by HR. Its edit access should be limited to the owner (Angel) and, if needed, HR Admin. Raw votes in the sheet are visible to anyone with access; secrecy applies to the app UI only.
- Web app deployed so that voters do not need a Google login. They log in with name and personal PIN.
- PINs are stored hashed in the sheet, not in plain text. The builder chooses format (for example 6 digits), lockout after repeated failures, and session handling.
- Writes use script locking so near-simultaneous votes do not collide.
- Results and top-3 use sheet formulas where practical (Angel prefers formula-driven automation), with the web app reading the computed values.
- Apps Script quotas are not a concern at 11 users.

## 8. Decided by Angel vs. decided by me

**Angel decided**
- Awards, categories, departments, who nominates and who decides (section 3).
- 11 logins: 1 HR Admin, 9 HODs, 1 GM; Angel covers HR & Security and Kitchen The Bakery.
- GM votes as final voter on the top 3 after HODs vote.
- MVP names are typed by the HOD.
- Hendra Aditya added to FOH with a resigned note (10 vs 10). HODs cannot vote for him.
- Social Butterfly: 3 winners, one each for Ungasan, Uluwatu and Berawa.
- Stack: Google Apps Script + Google Sheets.
- One award per person.
- Nominee cards for all BOH and FOH nominees, with red / yellow / green flags from Lateness and Unpaid Leave. Red: HODs cannot vote. Yellow and green: HODs can vote.
- A placeholder photo on every nominee card.
- A language toggle, Indonesian (ID) and English (EN).
- After an HOD votes and submits their MVP name, they cannot re-enter the page or re-vote.

**My calls (please check)**
- **Yellow is wider than your rule.** Your rule was "more than 1 lateness". Five nominees fall between your three rules: 1 late and no unpaid leave (Nengah Andrawan, Adiasa, Putu Sunil Laksana), or no lateness and 1 unpaid leave (Kartina Putra, Okawa Juniasa). They are neither green nor "more than 1". I made yellow mean "has any record and is not red". HODs can vote for them either way; only the colour is affected.
- Red uses each measure separately (lateness above 3, or unpaid leave above 3).
- Flags apply only to BOH and FOH; the four GM awards have no flags.
- Hendra Aditya has no attendance data, so he is grey "Resigned", not green.
- Red and resigned nominees are shown but their vote button is disabled; the rule is enforced when saving a vote.
- One award per person is a hard block on the GM screen, with MVP of Department exempt (typed names can't be matched reliably).
- An optional Photo URL column replaces the placeholder photo when filled in.
- Phases are manual buttons; deadlines are display-only.
- Ties for 3rd place all go through to the GM.
- HODs may vote for nominees from their own department.
- All of an HOD's answers go in one submission from a review screen; nothing is saved before the final confirm.
- After submitting, an HOD who logs in again sees only a thank-you with the submission time, not their choices.
- HR Admin can reset a single HOD's submission (logged) if a genuine mistake must be corrected. The HOD cannot do this.
- The GM can change picks until pressing "Confirm winners", then it locks. HR Admin can reset it. This is needed for the one-award-per-person block, which depends on the GM being able to swap an earlier pick.
- The GM sees HOD vote counts next to the finalists.
- HR Admin sees turnout only in the UI, not who voted for whom.
- Social Butterfly follows the same pattern as Breakthrough, Unsung Hero and Nourish Heart: HR enters nominees, the GM decides.
- Language: English is the default and the choice is remembered on that device. Labels, buttons, instructions, rules and error messages are translated; nominee data is not. The builder drafts the Indonesian copy and Angel reviews it before launch.
- Blank "Last Warning Letter" is treated as "none".

## 9. Left to the builder

- Sheet tab and column layout; formula design for counts and top 3.
- PIN format, hashing, lockout, session handling.
- Exact screens and visual identity. No palette has been given for Nourish Awards 2026; screens are designed in Superdesign and a neutral Nourish look is used until Angel provides one.
- Import mechanism from the "Detail" tab, and the department mapping preview.
- Error and empty states, and mobile layout details.
- Indonesian wording for every screen and message (reviewed by Angel).
