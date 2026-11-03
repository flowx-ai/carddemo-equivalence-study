# A32 r1 (`cd_a32_kk7_zflx_r1`): test maps, notes

Drafted 2026-11-03, before anything of this build was run. Sources:
- `exec/`: `map_helper.txt` for UI flow `carddemo` (df9e2df5…), `workflow_*.md` (the SCRIPT code), `systems.txt` and `data_types.txt`;
- `builder/assumptions.md`;
- `transcript.jsonl`, but only the inputs of definition calls (the `configure_end_node` of `ui_carddemo` gives END payload `${vm}`).

No tool result of a run was read. No FlowX, zflx or MCP call was made.

Files: `map.json` (screens, start, stores, browser), `batch_map.json`, `flags.json` (536 entries) and this note.

Updated the same day for the disclosed instrument fixes 8–10, before anything was run. The `pending_not_executed` proposals are now mappings, and no `pending_not_executed` block is left. Sources and rules are unchanged; `flags.json` is unchanged. Sections 2–7 describe the current maps. Section 8 gives the before/after counts and what still cannot be expressed.

## 1. How the build is driven

- **Dispatcher.** Every START_WORKFLOW action in the UI flow starts the dispatcher `ui_carddemo` (`5bb875e6…`) with `{type, op, params: ${<page object>}, session: ${session}, sel}`. The END payload is `vm`.
  - `vm` has one top-level key per page object: `sg av au cl cv cu tl tv ta rr bp ul ua uu ud`.
  - `session` is added on sign-on, sign-off and exit.
  - Response paths are therefore `<page>.<key>`.
- **Page state.** The build sends the whole page object, so the map sends every key the dispatcher reads (Plan reads / Apply screen rules):
  - **Inputs** come from the form. The form key is the build's own binding key (`au.f.open_date`, `ta.typeCd`, …).
  - **Non-input state** comes from the adapter session, kept raw from the last response. This covers list rows, pageNum, hasNext, firstKey and lastKey; `au` and `cu` mode, snap and acctDisp; `uu` mode; `ud` names and mode. The form would turn numbers and booleans into text.
  - **Omitted.** `ud.password` is not carried, because the dispatcher never reads it for `user_delete`. msg and info are not carried either: the dispatcher resets them.
- **Starts.** All four transaction ids (CC00, CB00, CA00, CR00) map to COSGN0A. The flow has a single entry, HomePage, which shows the sign-on card while `session.userId` is null.
- **No visibility rules.** The instrument cannot hide elements. Detail containers and edit forms that the build hides are read from the response as they are. Values the build itself sets to null (`av.acct`, `cv.card`, `tv.t`) read as blank.
- **Dry run.** `adapter_full.replay` was run with a stub backend that made no FlowX call. It confirmed that the bodies nest as the build expects, for example `params.rows` / `pageNum` / `hasNext` carried on PF8.

## 2. Screens (17 legacy maps; TEXT has no page)

