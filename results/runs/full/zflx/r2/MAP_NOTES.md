# A32 build r2 (cd_a32_kk7_zflx_r2): test maps

Written 2026-11-03, before any execution, from the build's definitions only:
`exec/` (UI flow `CardDemo` b0b4438b, `map_helper.txt`, dispatcher workflow `ui_carddemo` dc2612f8, batch workflows,
systems, data types), `builder/` (`assumptions.md`, `notes/build-ids.md`), and from `transcript.jsonl` only the inputs
of definition calls (`configure_end_node` payloads: every workflow ends with `${result}`). No run output was read, no
FlowX call was made. Files: `map.json` (online), `batch_map.json` (batch), `flags.json` (register flags), this note.
`map.json` is produced by a generator kept outside the repo; its correspondence tables are the content of `map.json`.

## 1. How the build is put together (what the map reads)

- One page, `CardDemoPage`, one card per legacy screen, shown by `${screen}`. The header shows the message twice:
  `HdrMsgError` (`${msg}` when `msgType == "error"`) and `HdrMsgInfo` (`${msg}` otherwise).
- Every button starts the same workflow, `ui_carddemo`, with
  `{screen: <code>, action: <name>, data: ${<obj>}, session: ${session}}`, `formsToSubmit: []`.
  `pageInit` and "Sign on again" start it with `{screen: INIT}`.
- The workflow's END payload is `${result}`, the script's UI patch: `{screen, msg, msgType, <obj>: {...}, session?, runDate?}`.
  `go()` always carries the target's full object; `show(list)` (Back from a detail page opened from a list) carries
  `{screen, msg, msgType}` only; a list selection carries the target's object and the list's object (`withList`,
  selections cleared); an exception carries `{msg, msgType}` only.
- Screen codes: SIGNON COSGN0A `su`, MAIN COMEN1A `mm`, ADMIN COADM1A `am`, AV CACTVWA `av`, AU CACTUPA `au`,
  CL CCRDLIA `cl`, CV CCRDSLA `cv`, CU CCRDUPA `cu`, TL COTRN0A `tl`, TV COTRN1A `tv`, TA COTRN2A `ta`, RP CORPT0A `rp`,
  BP COBIL0A `bp`, UL COUSR0A `ul`, UA COUSR1A `ua`, UU COUSR2A `uu`, UD COUSR3A `ud`, BYE TEXT.

### Map conventions