| Legacy | Build page | Inputs (legacy → form key) | AIDs mapped | Not reachable |
|---|---|---|---|---|
| COSGN0A | HomePage / SignonCard | USERID→sg.userId, PASSWD→sg.password | ENTER Sign on (nav by session.userType U→COMEN1A, A→COADM1A); PF3 Exit (stays COSGN0A) | PF5 |
| COMEN1A | HomePage / MainMenuCard | OPTION as a selection field: '1'…'10' → buttons '1. Account View' … '10. Bill Payment' | ENTER via selection; PF3 Sign off | options 11 (U3), PF5 |
| COADM1A | HomePage / AdminMenuCard | OPTION: '1'…'4' → '1. User List (Security)' … '4. User Delete (Security)' | ENTER via selection; PF3 Sign off | options 0, 5, 6, 7, 99 (U3), PF5 |
| CACTVWA | AcctViewPage | ACCTSID→av.acctId | ENTER View; PF3 Back to menu | PF5 |
| CACTUPA | AcctUpdatePage | ACCTSID→au.acctId, 20 single fields → au.f.*, 7 fix-7 boxes | by `au.mode` (fix 9): ENTER Fetch account (search, done) / Validate changes (edit, review); PF5 Save (F5) (review); PF12 Cancel (F12) (edit, review, done); PF3 Back to menu | PF5 outside review, PF12 in search |
| CCRDLIA | CardListPage | ACCTSID→cl.acctId, CARDSID→cl.cardNum; rows cl.rows ×7 | ENTER Search; PF7; PF8; PF3; row S → 'S - View' (CCRDSLA, row_session cvSel), U → 'U - Update' (CCRDUPA, cuSel) | invalid or multiple selection |
| CCRDSLA | CardViewPage | ACCTSID→cv.acctId, CARDSID→cv.cardNum | ENTER View (+ split); PF3 Back to menu; on_load sends `sel` = session cvSel and shows the view result | (none used) |
| CCRDUPA | CardUpdatePage | ACCTSID, CARDSID, CRDNAME→cu.f.embossed_name, CRDSTCD→cu.f.active_status, EXPMON→cu.f.exp_month, EXPYEAR→cu.f.exp_year | by `cu.mode`, as CACTUPA (Fetch card / Validate changes / Save (F5) / Cancel (F12)); PF3 Back to menu; on_load `sel` = session cuSel | PF9; PF5 outside review |
| COTRN0A | TranListPage | TRNIDIN→tl.startTranId; rows tl.rows ×10 | ENTER Search; PF7; PF8; PF3; row S → 'S - View' (COTRN1A, tvSel) | invalid selection |
| COTRN1A | TranViewPage | TRNIDIN→tv.tranId | ENTER Fetch; PF4 Clear (F4); PF5 Back to transaction list; PF3 Back to menu; on_load `sel` = session tvSel | PF9 |
| COTRN2A | TranAddPage | 14 fields → ta.* | ENTER Add transaction; PF5 Copy Last Tran (F5); PF4 Clear (F4); PF3 | PF9 |
| CORPT0A | ReportPage | SDTMM/SDTDD/SDTYYYY/EDTMM/EDTDD/EDTYYYY/CONFIRM → rr.sm/sd/sy/em/ed/ey/confirm; MONTHLY/YEARLY/CUSTOM → radio rr.reportType monthly/yearly/custom (fix 8 choose) | ENTER Submit; PF3 | PF5 |
| COBIL0A | BillPayPage | ACTIDIN→bp.acctId, CONFIRM→bp.confirm; CURBAL ← bp.balance | ENTER Continue; PF4 Clear (F4); PF3 | PF5 |
| COUSR0A | UserListPage | USRIDIN→ul.startUserId; rows ul.rows ×10 | ENTER Search; PF7; PF8; PF3 (→COADM1A); row U → 'U - Update' (COUSR2A, uuSel), D → 'D - Delete' (COUSR3A, udSel) | invalid selection |
| COUSR1A | UserAddPage | FNAME, LNAME, USERID, PASSWD, USRTYPE → ua.* | ENTER Add user; PF4 Clear (F4); PF3 Back to menu (→COADM1A) | PF9 |
| COUSR2A | UserUpdatePage | USRIDIN→uu.userId, FNAME, LNAME, PASSWD, USRTYPE → uu.* | ENTER Fetch user; PF5 Save (F5); PF4 Clear (F4); PF12 Back to menu; on_load `sel` = session uuSel | PF3 (legacy Save&Exit: no such button) |
| COUSR3A | UserDeletePage | USRIDIN→ud.userId; FNAME/LNAME/USRTYPE ← ud.firstName/lastName/userType | ENTER Fetch user; PF5 Delete (F5); PF4 Clear (F4); PF3 Back to user list; PF12 Back to menu; on_load `sel` = session udSel | — |

Each page opened by a row button (CCRDSLA, CCRDUPA, COTRN1A, COUSR2A, COUSR3A) sends `sel: session:<key>` and `selKey: const:<key>` in its on_load, as the build's init does. The dispatcher answers `vm[<key>] = null`, and the map stores that back in the session key, so a later visit from the menu sends `sel: null`, as the build does once the saved row is spent.

**Messages.**
- The build shows a `msg` and an `info` text for `sg`, `ta`, `bp`, `rr`, `ua`, `uu` and `ud`, but legacy has one ERRMSG line on these screens. So ERRMSG reads `x.msg|x.info` (fix 6).
- On CACTUPA and CCRDUPA, ERRMSG and INFOMSG are separate on both sides: `au.msg` / `au.info` and `cu.msg` / `cu.info`.
- CACTVWA, CCRDLIA and CCRDSLA have a single message text, so their legacy INFOMSG is missing.
- The menus have no message element, so their legacy ERRMSG is missing.

**Fields not on the page (missing, as in A24):**
- COMEN1A: OPTION, OPTN011 and OPTN012.
- COADM1A: OPTION and OPTN005–OPTN012.
- CCRDLIA: CRDSEL1–7. COTRN0A and COUSR0A: SEL0001–SEL0010. These have no box; the build has a button per row, which the selection mapping presses.
- CORPT0A: MONTHLY, YEARLY and CUSTOM are not boxes but one radio. With fix 8 their display reads the radio back: the field whose value the radio holds shows the typed mark, the others blank.

**Display.**
- Static values: OPTN001–OPTN010 and admin OPTN001–OPTN004 are the build's button labels ('1. Account View' and so on; legacy pads them as '01. …').
- PASSWD on COUSR1A and COUSR2A is the password input. After Fetch user, the build fills it with the stored password. The adapter masks it as `<dark>`.

**Instrument fix 7.** The literal parts of each template come from the build's own label.

| Box (CACTUPA compose) | Template | Build label |
|---|---|---|
| au.f.open_date | `{OPNYEAR}-{OPNMON}-{OPNDAY}` | Opened (YYYY-MM-DD) |
| au.f.expiration_date | `{EXPYEAR}-{EXPMON}-{EXPDAY}` | Expiry (YYYY-MM-DD) |
| au.f.reissue_date | `{RISYEAR}-{RISMON}-{RISDAY}` | Reissue (YYYY-MM-DD) |
| au.f.ssn | `{ACTSSN1}-{ACTSSN2}-{ACTSSN3}` | SSN (999-99-9999) |
| au.f.dob | `{DOBYEAR}-{DOBMON}-{DOBDAY}` | Date of birth (YYYY-MM-DD) |
| au.f.phone_num_1 | `({ACSPH1A}){ACSPH1B}-{ACSPH1C}` | Phone 1 ((999)999-9999) |
| au.f.phone_num_2 | `({ACSPH2A}){ACSPH2B}-{ACSPH2C}` | Phone 2 ((999)999-9999) |
| split, CCRDSLA View: cv.card.expiry | `{EXPMON}/{EXPYEAR}` | Expiry Date (MM/YYYY) |

There are 8 templates. CCRDUPA needs none, because expiry month and year are separate inputs there. The browser section carries the same compose rules by input index (CACTUPA inputs 2, 3, 4, 11, 12, 23 and 24).

Two caveats:
- CACTUPA ENTER is mapped since fix 9, so the compose rules are now exercised by the account-update cases.
- An all-blank phone splice gives `()-`, as in o2-aup-07 step 22. That is legacy-blank versus the build's literal text.