- Body: `screen` and `action` as constants (the button's startParams); `data.<k>` for every key of the card's object
  (from the form for the card's boxes, from the adapter session for the rest); `session.<k>` for the user
  (userId, userType, firstName, lastName).
- Typed boxes are form keys `<obj>.<field>`, refreshed from every response that carries the object.
- The card's other state (mode, origJson, from, loaded, custId, changes, expiry, balance, rows `r<n>`, firstKey,
  lastKey, more, page, display values) is kept in the adapter session under `<obj>.<field>`, set from each response
  carrying the object. `INIT` (the sign-on page's on_load) resets all of it and the user, as the page init does.
- Nav: 18 rules on every action, `screen == <code>` -> legacy map; default = the current map.
- Response paths are top-level (END = `${result}`). If the END output came back wrapped, every path would read
  nothing; that would show at step 1 of every case.
- `start`: CC00, CB00, CA00, CR00 -> COSGN0A (the page always opens on sign-on).

## 2. Screens

AID rule: ENTER = the card's enter-type button; PF3 = Back / Exit / Sign Off (no button is labelled F3); other PF keys
= the button whose label names the key. An AID with no such button is left out (not reachable, `R-ONL-UNREACH`).

| Legacy map | Card | ENTER | PF3 | Other AIDs | Not reachable |
|---|---|---|---|---|---|
| COSGN0A | SignonCard | Sign On | Exit | | PF5 (o-sgn-02:5) |
| COMEN1A | MainMenuCard | Enter | Sign Off | | PF5 (o-mnu-01:3) |
| COADM1A | AdminMenuCard | Enter | Sign Off | | PF5 (o2-adm-01:3, step excluded by the scorer) |
| CACTVWA | AccountViewCard | Search | Back | | PF5 (o-avw-02:8) |
| CACTUPA | AccountUpdateCard | Validate Changes (action enter) | Back | PF5 Save (F5), PF12 Cancel (F12) | |
| CCRDLIA | CardListCard | Enter | Back | PF7 Previous Page (F7), PF8 Next Page (F8) | |
| CCRDSLA | CardViewCard | Search | Back | | |
| CCRDUPA | CardUpdateCard | Validate Changes (action enter) | Back | PF5 Save (F5), PF12 Cancel (F12) | PF9 (o2-cup-01:8) |
| COTRN0A | TranListCard | Enter | Back | PF7 Backward (F7), PF8 Forward (F8) | |
| COTRN1A | TranViewCard | Fetch | Back | PF4 Clear (F4) | PF5 to the list (o2-trv-01:9), PF9 (o2-trv-01:8, excluded) |
| COTRN2A | TranAddCard | Add Transaction | Back | PF4 Clear (F4), PF5 Copy Last Tran (F5) | PF9 (o2-tad-02:9, excluded) |
| CORPT0A | ReportsCard | Submit | Back | | PF5 (o2-rpt-01:5, excluded) |
| COBIL0A | BillPayCard | Continue | Back | PF4 Clear (F4) | PF5 (o-bil-02:11) |
| COUSR0A | UserListCard | Enter | Back | PF7 Backward (F7), PF8 Forward (F8) | |
| COUSR1A | UserAddCard | Add User | Back | PF4 Clear (F4) | PF9 (o2-uad-01:7, excluded) |
| COUSR2A | UserUpdateCard | Fetch | Back | PF5 Save (F5) | PF12 (o2-uup-02:9) |
| COUSR3A | UserDeleteCard | Fetch | Back | PF5 Delete (F5) | PF4 (o2-udl-02:7), PF12 (o2-udl-02:8) |
| TEXT | ByeCard | | | | |

51 AIDs mapped, 14 (screen, AID) pairs not reachable; 14 case steps hit them (5 of these steps are excluded by the
scorer). AccountViewCard's "Update Account" has no legacy AID and is not mapped.

Notes per screen:

- **COSGN0A.** USERID, PASSWD -> `su.userId`, `su.pwd`; on_load = INIT. Sign On and Exit set the user session.
- **COMEN1A / COADM1A.** OPTION -> `mm.option` / `am.option`. Static option texts from the page: OPTN001-010
  (`1. Account View` ... `10. Bill Payment`), admin OPTN001-004 (`1. User List (Security)` ... `4. User Delete (Security)`).
  OPTN011 (main) and OPTN005-006 (admin) are not on the page (assumptions.md #10; flagged).
- **CACTVWA.** ACCTSID -> `av.acctId`; every legacy display field <- `av.*` (ACSCITY <- `av.addr3`, the page labels
  addr3 'City'; ACSTSSN <- `av.ssn`, masked by the build; AADDGRP <- `av.groupId`, which legacy leaves blank).
- **CACTUPA.** 24 plain inputs (index order in the browser section). Fix 7 joins (6): see section 3. ACSTNUM <- `au.custId`
  (the page text 'Customer Id: ${au.custId}'). SSN is three boxes (ACTSSN1-3), mapped one to one.
- **CCRDLIA.** ACCTSID, CARDSID -> `cl.acctFilter`, `cl.cardFilter`; CRDSEL1-7 -> `cl.s1`..`cl.s7` (one box per row);
  rows <- `cl.r<n>.acct/card/status`; PAGENO <- `cl.page`. `rows/select` is not used: the build reads the typed letter in
  the script, so the selection is a typed field, not a per-value UI action.
- **CCRDSLA.** ACCTSID, CARDSID -> `cv.acctId`, `cv.cardNum`; CRDNAME <- `cv.name`, CRDSTCD <- `cv.status`.
  EXPMON / EXPYEAR not mapped: the page has one text `Expiry Date: ${cv.expiry}` (MM/YYYY in the script, assumptions.md
  #18), and no label or placeholder of the build states the separator, so no fix-7 split. (If the reviewer accepts the
  script's own format as the source of the literal, the split would be `{"path": "cv.expiry", "template": "{EXPMON}/{EXPYEAR}"}`
  on the actions that reach CCRDSLA; not applied.)
- **CCRDUPA.** ACCTSID, CARDSID, CRDNAME, CRDSTCD, EXPMON ('Expiry Month', 'MM'), EXPYEAR ('Expiry Year', 'YYYY') -> `cu.*`.
- **COTRN0A / COUSR0A.** TRNIDIN / USRIDIN -> `tl.startId` / `ul.startId`; SEL0001-0010 -> `tl.s<n>` / `ul.s<n>`;
  rows <- `tl.r<n>.id/date/desc/amt`, `ul.r<n>.id/first/last/type`; PAGENUM <- `tl.page` / `ul.page`.
- **COTRN1A.** TRNIDIN -> `tv.tranId`; TRNID and the detail fields <- `tv.*` (TORIGDT <- `tv.origTs`, TPROCDT <- `tv.procTs`).
  The page hides the details while `tv.cardNum` is blank; the map cannot express that, so TRNID shows the id on a
  not-found step where legacy shows it blank (o2-trv-01:5).
- **COTRN2A.** 14 inputs one to one (TORIGDT, TPROCDT boxes have placeholder 'YYYY-MM-DD' and are typed whole by legacy).
- **CORPT0A.** CONFIRM -> `rp.confirm`; fix 7 for the two dates. MONTHLY, YEARLY, CUSTOM not mapped: the page has one box
  'Report Type (M/Y/C)' (placeholder 'M, Y or C'); legacy marks one of three fields with any character. That is a value
  translation (X in MONTHLY -> M in the box), which the map format cannot express. The steps run with the type box empty:
  o2-rpt-01:6-9, o2-rpt-02:4 (a browser case), o2-rpt-03:4-18 all reach the build's "type required" path. Recommend an
  instrument fix (a per-field value map whose literal comes from the label 'Report Type (M/Y/C)') before execution.
- **COBIL0A.** ACTIDIN, CONFIRM -> `bp.*`; CURBAL <- `bp.balance`.
- **COUSR1A / COUSR2A.** Inputs one to one; PASSWD is typed but not displayed (dark on legacy).
- **COUSR3A.** USRIDIN -> `ud.userId`; FNAME, LNAME, USRTYPE <- `ud.*` (page text).
- **TEXT.** TEXT <- `msg` ('Thank you for using CardDemo application...'). The ByeCard also carries its own text
  'You have been signed off. Thank you for using CardDemo.'

### Messages

ERRMSG <- `msg` on every map. INFOMSG <- `msg` as well on the five maps that have it (CACTVWA, CACTUPA, CCRDLIA,
CCRDSLA, CCRDUPA): both header texts read `${msg}` and only `msgType` decides which is visible, which the map cannot test.
At a step on those maps, at most one of ERRMSG / INFOMSG can match legacy. Known: six CCRDLIA steps where legacy
INFOMSG is blank will show the error text in INFOMSG too.

## 3. Fix 7 (compose): 8 templates

| Map | Box (form key, browser input) | Template | Literal from |
|---|---|---|---|
| CACTUPA | `au.openDate` (2) | `{OPNYEAR}-{OPNMON}-{OPNDAY}` | label 'Opened', placeholder 'YYYY-MM-DD' |
| CACTUPA | `au.expiryDate` (3) | `{EXPYEAR}-{EXPMON}-{EXPDAY}` | label 'Expiry Date', placeholder 'YYYY-MM-DD' |
| CACTUPA | `au.reissueDate` (4) | `{RISYEAR}-{RISMON}-{RISDAY}` | label 'Reissue Date', placeholder 'YYYY-MM-DD' |
| CACTUPA | `au.phone1` (20) | `({ACSPH1A}){ACSPH1B}-{ACSPH1C}` | label 'Phone Number 1', placeholder '(999)999-9999' |
| CACTUPA | `au.phone2` (21) | `({ACSPH2A}){ACSPH2B}-{ACSPH2C}` | label 'Phone Number 2', placeholder '(999)999-9999' |
| CACTUPA | `au.dob` (25) | `{DOBYEAR}-{DOBMON}-{DOBDAY}` | label 'Date of Birth', placeholder 'YYYY-MM-DD' |
| CORPT0A | `rp.startDate` (1) | `{SDTYYYY}-{SDTMM}-{SDTDD}` | label 'Start Date', placeholder 'YYYY-MM-DD' |
| CORPT0A | `rp.endDate` (2) | `{EDTYYYY}-{EDTMM}-{EDTDD}` | label 'End Date', placeholder 'YYYY-MM-DD' |

No `split`: no shown value joins legacy fields with a separator the build's label or placeholder states (CCRDSLA above).

## 4. Instrument limitations found while mapping (not build behaviour; for the coordinator before execution)

1. **Form cleared on navigation.** The adapter clears the form when the screen changes, so a box a navigating response
   prefilled is sent empty on the next step unless the step types it. The build's UI keeps it. Affected: o2-cup-03:5-6
   (card update after U from the list), o2-uup-01:5-6 (user update after U), o2-udl-01:5 (delete after D; the user id
   is in `ud.userId`, a box). Arrival display itself is handled (next point).
2. **Arrival display from a list.** The prefilled boxes of the target card are shown through fix-6 paths
   (ACCTSID `cl.acctFilter|cv.acctId|cu.acctId`, CARDSID likewise, TRNIDIN `tl.startId|tv.tranId`, USRIDIN
   `ul.startId|uu.userId|ud.userId`; CRDNAME/CRDSTCD/EXPMON/EXPYEAR, FNAME/LNAME/USRTYPE from the target's object).
   The selection response also carries the list's object, so when a filter / start id was typed on the list both paths
   hold a value and the field is marked ambiguous (differs) although only the target card is visible. On an exception
   response (no object) these fields show blank where the UI keeps the typed value.
3. **Back to the list.** `show(list)` carries no list object; the UI keeps the list as it was, the adapter shows the
   rows blank and the filter boxes empty (form cleared). Affected: o2-ccl-04:7, o2-trl-03:5-6, o2-udl-01:6, o2-uup-01:7.
   The list's rows stay in the adapter session, so the next action on the list sends them as the UI would.
4. **Report type** (section 2, CORPT0A): 20 steps over three cases run without a type.

A fix for 1-3 would be: apply the action's `form` mapping after `open_screen` clears the form, and let a `show` path
fall back to the form when its object is absent. Neither is applied here.

## 5. Browser section

`detect` = a button only that card shows, checked in this order (first visible match wins):

1. Unique buttons: COSGN0A `^sign on$`, CACTVWA `^update account$`, CCRDLIA `^next page \(f8\)$`, COTRN2A
   `^add transaction$`, CORPT0A `^submit$`, COBIL0A `^continue$`, COUSR1A `^add user$`, COUSR3A `^delete \(f5\)$`
   (only when a user is loaded).
2. Unique once those are excluded: CCRDSLA `^search$`, COTRN1A `^clear \(f4\)$`.
3. Cards whose buttons are all shared with another card: the first in the page's card order is reported for both.
   COMEN1A/COADM1A `^sign off$` (an admin menu is reported as COMEN1A); CACTUPA/CCRDUPA `^cancel \(f12\)$` (a card update
   in edit mode is reported as CACTUPA); COUSR2A `^save \(f5\)$`; COTRN0A/COUSR0A `^forward \(f8\)$` (a user list is
   reported as COTRN0A).
   Cards in search mode (Fetch and Back only: CACTUPA, CCRDUPA, COUSR2A, COUSR3A) are not detected.

Since `r.ok` needs the page to equal both the legacy and the workflow-level nav, a misreported card can only fail.
Inputs are indices among visible inputs, in page order (CACTUPA in edit mode: 30 boxes; search mode shows only box 0).
CACTUPA / CCRDUPA ENTER = `^validate changes$`, hidden in search mode, where the browser cannot press ENTER.
`text_detect`: `thank you for using carddemo`. Browser cases touched by the limits above: o2-usl-01 (user list reported
as COTRN0A), o2-rpt-02 (no type).

## 6. Stores

The seven NOSQL systems: USRSEC users 67f190f7, ACCTDAT accounts adcf8cf4, CUSTDAT customers 6f67abab, CCXREF card_xref
c316cfc4, CARDDAT cards c38fff38, TRANSACT transactions 9fa6d8b1, JOBS job_requests f6b353f2. The data types use the
CONTRACT-UI-FULL field names and types (INTEGER / FLOAT / STRING as the contract), so `fields` is empty and there is no
`as_text`. No loader in the build; the operator's comes from `make-loader`.

## 7. Batch (batch_map.json)

Every batch workflow takes its input files as top-level keys named by the file, and returns its outputs under contract
names in `${result}` (assumptions.md #1). A missing input is an absent key (`missing: omit`). `<step>_rc.txt` is written
only on the abend path ('999'); otherwise absent and read as 0.

| Step | Workflow | Inputs (key = file name) | Outputs |
|---|---|---|---|
| acctext | ff19cdd4 | acctdata.dat | acctext_out/array/vb.json, acctext_sysout.txt |
| cardprint | de7ca619 | carddata.dat | cardprint_sysout.txt |
| xrefprint | 41768810 | cardxref.dat | xrefprint_sysout.txt |
| custprint | a888d51e | custdata.dat | custprint_sysout.txt |
| dailycheck | 8c06dbfb | dailytran, cardxref, acctdata (+ custdata, carddata, transact sent, not read; #44) | dailycheck_sysout.txt |
| export | a893d977 | custdata, acctdata, cardxref, transact, carddata | export.json, export_sysout.txt |
| import | d93fbbfd | export.json | import_customers/accounts/card_xref/transactions/cards/errors.json, import_sysout.txt |
| posttran | 5b0e27be | dailytran, acctdata, cardxref, tcatbal (.dat) | posttran_transact/dalyrejs/acctdata/tcatbal.json |
| intcalc | 673eeacf | acctdata, tcatbal, discgrp, cardxref (.dat); intcalc_parm -> `parm` | intcalc_systran/acctdata.json |
| creastmt | 6cc94e73 | transact, acctdata, cardxref, custdata (.dat) | creastmt_statements(_html).txt |
| tranrept | 0947b20a | transact, cardxref, trantype, trancatg (.dat); start_date -> `startDate`, end_date -> `endDate` | tranrept_report.txt |

No COMBTRAN workflow (assumptions.md #5). posttran's business date is not sent: the script uses RUN_TIMESTAMP (#2).

## 8. Flags (flags.json): 92 entries from assumptions.md

Only entries where the build records a gap, a wiki TODO, a choice between two readings, or a deliberate departure
from legacy. Scoped to the screens/fields/cases/steps the entry speaks of; core batch flags carry `"step": "<batch step>"`
(posttran, intcalc, creastmt, tranrept) for routing to `flags/<step>.json`; R-BAT-* flags go to `batch_full.json`;
the rest are online.

| # | Rule(s) | Scope |
|---|---|---|
| 3 | R-ONL-CLOCK | TRANSACT, o-bil-01/03/05 (online timestamp format; contract gives none) |
| 8 | R-ONL-FILE | USRSEC, o2-uad-01, o2-uup-01, o2-uup-02 (stored as typed; wiki silent) |
| 9 | R-ONL-MSG | TEXT (farewell page; wiki says only "process ends") |
| 10 | R-ONL-FIELD | COMEN1A OPTN011; COADM1A OPTN005, OPTN006 |
| 10 | R-ONL-MSG | ERRMSG at o-mnu-01:4 (option 11), o2-adm-01:7-8 and o2-usl-01:8 (admin 5/6) |
| 14 | R-ONL-MSG | CACTUPA ERRMSG, INFOMSG at o2-aup-05:31 (state + ZIP TODO; legacy "Invalid zip code for state") |
| 15 | R-ONL-FIELD | CCRDLIA ACCTNO1-7, CRDNUM1-7, CRDSTS1-7, PAGENO (page size 7 TODO) |
| 16 | R-ONL-MSG | CCRDLIA ERRMSG at o2-ccl-03:6 (no-match text, alternative TODO) |
| 17 | R-ONL-FIELD | CRDSEL1-7 (CCRDLIA), SEL0001-0010 (COTRN0A, COUSR0A) (selections cleared; wiki silent) |
| 19 | R-ONL-ACCT | ACCTDAT, o2-tad-01, o2-tad-04 (balances not updated: UI-11 chosen over FI-14) |
| 19 | R-ONL-FIELD, R-ONL-TRAN | COTRN2A at o2-tad-04:5; TRANSACT o2-tad-04 (copy last = highest tran_id vs "latest") |
| 21 | R-ONL-TRAN | TRANSACT, o-bil-01/03/04/05 (merchant values "TODO verify") |
| 24 | R-POST-PRECEDENCE | posttran |
| 28 / 29 / 30 | R-INT-TRUNC / R-INT-TXFORMAT / R-INT-RATE | intcalc |
| 32 / 33 / 34 | R-STMT-TXN / R-STMT-NAME, R-STMT-ADDR / R-STMT-ABEND | creastmt |
| 35 / 36 / 37 / 39 | R-REPT-SET / R-REPT-ACCT, R-REPT-GRAND / R-REPT-LASTDUP, R-REPT-LASTACCT / R-REPT-LOOKUP, R-REPT-XREF | tranrept |
| 45 | R-BAT-REC | f-exp-01, f-exp-02, f-exp-04 (ssn null per FI-12; timestamp where contract says "as the step writes it") |

Considered and not flagged: #1, #2, #4-7, #11, #12, #18, #25-27, #31, #38, #40-44, #46-50 (plain statements of
behaviour or of the contract/wiki); #13 (no lock: the replays have no concurrent rewrite the lock would change;
the visible behaviour is BR-14 as written); #20 (no case step has a valid end date before the start date);
#22 (no case step deletes the signed-on admin); #23 (no case step types a user type other than A/U).
Note on #15 and #17: these field-level flags also cover the CCRDLIA / COTRN0A / COUSR0A row and selection fields that
the instrument shows blank after a Back to the list (section 4.3); the coordinator may want to read those units apart.

## 9. Check outputs

```
$ python3 tools/adapter_full.py check runs/full/zflx/r2/map.json
map ok
$ python3 tools/full_batch_exec.py check runs/full/zflx/r2/batch_map.json
map ok
$ python3 tools/full_batch_exec.py requests runs/full/zflx/r2/batch_map.json /tmp/a32_r2_req
map ok
43 requests
```

Offline only: an adapter replay with a stubbed workflow (no FlowX) ran sign-on -> menu -> card list -> S -> Back
without error and sent the bodies described in section 1. A static pass over all online cases found no typed field
without an input except MONTHLY / YEARLY / CUSTOM, and exactly the unreachable AIDs listed in section 2.

## 10. Coordinator additions (2026-11-03, before any execution)
- Instrument fix 8 (`tools/adapter_full.py`, `tools/full_ui_check.cjs`, self-test `tools/selftest_fix8.py`) settles §4 points 1 and 4:
  - CORPT0A `choose`: `rp.type` takes M, Y or C for MONTHLY, YEARLY or CUSTOM. The codes are from the build's own label
    'Report Type (M/Y/C)' and its hint text. Browser input 0 (RpType, first input of RpForm).
  - carry: a box an action's `form` mapping fills keeps its value when that action changes the screen (o2-cup-03, o2-uup-01, o2-udl-01).
- §4 points 2 and 3 (ambiguous `a|b` arrival paths; blank rows after Back to a list) are not changed. Both can only make a step
  differ from legacy, never match it. The affected steps are reported with the score as instrument limits.
- Card expiry (§ judgment 4): kept unmapped under the strict rule (no label or placeholder gives the separator).

### 10.1 Mapper update after fixes 8-10 (2026-11-03, before any execution)

Changed in `map.json` only by the mapper (the coordinator's CORPT0A `choose` is kept as it was):

1. **Mode-dependent buttons (fix 9 conditional AIDs), from the cards' own hide rules.** 8 AIDs now read the card's mode
   from the adapter session (set from each response that carries the object):
   - CACTUPA, CCRDUPA ENTER: `au.mode` / `cu.mode` in `search` or blank -> Fetch (action `fetch`); `edit` or `confirm` ->
     Validate Changes (action `enter`). AuValidate / CuValidate are hidden when mode == "search".
   - CACTUPA, CCRDUPA PF5: Save (F5) only when mode == `confirm` (hide `mode != "confirm"`).
   - CACTUPA, CCRDUPA PF12: Cancel (F12) only in `edit` or `confirm` (hide `mode == "search"`).
   - COUSR2A, COUSR3A PF5: Save (F5) / Delete (F5) only when `uu.loaded` / `ud.loaded` == `Y` (hide `loaded != "Y"`).
   A legacy AID whose button is hidden in that mode is now not reachable (R-ONL-UNREACH) where before it ran the
   action the script would have answered; which case steps that touches depends on the build's responses.
2. **List arrival (fix 8 carry).** The target card's boxes now come from the carried form, so the `a|b` show paths for
   boxes are removed from CCRDLIA / COTRN0A / COUSR0A ENTER: ACCTSID, CARDSID, EXPMON, EXPYEAR, TRNIDIN, USRIDIN (6).
   This removes the §4.2 ambiguity when a filter or start id was typed on the list. CRDNAME / CRDSTCD
   (`cv.name|cu.name`, `cv.status|cu.status`) and FNAME / LNAME / USRTYPE (`uu.*|ud.*`) stay: they are page texts on one
   target and boxes on the other, and the list's object holds none of them.
3. **Browser (fix 9 titles).** Every card is detected by its own title (anchored, from `title=` in the UI flow):
   'Welcome to AWS CardDemo - Sign On', 'Main Menu', 'Admin Menu', 'View Account', 'Update Account', 'List Credit Cards',
   'View Credit Card Detail', 'Update Credit Card Details', 'List Transactions', 'View Transaction', 'Add Transaction',
   'Transaction Reports', 'Bill Payment', 'List Users', 'Add User', 'Update User', 'Delete User'. The button `detect`s
   are dropped, except CACTUPA, which keeps `^fetch$` with its title because 'Update Account' is also a button label
   on AccountViewCard. This settles §5: admin menu, card update, user list, and the search-mode cards (CACTUPA,
   CCRDUPA, COUSR2A, COUSR3A) are now each reported as themselves. Browser ENTER on CACTUPA / CCRDUPA stays
   `^validate changes$`: Fetch precedes it on the card and is visible in every mode, so an alternation would press
   Fetch in edit mode; in search mode the browser cannot press ENTER there (no browser case uses these cards).
4. Not used: `options` (the menus take a typed option in a box), `row_session` (the build hands the selected row to
   the next card in the script's response, not through a collection save key).

Checks after the update:

```
$ python3 tools/adapter_full.py check runs/full/zflx/r2/map.json
map ok
```

Stub replay (no FlowX): sign-on -> card list -> U -> validate -> save -> Back: the CCRDUPA boxes arrive filled from the
carry and are sent on the next step; admin -> user list -> D -> Delete (F5): `ud.userId` is sent from the carry, a
second PF5 after the delete (loaded blank) is not reachable; account update in search mode: ENTER runs Fetch, PF5 and
PF12 are not reachable.