**Counts** (after fixes 8–10; the counts before are in §8).
- Legacy (screen, AID) pairs used by the cases: 64.
  - 53 are mapped. On CACTUPA and CCRDUPA, ENTER, PF5 and PF12 are mapped by mode, so they are reachable only in the modes where the build shows the button.
  - 11 are not reachable: COUSR2A PF3, PF5 on COSGN0A/COMEN1A/COADM1A/CACTVWA/COBIL0A/CORPT0A, and PF9 on CCRDUPA/COTRN1A/COTRN2A/COUSR1A.
- Within the mapped ENTERs, the following steps are also not reachable:
  - 4 of the 9 row-selection steps: two rows selected at once (o2-ccl-04 step 4), and the invalid code 'X' (o2-ccl-04 step 5, o2-trl-03 step 6, o2-usl-01 step 6). The build offers only the S, U and D row buttons.
  - 8 menu steps with options 0, 5, 6, 7, 11 or 99.

## 3. What is not reachable

The three gaps of the first draft (mode-dependent buttons, row selection, the report radio) are mapped since fixes 8 and 9; §8 says how. What remains has no button in the build:

1. **Menu options 11 and admin 0, 5, 6, 7 and 99.** There is no button for these. U3 states it. Flagged as R-ONL-UNREACH.
2. **Invalid keys** (PF5 or PF9 where the legacy says "Invalid key pressed") and **COUSR2A PF3** (legacy Save & Exit). The build has no such button.
3. **Invalid or multiple row selections** ('X', or two rows marked at once). The build has a button per row and action (S, U, D), so there is nothing to type a wrong code into, and one press selects one row.
4. **A mode button pressed outside its mode.** For example, legacy PF5 on CCRDUPA or CACTUPA before the changes were validated: the build shows 'Save (F5)' only in review mode, so such a step is not reachable.

## 4. Batch (`batch_map.json`)

The I/O convention (A3, `inFile()` in every batch SCRIPT):
- Input files go under `input.files["<name>.dat"]`, as a string or a list of lines.
- Outputs are top-level END keys named after the file without its extension.
- `<step>_rc` is set only on an error or a warning.

So every step uses `wrap: "files"`, contract file names as START keys, `missing: "omit"`, and identity outputs. The one exception is `export.json`, whose END key is `export`.

| Step | Workflow | START keys (under files) | rc |
|---|---|---|---|
| acctext | batch_readutils bdd79b9d… | acctdata.dat | acctext_rc |
| cardprint | batch_readutils | carddata.dat | cardprint_rc |
| xrefprint | batch_readutils | cardxref.dat | xrefprint_rc |
| custprint | batch_readutils | custdata.dat | custprint_rc |
| dailycheck | batch_readutils | dailytran.dat, cardxref.dat, acctdata.dat (custdata/carddata/transact sent, not read) | dailycheck_rc |
| export | batch_export_import 66d45bfd… | custdata.dat, acctdata.dat, cardxref.dat, transact.dat, carddata.dat | export_rc |
| import | batch_export_import | export.json | import_rc |
| posttran | batch_posttran ae74eedf… | map `_wrap files`: dailytran→dailytran.dat, acctdata→acctdata.dat, cardxref→cardxref.dat, tcatbal→tcatbal.dat; decode identity | posttran_rc '4' |
| intcalc | batch_intcalc 51c27489… | `_wrap files`: tcatbal, acctdata, cardxref, discgrp (.dat); intcalc_parm → top-level `parm`; decode identity | — |
| creastmt | batch_creastmt 4f021f24… | `_wrap files`: transact, acctdata, cardxref, custdata (.dat); decode identity | — |
| tranrept | batch_tranrept 681b3aae… | `_wrap files`: transact, cardxref, trantype, trancatg (.dat); start_date, end_date top level (R1); decode identity | — |

- **business_date is not sent.** The build reads the date from the project parameter RUN_TIMESTAMP (A1, `cfg.RUN_TIMESTAMP`), which the operator sets. combtran is not in the executor.
- **readutils step selector.** `batch_readutils` takes an optional `step`. When it is omitted, all five programs run and each abends on its own missing input (F2). The case's program therefore runs alongside the others, whose outputs the decode does not read.
- **Export/import step selector (fix 10).** `batch_export_import` runs a program only when `input.step` is CBEXPORT or CBIMPORT. Otherwise it returns `export_import_rc '12'` and an error sysout, with no contract output.
  - The first draft had no way to send it (gap kept under `pending_not_executed`).
  - Since fix 10, the export step carries `"const": {"step": "CBEXPORT"}` and the import step `"const": {"step": "CBIMPORT"}`. The executor merges this into the top level of the START body, next to `files`. The value is the build's own selector.
  - rc stays mapped to the build's per-program key (`export_rc`, `import_rc`).
- **dailycheck f-trn-04.** transact is missing in this case, but the build does not read it, so it does not abend.

Check output:
```
$ python3 tools/full_batch_exec.py check runs/full/zflx/r1/batch_map.json
map ok
$ python3 tools/full_batch_exec.py requests runs/full/zflx/r1/batch_map.json /tmp/a32_r1_req
map ok
43 requests
```
The 43 requests are 23 added cases plus 4 core steps × 5 sets. The bodies were checked: for example, posttran is `{"files": {dailytran.dat, acctdata.dat, cardxref.dat, tcatbal.dat}}`, intcalc adds `parm: "2022071800"`, and tranrept adds `start_date` and `end_date`. After fix 10 (rerun the same day, same output), f-exp-01…04 are `{"files": {…}, "step": "CBEXPORT"}` and f-imp-01…05 are `{"files": {…}, "step": "CBIMPORT"}`. f-imp-04 has an empty `files`, which is the case's missing input.

## 5. Flags (`flags.json`, 536 entries, origin register)

**What is flagged.** The register's preamble says that every entry records a decision where the wiki is "silent, uncertain or incomplete". To stay precise, only entries whose own text names the gap are flagged:
- the wiki "never says", "gives no", "is silent", "does not say", "not stated" or "not given";
- a wiki TODO;
- an explicit deviation from the wiki.

Entries resting on a cited wiki or contract statement are behaviour, so they are not flagged.

The key `scorer` names the scorer file each entry belongs to: `online`, `batch_full`, `posttran`, `intcalc`, `creastmt` or `tranrept`. `line` is the line number in assumptions.md.

**Online (22):**
- U3:
  - R-ONL-FIELD on COMEN1A OPTN011 and COADM1A OPTN005/OPTN006;
  - R-ONL-UNREACH on the eight option steps: o-mnu-01 step 4; o2-adm-01 steps 4–8; o2-usl-01 steps 8 and 10.
- U9: R-ONL-FIELD on CACTUPA ACSPH1A–C and ACSPH2A–C (the phone input format is not given).
- U12: R-ONL-FIELD on CCRDUPA CRDNAME, and R-ONL-FILE on CARDDAT (upper-casing; the wiki is silent).
- U14, U15 and A1: R-ONL-TRAN on TRANSACT. These cover the max+1 id against the wiki's sequence, the N/A merchant city and zip, and the 26-character timestamp format.

**Added batch (498).** These are matched by rule + case + name, and names are enumerated from the build's own output structure, never from golden.
- A4: R-BAT-RC "RC", plus R-BAT-LINE sysout:1–2, on the six missing-input cases (f-act-03, f-crd-03, f-cus-02, f-exp-03, f-imp-04, f-xrf-02).
- A7, free-text sysout lines:
  - sysout:1 on the acctext, print and dailycheck cases;
  - the END line (records + 2) on f-crd-01/02, f-cus-01 and f-xrf-01;
  - every line of the export sysout (8 lines) and import sysout (9 lines).
- E2: acctext_array.json:1–50, and E3: acctext_vb.json:1–100, on f-act-01/02.
- X1 and X2: case-level R-BAT-REC on f-exp-01/02/04. Every export record carries `seq`, `branch_id` and `region_code`, and export.json is the step's only record output, so this is exactly the export records.
- X4: export.json:1–50 (the customer records come first, per X1) on f-exp-01/02.

**Core (16):** these scorers match by rule only (notebook §41 granularity).
- posttran: P1 R-POST-PRECEDENCE, P2 R-POST-102, P3 R-POST-BAL.
- intcalc: A6 R-INT-TRUNC, I2 and I5 R-INT-RATE, I4 R-INT-TXID and R-INT-TXFORMAT.
- creastmt: S2 R-STMT-NAME, S3 R-STMT-ADDR, S6 R-STMT-SET and R-STMT-ABEND.
- tranrept: R1 R-REPT-SET, R4 R-REPT-ACCT, R6 R-REPT-LOOKUP and R-REPT-XREF.

**Deliberately not flagged:**
- No unit available: P4 (output order: records are keyed), S1 (statement order: keyed), R3 (page length: page totals are not units) and F2 (packaging).
- Would broaden: A5 (the overpunch table touches every amount, so any rule would broaden) and D1 (the dailycheck message lines sit at data-dependent positions, which would need the build's output to be computed).
- Other: C3 (combtran is not executed); A3 (interface only); U7 (the IdP decision is not taken, and there is no unit); and every entry resting on a cited spec, for example U8, U10, U11, U13, U16, U17, I1, I3, I6, S4, S5, S7, R2, R5, E1, E4, F1, X3 and X5.

## 6. Check output (screen map)

```
$ python3 tools/adapter_full.py check runs/full/zflx/r1/map.json
map ok
```
No loader is in the map, because the build has none. check_map does not report missing loaders. The operator's make-loader adds them. The output is the same after fixes 8–10.

## 7. Judgment calls (most consequential first)

1. **ENTER on CACTUPA and CCRDUPA after a commit (done mode) is Fetch, not Validate (§8).** This matters most because it changes what the cases after a save see.
2. **Export/import send the build's step selector as a constant (fix 10, §4).**
3. **Menus are driven through `rows.select` on OPTION.** The typed option number presses the button whose label carries that number. Without this, every case would stop at the first menu. Since fix 9, the browser section does the same through `options`.
4. **Row selection and the report radio are mapped (fixes 8 and 9, §8).** Only valid codes have an action.
5. **Back-button choice where the build has two.**
   - CCRDSLA and CCRDUPA PF3 → 'Back to menu' (legacy F3=Exit).
   - COTRN1A: PF3 → 'Back to menu', and PF5 → 'Back to transaction list' (legacy F5=Browse Tran.).
   - COUSR3A: PF3 → 'Back to user list', and PF12 → 'Back to menu' (legacy PF12 returns to the admin menu).
   - COUSR2A: PF12 → 'Back to menu', and PF3 (legacy Save&Exit) is unmapped.
   - Exit (COSGN0A PF3) stays on COSGN0A, because the build has no exit page.

## 8. After fixes 8–10

Applied on 2026-11-03 from the same definitions (`map_helper.txt`, the dispatcher's SCRIPT code, `assumptions.md` U2, U3, F2, X5). Nothing of the build was run, and no FlowX, zflx or MCP call was made. Every `pending_not_executed` block is gone: CACTUPA, CCRDUPA, CCRDLIA, COTRN0A, CORPT0A and COUSR0A in `map.json`, and export and import in `batch_map.json`. The CACTUPA compose labels that sat in the pending block are kept as `fix7_labels` on the screen.

**Fix 9, mode-dependent buttons (CACTUPA on `au.mode`, CCRDUPA on `cu.mode`, read from the adapter session, which holds the last response's mode).**

| AID | Mode in → action | Build button and its visibility rule |
|---|---|---|
| ENTER | `search`, `""` (no response yet), `done` → op `load` | 'Fetch account' / 'Fetch card' (always shown) |
| ENTER | `edit`, `review` → op `validate` | 'Validate changes' (hidden only in search) |
| PF5 | `review` → op `save` | 'Save (F5)' (`hide: mode != "review"`) |
| PF12 | `edit`, `review`, `done` → op `cancel` | 'Cancel (F12)' (hidden only in search) |

Any other mode means no button, so the step is not reachable. **Judgment call: ENTER in done mode is Fetch.** After a commit, the build shows both Fetch and Validate. Legacy ENTER after "Changes committed to database" starts a new search: o2-aup cases go to "Enter or update id of account to update", and the card cases to "Please enter Account and Card Number" or back to the card list. The build's search action is Fetch (U2: "Enter → the primary action"). Validate would re-check unchanged values and answer "No change detected…". Neither button reproduces legacy's blank prompt: Fetch reloads the account still in the box. On CCRDUPA opened from the list, legacy ENTER after a save returns to CCRDLIA (o2-cup-03 step 7); the build stays on the page. Those steps are reachable and will differ.

**Fix 9, row selections.** `select.actions` now has one entry per row button, each `{"workflow": null, "screen": <target>, "row_session": <collectionItemSaveKey>}`:
- CCRDLIA: S→CCRDSLA (cvSel), U→CCRDUPA (cuSel).
- COTRN0A: S→COTRN1A (tvSel).
- COUSR0A: U→COUSR2A (uuSel), D→COUSR3A (udSel).

Each target's on_load sends `sel: session:<key>` and `selKey: const:<key>`, and maps the response's `<key>` (null) back into the session. CCRDSLA's on_load also shows the view result (CRDNAME, CRDSTCD, and the `{EXPMON}/{EXPYEAR}` split), because init with a row runs the view. Codes other than S, U and D have no action, so they are not reachable. The build's row buttons are upper-case codes, and the adapter upper-cases the typed code (o2-trl-03 types 's').

**Fix 8.**
- CORPT0A `choose`: `rr.reportType` gets MONTHLY→`monthly`, YEARLY→`yearly`, CUSTOM→`custom`. These are the radio's option values in the UI flow, where the labels are 'Monthly (Current Month)', 'Yearly (Current Year)' and 'Custom (Date Range)'. ENTER is 'Submit' (op `submit`, all `rr` inputs plus `reportType`). MONTHLY, YEARLY and CUSTOM are now in the display.
- Carry is automatic. In this map, the only action that both fills form keys and changes the screen is sign-on, which carries `sg.userId` and `sg.password` onto the menu, where nothing shows them.

**Fix 10.** export → `"const": {"step": "CBEXPORT"}`, import → `"const": {"step": "CBIMPORT"}` (§4). The readutils steps keep no `step`, which is the build's own all-five mode (F2); fix 10 was not needed there.

**Browser section (`tools/full_ui_check.cjs`).**
- **Titles.** Every screen has a `title`, its anchored card title ('CardDemo - Sign on', 'Main Menu', 'Admin Menu', 'View Account', 'Update Account', 'List Credit Cards', 'View Credit Card Detail', 'Update Credit Card Details', 'List Transactions', 'View Transaction', 'Add Transaction', 'Transaction Reports', 'Bill Payment', 'List Users', 'Add User', 'Update User', 'Delete User'). This is needed because nearly all pages share buttons ('Back to menu', 'Search', 'Fetch user', 'Back to card list', 'View').
  - `detect` is kept as a second condition only where the button is always shown.
  - The detects that depended on rows or mode were replaced: CCRDLIA, COTRN0A and COUSR0A use 'Search' (was a row button); COUSR3A uses 'Fetch user' (was 'Delete (F5)', which shows only in edit mode).
- **Menus.** `options` on OPTION. COMEN1A '1'…'10' press '1. Account View' … '10. Bill Payment'. COADM1A '1'…'4' press '1. User List (Security)' … '4. User Delete (Security)'.
- **CACTUPA, CCRDUPA.** PF5 'Save (F5)' and PF12 'Cancel (F12)' are mapped; each is visible only in its modes.
- **CORPT0A.** `choose` is a radio by label. ENTER is 'Submit'. The inputs are SDTMM 3, SDTDD 4, SDTYYYY 5, EDTMM 6, EDTDD 7, EDTYYYY 8, CONFIRM 9.

**Counts, before → after (definitions).**

| | Before | After |
|---|---|---|
| Legacy (screen, AID) pairs with no button (of 64) | 18 | 11 |
| Legacy steps on those pairs | 141 | 11 (one each: COUSR2A PF3; PF5 on COSGN0A, COMEN1A, COADM1A, CACTVWA, COBIL0A, CORPT0A; PF9 on CCRDUPA, COTRN1A, COTRN2A, COUSR1A) |
| Row-selection steps not reachable (of 9) | 9 | 4 (two rows at once; 'X' ×3) |
| Menu-option steps not reachable | 8 | 8 (no button: U3) |
| `pending_not_executed` blocks | 8 | 0 |

The 130 steps that left the list are the ones that now have a button: CACTUPA ENTER 68, PF5 5, PF12 4; CCRDUPA ENTER 27, PF5 4, PF12 1; CORPT0A ENTER 21. On the update pages they are reachable only when the build's mode shows the button.

**Offline stub replay.** `adapter_full.replay` was run over all 473 online steps with the backend replaced by canned answers. No FlowX call was made. The stub follows the build's success path: load → edit, validate → review, save → done, cancel → edit; full list pages; init with a row → load.
- Before: 157 steps not reached. After: 26.
- The 26 are:
  - 10 invalid keys (PF5 ×6, PF9 ×4);
  - 7 menu options;
  - 3 invalid or multiple selections;
  - 1 'X' typed on the main menu (o2-trl-03 step 6, because the build's PF3 on the transaction view is 'Back to menu');
  - 2 COUSR2A PF3 (o2-uup-01 steps 7–8);
  - 3 stub artifacts. The stub signs every user on, so o-sgn-02 steps 3–4 and o-sgn-03 step 3 find the menu instead of the sign-on page. These are reachable on the build.
- On the build, PF5 and PF12 steps whose validation fails (mode stays edit) will also be not reachable. The stub cannot show that.
- All five row targets received the selected row as `sel`. o2-rpt-02 sent `reportType: "yearly"`.

**Checks rerun.** `adapter_full.py check` gives "map ok". `full_batch_exec.py check` gives "map ok". `full_batch_exec.py requests` gives "map ok, 43 requests" (export and import bodies carry `step`).

**What could not be expressed.**
1. **Browser ENTER on CACTUPA and CCRDUPA.** Which button ENTER presses depends on the mode. 'Fetch account' / 'Fetch card' is always shown and comes before 'Validate changes' in the page, so an alternation such as `^(fetch account|validate changes)$` would always press Fetch. The browser ENTER stays unmapped there. None of the 9 browser cases uses these pages.
2. **Browser row selection.** `full_ui_check.cjs` has no row-button mapping: a SEL/CRDSEL field is noted as "no input" and the AID button is pressed. None of the 9 browser cases makes a valid selection. o2-usl-01 step 6 types the invalid 'X', which the adapter marks not reachable while the browser presses Search.
3. **CORPT0A browser input indices are unverified.** They assume the three radio options are `<input>` elements counted by `input:visible`, as on the instrument's radio self-test page. If the build's radio has no such inputs, the indices are 0–6 instead. Only o2-rpt-02 (YEARLY, CONFIRM) is affected.
4. **A row press on a row the list did not return.** The adapter still runs the action (and leaves `sel` null, so the page opens empty). On the build there is no such button. The map cannot make that step not reachable.
5. **Legacy ENTER after a commit (done mode)** has no exact build counterpart (see the judgment call above).
