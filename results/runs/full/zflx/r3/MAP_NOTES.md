# A32 r3 (cd_a32_kk7_zflx_r3): test maps, notes

Written 2026-11-03 from the build's definitions only: `exec/` (UI flow `83e21daf…` JSON and `map_helper.txt`, the
dispatcher workflow `ui_carddemo` 45143f53…, the batch workflows, `systems.txt`, `data_types.txt`), `builder/assumptions.md`
and `builder/scripts`, and from `transcript.jsonl` only the inputs of `configure_end_node` calls. No run output was read, no
FlowX call was made, nothing was run. Files: `map.json`, `batch_map.json`, `flags.json`, this file.

## 1. How the build is shaped

- One UI flow (CardDemo), one page (CardDemoPage). Each legacy map is a card shown when the state key `screen` has its value.
  `screen` values: SIGNON, MENU, ADMIN, ACCTVIEW, ACCTUPD, CARDLIST, CARDVIEW, CARDUPD, TRANLIST, TRANVIEW, TRANADD, REPORT,
  BILLPAY, USERLIST, USERADD, USERUPD, USERDEL, BYE (BYE = the TEXT screen).
- Every workflow button starts `ui_carddemo` with `{type, sess, f}`; `f` is the card's own state object. The END node returns
  `${view}` (transcript, configure_end_node): `err`, `msg`, `screen` when it changes, `sess` when it changes, and the card states.
  The dispatcher loops through `db_exec`; only the last pass (no DB operations) returns a view, so every response path in the
  map was read from the last pass of each action.
- Every workflow action in the map carries the same nav rules (`screen` value -> map name, BYE -> TEXT).
- `sess.*` is sent from the adapter session on every call; sign-on writes all six keys from `sess.*`. Account view, card view
  and card-list Enter write `sess.acct`/`sess.card` (set by the build only on a successful fetch; on other paths the adapter
  writes empty, the page keeps the earlier value).
- Messages: the page shows `err` and `msg` in the header. Maps with INFOMSG (CACTVWA, CACTUPA, CCRDLIA, CCRDSLA, CCRDUPA):
  ERRMSG = `err`, INFOMSG = `msg`. Other maps: ERRMSG = `err|msg` (fix 6).

## 2. Screens

Legend: AID -> button label (action type). "null" = UI event of the page (no workflow). "not reachable" = no button carries the key.

| Map | Card | Typed fields -> form key | AIDs |
|---|---|---|---|
| COSGN0A | SignonCard | USERID so.uid, PASSWD so.pwd | ENTER 'Sign on (Enter)' (signon); PF3 'F3=Exit' null -> TEXT; PF5 not reachable |
| COMEN1A | MenuCard | OPTION mn.opt | ENTER 'Enter' (menu); PF3 'F3=Exit' null -> TEXT (legacy goes to COSGN0A); PF5 not reachable |
| COADM1A | AdminCard | OPTION am.opt | ENTER 'Enter' (admin); PF3 'F3=Exit' null -> TEXT (legacy COSGN0A); PF5 not reachable |
| CACTVWA | AcctViewCard | ACCTSID av.acct | ENTER 'Enter' (acctview); PF3 'F3=Back' null -> COMEN1A; PF5 not reachable |
| CACTUPA | AcctUpdCard | ACCTSID au.acct; ACSTTUS status, ACRDLIM climit, ACSHLIM cashlim, ACURBAL bal, ACRCYCR cycc, ACRCYDB cycd, AADDGRP group, ACTSSN1-3 ssn1-3, ACSTFCO fico, ACSFNAM/ACSMNAM/ACSLNAM fname/mname/lname, ACSADL1 a1, ACSADL2 a2, ACSCITY a3 (label 'City'), ACSSTTE state, ACSZIPC zip, ACSCTRY country, ACSPH1A-C ph1a-c, ACSPH2A-C ph2a-c, ACSGOVT govt, ACSEFTC eft, ACSPFLG pri (all au.e.*) | ENTER 'Enter=Validate' (auval); PF5 'F5=Save' (ausave); PF12 'F12=Cancel' (aucancel); PF3 'F3=Back' null -> COMEN1A. 'Fetch account' (auget) has no AID |
| CCRDLIA | CardListCard | ACCTSID cl.acct, CARDSID cl.card, CRDSEL1-7 cl.s0-6 | ENTER (clenter); PF7 'F7=Backward' (clprev); PF8 'F8=Forward' (clnext); PF3 'F3=Back' null -> COMEN1A |
| CCRDSLA | CardViewCard | ACCTSID cv.acct, CARDSID cv.card | ENTER (cardview); PF3 'F3=Back' (back, to = cv.from, with cl) |
| CCRDUPA | CardUpdCard | ACCTSID cu.acct, CARDSID cu.card, CRDNAME cu.name, CRDSTCD cu.active, EXPMON cu.mon, EXPYEAR cu.yr | ENTER 'Enter=Validate' (cuval); PF5 'F5=Save' (cusave); PF12 'F12=Cancel' (cucancel); PF3 'F3=Back' (back, to = cu.from); PF9 not reachable. 'Fetch card' (cuget) has no AID |
| COTRN0A | TranListCard | TRNIDIN tl.tid, SEL0001-0010 tl.s0-9 | ENTER (tlenter); PF7 (tlprev); PF8 (tlnext); PF3 null -> COMEN1A |
| COTRN1A | TranViewCard | TRNIDIN tv.tid | ENTER (tranview); PF4 'F4=Clear' null (keeps tv.tid, clears the detail); PF3 'F3=Back' (back, to = tv.from, with tl); PF5, PF9 not reachable |
| COTRN2A | TranAddCard | ACTIDIN acct, CARDNIN card, TTYPCD type, TCATCD cat, TRNSRC src, TDESC desc, TRNAMT amt, TORIGDT od, TPROCDT pd, MID mid, MNAME mname, MCITY mcity, MZIP mzip, CONFIRM conf (ta.*) | ENTER (taadd); PF5 'F5=Copy Last Tran.' (tacopy); PF4 'F4=Clear' null + clear_form; PF3 null -> COMEN1A; PF9 not reachable |
| CORPT0A | ReportCard | CONFIRM rp.conf; SDT*/EDT* through compose | ENTER (report); PF3 null -> COMEN1A; PF5 not reachable. MONTHLY/YEARLY/CUSTOM not mapped (see 4) |
| COBIL0A | BillPayCard | ACTIDIN bp.acct, CONFIRM bp.conf; CURBAL shown from bp.bal | ENTER (billpay); PF4 'F4=Clear' null + clear_form; PF3 null -> COMEN1A; PF5 not reachable |
| COUSR0A | UserListCard | USRIDIN ul.uid, SEL0001-0010 ul.s0-9 | ENTER (ulenter); PF7 (ulprev); PF8 (ulnext); PF3 null -> COADM1A |
| COUSR1A | UserAddCard | FNAME, LNAME, USERID, PASSWD, USRTYPE (ua.*) | ENTER (uaadd); PF4 null + clear_form; PF3 null -> COADM1A; PF9 not reachable |
| COUSR2A | UserUpdCard | USRIDIN uu.uid, FNAME, LNAME, PASSWD, USRTYPE (uu.*) | ENTER 'Enter=Fetch' (uuget); PF5 'F5=Save' (uusave); PF4 null + clear_form; PF3 'F3=Back' (back, to = uu.from, with ul); PF12 not reachable |
| COUSR3A | UserDelCard | USRIDIN ud.uid; FNAME/LNAME/USRTYPE shown from ud.* | ENTER 'Enter=Fetch' (udget); PF5 'F5=Delete' (uddel); PF4 null + clear_form; PF3 'F3=Back' (back, to = ud.from); PF12 not reachable |
| TEXT | ByeCard | none | none (static TEXT 'Thank you for using CardDemo application...') |

Static texts: COMEN1A OPTN001-OPTN011 and COADM1A OPTN001-OPTN006 from the MARKDOWN option lists ('1. Account View' ...
'11. Pending Authorization View'; '1. User List (Security)' ... '6. Transaction Type Maintenance'). No element: COMEN1A OPTN012,
COADM1A OPTN007-012.

List rows are plain show paths (the build holds rows as cl.r0..r6 / tl.r0..r9 / ul.r0..r9 objects, not a list, so `rows`/`select`
does not apply): ACCTNO{n}/CRDNUM{n}/CRDSTS{n} <- cl.r{n-1}.acct/card/act, PAGENO <- cl.page; TRNID{nn}/TDATE{nn}/TDESC{nn}/TAMT{nnn}
<- tl.r*.tid/date/desc/amt, PAGENUM <- tl.page; USRID{nn}/FNAME{nn}/LNAME{nn}/UTYPE{nn} <- ul.r*.uid/fname/lname/utype, PAGENUM <- ul.page.
A typed selection code goes into the row's selection input (cl.s*/tl.s*/ul.s*), and the list Enter sends it; the build itself picks
the row (S/U on cards, S on transactions, U/D on users).

Navigating actions (menu Enter, admin Enter, list Enter, the Back workflows) show the target card's fields from the response:
ACCTSID `av.acct|au.acct|cv.acct|cu.acct|cl.acct`, CARDSID `cv.card|cu.card|cl.card`, TRNIDIN `tl.tid|tv.tid`, USRIDIN
`uu.uid|ud.uid|ul.uid`, FNAME/LNAME/USRTYPE `uu.*|ud.*`, ACSTNUM `au.e.cid`, CRDNAME/CRDSTCD/EXPMON/EXPYEAR `cu.*` (menu only),
the list rows, the selection fields, and the messages.

## 3. Instrument fix 7

compose (screen; literal text from the build's label or placeholder):
- CACTUPA au.e.open `{OPNYEAR}-{OPNMON}-{OPNDAY}`, au.e.exp `{EXPYEAR}-{EXPMON}-{EXPDAY}`, au.e.reiss `{RISYEAR}-{RISMON}-{RISDAY}`,
  au.e.dob `{DOBYEAR}-{DOBMON}-{DOBDAY}`: labels 'Opened (YYYY-MM-DD)', 'Expiry (YYYY-MM-DD)', 'Reissue (YYYY-MM-DD)',
  'Date of birth (YYYY-MM-DD)'. Browser: inputs 2, 3, 4, 14.
- CORPT0A rp.sd `{SDTYYYY}-{SDTMM}-{SDTDD}`, rp.ed `{EDTYYYY}-{EDTMM}-{EDTDD}`: placeholder 'YYYY-MM-DD'. Browser: inputs 0, 1.

split (action; literal text from the dispatcher's own display strings, which the page shows as they are):
- CACTVWA (acctview Enter): avd.status 'Active Y/N: {ACSTTUS}', avd.open 'Opened: {ADTOPEN}', avd.exp 'Expiry: {AEXPDT}',
  avd.reiss 'Reissue: {AREISDT}', avd.climit 'Credit Limit: {ACRDLIM}', avd.cashlim 'Cash credit Limit: {ACSHLIM}',
  avd.bal 'Current Balance: {ACURBAL}', avd.cycc 'Current Cycle Credit: {ACRCYCR}', avd.cycd 'Current Cycle Debit: {ACRCYDB}',
  avd.group 'Account Group: {AADDGRP}', avd.cid 'Customer id: {ACSTNUM}', avd.ssn 'SSN: {ACSTSSN}', avd.dob 'Date of birth: {ACSTDOB}',
  avd.fico 'FICO Score: {ACSTFCO}', avd.fname 'First Name: {ACSFNAM}', avd.mname 'Middle Name: {ACSMNAM}', avd.lname 'Last Name: {ACSLNAM}',
  avd.a1 'Address: {ACSADL1}', avd.a2 'Address line 2: {ACSADL2}', avd.a3 'City: {ACSCITY}', avd.state 'State: {ACSSTTE}',
  avd.zip 'Zip: {ACSZIPC}', avd.country 'Country: {ACSCTRY}', avd.ph1 'Phone 1: {ACSPHN1}', avd.ph2 'Phone 2: {ACSPHN2}',
  avd.govt 'Government Issued Id Ref: {ACSGOVT}', avd.eft 'EFT Account Id: {ACSEFTC}', avd.pri 'Primary Card Holder Y/N: {ACSPFLG}'.
  avd.acct ('Account Number: ...') repeats the ACCTSID input and is not split.
- CCRDSLA (cardview Enter and card-list Enter): cvd.name 'Name on card: {CRDNAME}', cvd.active 'Card Active Y/N: {CRDSTCD}',
  cvd.exp 'Expiry Date: {EXPMON}/{EXPYEAR}'.
- COTRN1A (tranview Enter and transaction-list Enter): tvd.tid 'Transaction ID: {TRNID}', tvd.card 'Card Number: {CARDNUM}',
  tvd.type 'Type CD: {TTYPCD}', tvd.cat 'Category CD: {TCATCD}', tvd.src 'Source: {TRNSRC}', tvd.desc 'Description: {TDESC}',
  tvd.amt 'Amount: {TRNAMT}', tvd.od 'Orig Date: {TORIGDT}', tvd.pd 'Proc Date: {TPROCDT}', tvd.mid 'Merchant ID: {MID}',
  tvd.mname 'Merchant Name: {MNAME}', tvd.mcity 'Merchant City: {MCITY}', tvd.mzip 'Merchant Zip: {MZIP}'.

Totals: 6 compose templates, 44 split templates.

## 4. Readings chosen, and what is not reachable

1. **ENTER on CACTUPA and CCRDUPA = 'Enter=Validate'** (auval/cuval), because that is the button whose label carries the key
   (assumption A5: PF keys and Enter are carried in the labels). 'Fetch account'/'Fetch card' carry no key and get no AID. On the
   page 'Enter=Validate' is hidden while the card is in its SEARCH step; at the workflow level the replay runs auval/cuval there
   (answer: the first validation message of an empty edit), in the browser the button is not visible (step not driven).
   Alternative reading, not used and for the reviewer: ENTER -> auget/cuget in the SEARCH step and auval/cuval after it. The
   instrument has no state-dependent AID. This choice decides most CACTUPA and CCRDUPA steps (68 and 27 legacy ENTERs).
2. **CORPT0A report type.** The page has a SELECT `rp.type` (values MONTHLY, YEARLY, CUSTOM). The legacy types any character in
   one of three fields. A typed 'X' has no pure correspondence to a select value, so MONTHLY/YEARLY/CUSTOM are not mapped: those
   steps note "field ... has no input on the page" and the report action runs with an empty type ("Select a report type to print
   report..."). Every report step that needs a type is affected (o2-rpt-01..03).
3. **Menu F3 -> TEXT.** The build's F3=Exit on MENU and ADMIN is a UI event to BYE (legacy: back to COSGN0A). Mapped as the page
   does it; the next legacy PF3 on COSGN0A (o-mnu-01 step 6) then has no button on TEXT.
4. **Not reachable** (13 legacy AIDs): CACTVWA PF5, CCRDUPA PF9, COADM1A PF5, COBIL0A PF5, COMEN1A PF5, CORPT0A PF5, COSGN0A PF5,
   COTRN1A PF5 and PF9, COTRN2A PF9, COUSR1A PF9, COUSR2A PF12, COUSR3A PF12. Mapped: 51 of the 64 legacy AIDs that occur in the
   cases (LEGACY_NEEDS.txt).
5. **Session keys, not form keys**, for card state the page keeps but does not show as an input (paging keys, row objects,
   au.step/o/rv/e.cid, cu.step/o/from, cv.from, tv.from, uu.loaded/from, ud.*). They are written only by actions whose last pass
   returns that state.
6. **CACTVWA form after Enter**: av.acct is not mapped back from the response, because the failed-fetch paths return no `av`
   (the typed value stays in the form, as on the page).

Instrument limits this map cannot avoid (reported, not worked around):
- (a) the adapter clears the form on a screen change: a value a navigating response puts into the target card's inputs (menu
  prefill of ACCTSID/CARDSID, a list selection landing on CCRDSLA/CCRDUPA/COTRN1A/COUSR2A/COUSR3A, Back to a filtered list) is
  displayed through `show` but not sent by the next action unless the step types it. This breaks the follow-on steps of
  o2-cup-03 (U from the list, then edit and PF5), o2-uup-01 and o2-udl-01 (U/D from the list, then PF5): the page would send the
  loaded values, the adapter sends empty ones.
- (b) hide rules are not modelled at the workflow level (see 1).
- (c) `split` runs after `show` and is not target-aware: card-list Enter splits cvd.* for CCRDSLA, so a U selection that lands on
  CCRDUPA shows CRDNAME/CRDSTCD/EXPMON/EXPYEAR blank at arrival (o2-cup-03).
- (d) a list Enter that lands on a view/update card while the list filter is filled gives the fix-6 ambiguity marker for
  ACCTSID/CARDSID, TRNIDIN, USRIDIN. In the cases the filters are blank at those steps.
- (e) the page hides 'Page N' when N is 0; the adapter shows PAGENO/PAGENUM as the number.
- (f) F4 on COUSR2A/COUSR3A resets uu.from/ud.from to ADMIN on the page; a workflow-null action cannot write the adapter session.

## 5. Browser section

Detect is a button name unique to the page. Unique names exist only for COSGN0A '^sign on \(enter\)$', CACTUPA '^fetch account$',
CCRDUPA '^fetch card$', COTRN2A '^f5=copy last tran\.$', COUSR3A '^f5=delete$' (visible only after a fetch). All other cards
share their button sets (MENU/ADMIN; the three lists; ACCTVIEW/CARDVIEW/REPORT; TRANVIEW/BILLPAY/USERADD; USERUPD shares
'Enter=Fetch' with USERDEL), so their detect is null: the browser check cannot tell them apart by button name. Card titles
would ('Main Menu', 'Admin Menu', 'View Account', 'List Credit Cards', 'View Credit Card Detail', 'List Transactions',
'View Transaction', 'Transaction Reports', 'Bill Payment', 'List Users', 'Add User', 'Update User'); the check has no title
detection, which is a coordinator decision. text_detect 'thank you for using carddemo'. Input indexes count visible inputs with
the edit forms shown (CACTUPA and CCRDUPA in EDIT, COUSR2A loaded); CORPT0A assumes the SELECT is not an `<input>` (unverified).

## 6. Stores

USRSEC users 84c242c1…, ACCTDAT accounts c3b1dd7e…, CUSTDAT customers f1028500…, CCXREF card_xref 8adfdb04…, CARDDAT cards
ab118992…, TRANSACT transactions 79bc27a0…, JOBS job_requests b9297481…. Field names and types are the contract's
(data_types.txt), so `fields` is identity and there is no `as_text`. No loader (the build has none, D4).

## 7. Batch (batch_map.json)

Context: workspace <uuid>, app <uuid>, version
<uuid>. Every batch workflow reads a file through `getIn(base)`, which accepts `base`, `base_dat`,
`base.dat`, `base_txt`, `base.txt`, `base_json`, `base.json` or `files.<name>`; START keys are the base names. END payload
`${result}` (posttran: an explicit object of the six posttran_* keys); outputs are keys named as the contract files without
extension, return code `<step>_rc` (written only when non-zero; 999 on a missing input). A missing input is left out (`omit`).

| Step | Workflow | START keys | END keys |
|---|---|---|---|
| acctext | batch_cbact01c c027b810… | acctdata | acctext_out, acctext_array, acctext_vb, acctext_sysout, acctext_rc |
| cardprint | batch_cbact02c 99496ad0… | carddata | cardprint_sysout, cardprint_rc |
| xrefprint | batch_cbact03c ba0d6d16… | cardxref | xrefprint_sysout, xrefprint_rc |
| custprint | batch_cbcus01c f15d4578… | custdata | custprint_sysout, custprint_rc |
| dailycheck | batch_cbtrn01c d1aed9de… | dailytran, cardxref, acctdata (read); custdata, carddata, transact (sent under their base names, not read: B10) | dailycheck_sysout, dailycheck_rc |
| export | batch_cbexport 4ae60fc1… | custdata, acctdata, cardxref, transact, carddata | export, export_sysout, export_rc |
| import | batch_cbimport 72f3cb3b… | export (list or JSON string) | import_customers/accounts/card_xref/transactions/cards, import_errors, import_sysout, import_rc |
| posttran | batch_posttran cb3b0638… | map dailytran, acctdata, cardxref, tcatbal (business_date not read: RUN_TIMESTAMP) | decode null (posttran_* at top level) |
| intcalc | batch_intcalc 81a650b5… | map acctdata, tcatbal, discgrp, cardxref, intcalc_parm -> `parm` | decode null (result.intcalc_*) |
| creastmt | batch_creastmt 7a17128f… | map transact, acctdata, cardxref, custdata | decode null (result.creastmt_statements(_html), lists of lines) |
| tranrept | batch_tranrept 0da36936… | map transact, cardxref, trantype, trancatg, start_date, end_date | decode null (result.tranrept_report) |

Record field names of every output are the contract's (checked in the scripts: acctOut, tranOut, the export/import field lists),
so `fields` is empty. COMBTRAN (batch_combtran cf034ce2…) exists but is not one of the steps this instrument runs.

## 8. Flags (flags.json, 144 entries)

Rule: an entry of the register that records a choice where the wiki or contract is silent or uncertain, mapped to the units it
governs, with case/step/screen/field selectors wherever the units can be named. Entries that restate the wiki or contract, or
govern no scored unit, are not flagged.

| Entry | Rule(s) | Selectors |
|---|---|---|
| A7 dates YYYY-MM-DD | R-ONL-FIELD | CACTVWA ADTOPEN/AEXPDT/AREISDT/ACSTDOB; COTRN1A and COTRN2A TORIGDT/TPROCDT; CACTUPA OPN*/EXP*/RIS*/DOB*; CORPT0A SDT*/EDT* (26) |
| U2 exit | R-ONL-MSG | screen TEXT, field TEXT |
| U2 exit from a menu | R-ONL-NAV, MSG, FIELD | screen COSGN0A at o-avw-01 s6, o-bil-01 s7, o-mnu-01 s5, o2-adm-01 s11, o2-usl-01 s11 |
| U3 options not installed | R-ONL-MSG ERRMSG | o-mnu-01 s4 (COMEN1A); o2-adm-01 s7, s8, o2-usl-01 s8 (COADM1A) |
| U5 prefill on arrival | R-ONL-FIELD ACCTSID (+CARDSID) | the 18 menu-arrival steps on CACTVWA, CACTUPA, CCRDSLA, CCRDUPA |
| U6 first xref card | R-ONL-MSG, FIELD | o-avw-05 s4 CACTVWA |
| U9 no state/zip check | R-ONL-MSG | o2-aup-02 s7, o2-aup-05 s31 CACTUPA |
| U10 phone/SSN/EFT texts | R-ONL-MSG ERRMSG | o2-aup-05 s15, s27, s29; o2-aup-07 s15-s17, s19, s20 (not the NANP area-code and 'cannot be zero' phone steps: rules the entry does not mention) |
| U11 optimistic lock | R-ONL-MSG, FIELD | o2-aup-04 s7, o2-aup-06 s7 CACTUPA |
| U13 card read by card and account | R-ONL-MSG, FIELD | o2-csl-02 s7 CCRDSLA |
| U18 account wins | R-ONL-FIELD ACTIDIN/CARDNIN; R-ONL-TRAN | o2-tad-01 s5, o2-tad-04 s5, s6 COTRN2A; TRANSACT 0000000996722788 in o2-tad-01, o2-tad-04 |
| U21 copy = highest id | R-ONL-FIELD, MSG; R-ONL-TRAN | o2-tad-04 s5 COTRN2A; TRANSACT 0000000996722788 in o2-tad-04 |
| U23 report success text, form cleared | R-ONL-MSG, FIELD | o2-rpt-01 s9, o2-rpt-02 s4, o2-rpt-03 s17, s18 CORPT0A |
| U25 payment card | R-ONL-TRAN | o-bil-05 TRANSACT 0000000996722788 |
| U26 merchant city/zip N/A | R-ONL-TRAN | o-bil-01, 03, 04, 05 TRANSACT 0000000996722788 |
| U30 blank password keeps | R-ONL-MSG ERRMSG; R-ONL-FILE | o2-uup-01 s5, s6, o2-uup-02 s8 COUSR2A; USRSEC USER0001 (o2-uup-01), USER0002 (o2-uup-02) |
| U31 fetch prompts | R-ONL-MSG ERRMSG | o2-uup-01 s4, o2-uup-02 s6 (COUSR2A); o2-udl-01 s4, o2-udl-02 s6 (COUSR3A) |
| B9 missing input | R-BAT-RC (RC), R-BAT-LINE | f-act-03, f-crd-03, f-cus-02, f-exp-03, f-imp-04, f-xrf-02 |
| B10 CBTRN01C inputs | R-BAT-RC, R-BAT-LINE | f-trn-04 |
| B11 print once, trimmed | R-BAT-LINE | f-crd-01, f-cus-01, f-xrf-01 |
| B14 unknown type message | R-BAT-REC | f-imp-03 import_errors:1, import_errors:2 |
| B4 last check wins | R-POST-PRECEDENCE | rule-wide (core scorer) |
| B5 truncation; interest id | R-INT-TRUNC, R-INT-TXID | rule-wide |
| B7 first-word name | R-STMT-NAME | rule-wide |

Not flagged: A1-A6, A8, A9, D1-D5, U1, U4, U7, U8 (the review table maps to no legacy field), U12 (its only unit, o2-ccl-04 s5,
is excluded), U14, U15, U16 and U17 (no case types a short id), U19 (time part masked by the scorer), U20, U22, U24, U27, U28,
U29 (no case types an invalid user type), B1-B3, B6 (COMBTRAN not run here), B8, B12, B13, B15, section 5. Core rules whose scope
is wider than the entry were left out: B5's "card is the first xref card" (R-INT-TXFORMAT also covers other fields) and B7's city
line (R-STMT-ADDR also covers address lines 1-2).

## 9. Check outputs

```
$ python3 tools/adapter_full.py check runs/full/zflx/r3/map.json
map ok
$ python3 tools/full_batch_exec.py check runs/full/zflx/r3/batch_map.json
map ok
$ python3 tools/full_batch_exec.py requests runs/full/zflx/r3/batch_map.json /tmp/a32_r3_req
map ok
43 requests
```

The map check reports no missing loader because it does not check loaders; the map has none. The first batch check reported
`dailycheck: input custdata.dat / transact.dat / carddata.dat has no START key` (cases f-trn-01..04 give six files); those three
are now sent under their base names, which the build accepts and does not read (B10).

Offline smoke test (no FlowX; a stub that answers each workflow call with the legacy step's screen value): all 55 cases replay
without error; the steps not driven are exactly the 13 unreachable AIDs plus o-mnu-01 step 6 (PF3 on TEXT, after the menu F3
went to TEXT); the only other screen differences are the five menu-PF3 steps (TEXT, legacy COSGN0A); "no input on the page"
appears only for CORPT0A MONTHLY/YEARLY/CUSTOM.

## 10. After fixes 8–10

Updated 2026-11-03 after the coordinator's rulings on instrument fixes 8–10. Still definitions only: no FlowX/zflx/MCP
call, no run output read. Only `map.json` and this file changed; `batch_map.json` and `flags.json` are unchanged. Where
this section disagrees with sections 4–5 and 9, this section holds (map notes 8, 10, 12 and 13 in `map.json` are rewritten
to match).

**Ruling 1, mode-dependent keys (fix 9 conditional AIDs).** The step is read from the adapter session, which every
response that returns the card state writes (menu option 2/5 resets au.step/cu.step to SEARCH; a list U/D selection
fetches and returns EDIT / loaded "Y"). First match wins; an absent key reads as "".

| Screen | Key | au_step / cu_step / loaded | Action |
|---|---|---|---|
| CACTUPA | ENTER | SEARCH or "" | auget ('Fetch account') |
| CACTUPA | ENTER | EDIT, CONFIRM | auval ('Enter=Validate') |
| CACTUPA | PF5 | CONFIRM | ausave ('F5=Save'); otherwise not reachable |
| CACTUPA | PF12 | EDIT, CONFIRM | aucancel ('F12=Cancel'); otherwise not reachable |
| CCRDUPA | ENTER / PF5 / PF12 | same as CACTUPA, cu_step | cuget / cuval / cusave / cucancel |
| COUSR2A | PF5 | uu_loaded = Y | uusave ('F5=Save'); otherwise not reachable |
| COUSR3A | PF5 | ud_loaded = Y | uddel ('F5=Delete'); otherwise not reachable |

These follow the build's hide rules exactly (AuValidate/CuValidate hidden in SEARCH, AuSave/CuSave hidden unless
CONFIRM, AuCancel/CuCancel hidden in SEARCH, UuSave/UdDelete hidden unless loaded = "Y"). Note from the definition: a
successful save returns the card to EDIT, not SEARCH, so an ENTER after a save is Validate.

**Ruling 2, report type (fix 8 choose).** CORPT0A: `"choose": [{"key": "rp.type", "values": {"MONTHLY": "MONTHLY",
"YEARLY": "YEARLY", "CUSTOM": "CUSTOM"}}]`; MONTHLY/YEARLY/CUSTOM added to the screen's display. Browser: combo
`{"open": "^report type", "options": {"MONTHLY": "^monthly", "YEARLY": "^yearly", "CUSTOM": "^custom"}}` (labels
'Monthly (Current Month)', 'Yearly (Current Year)', 'Custom (Date Range)').

**Ruling 3, browser titles.** Every one of the 17 screens has `"title": "^<card title>$"` from the ui_flow card titles
(section 5 list plus 'Signon to CardDemo', 'Update Account', 'Update Credit Card Details', 'Add Transaction', 'Delete User').
`detect` is kept only where the button is always visible (COSGN0A, CACTUPA, CCRDUPA, COTRN2A); COUSR3A's detect
('F5=Delete', visible only after a fetch) is dropped, since title and detect must both hold. TEXT stays on `text_detect`.

**Ruling 4, carry (fix 8).** Every navigating action now maps the target cards' input boxes through `form`, so the value a
response puts there is carried across the screen change, displayed, and sent by the next action: signon (mn.opt, am.opt),
menu ENTER (mn.opt, av.acct, au.*, cl.*, cv.*, cu.*, tl.*, tv.tid, ta.*, rp.*, bp.*), admin ENTER (am.opt, ul.*, ua.*,
uu.*, ud.uid), card-list actions (cl.*, cv.*, cu.*), Back to the card list (cl.*), transaction-list actions (tl.*, tv.tid),
Back to the transaction list (tl.*), user-list actions (ul.*, uu.*, ud.uid), Back to the user list (ul.*). The input
`show` alternations that this replaced (ACCTSID/CARDSID `cv.acct|cu.acct|cl.acct`, TRNIDIN `tl.tid|tv.tid`, USRIDIN
`uu.uid|ud.uid|ul.uid`, the CU texts, the row-selection marks) are removed, so limits (a) and (d) of section 4 are
resolved. Non-input texts stay in `show` (rows, page numbers, ACSTNUM, CURBAL, the COUSR3A FNAME/LNAME/USRTYPE texts as
`uu.x|ud.x`, messages). `row_session` is not used: the build's rows are fixed state keys (cl.r0.., tl.r0.., ul.r0..), not
lists, and no target card has an on_load.

**Limits that remain (reported).**
- (c) split is not target-aware: on card-list Enter the CCRDSLA texts are split from cvd.*; on a U selection landing on
  CCRDUPA the split's CRDNAME/CRDSTCD/EXPMON/EXPYEAR (blank) override the carried cu.* boxes at arrival. Left as is per
  the ruling.
- Browser, CACTUPA/CCRDUPA ENTER: the browser AID is a single regex and `clickVisible` clicks the first visible match in
  DOM order. 'Fetch account'/'Fetch card' are never hidden and come before 'Enter=Validate' (AuKeys/CuKeys), so an
  alternation `^(fetch account|enter=validate)$` would click Fetch in every step (a re-fetch in EDIT/CONFIRM, discarding
  edits). The browser ENTER stays `^enter=validate$`: a search-step ENTER finds no visible button in the browser (not
  reached there), while the adapter replay maps it to Fetch. A browser `when` (or a hidden-aware alternation) would close
  this; that is an instrument choice for the coordinator. PF5/PF12 in the wrong step are not visible in the browser either,
  which matches the adapter's "not reachable".
- (e) PAGENO/PAGENUM 0 and (f) uu/ud `from` as in section 4.

**Counts before / after (offline stub replay, 55 cases, 473 steps; stub answers each workflow call with the legacy step's
screen and, for the update cards, the step/loaded value the dispatcher sets on success).**

| | Before fixes 8–10 | After |
|---|---|---|
| Legacy (screen, AID) pairs | 64 | 64 |
| mapped unconditionally | 51 | 43 |
| mapped conditionally (fix 9) | 0 | 8 (CACTUPA ENTER/PF5/PF12, CCRDUPA ENTER/PF5/PF12, COUSR2A PF5, COUSR3A PF5) |
| unmapped (no button carries the key) | 13 | 13 (unchanged list, section 4) |
| steps not reached | 14 | 14 (the 13 unmapped AIDs + o-mnu-01 step 6, PF3 on TEXT) |
| steps not reached because of a step condition | n/a | 0 |
| "no input on the page" notes | 20 (CORPT0A MONTHLY 4, YEARLY 1, CUSTOM 15) | 0 |
| screen differences vs legacy | 6 (5 menu-PF3 TEXT vs COSGN0A + o2-trv-01 step 10, stub artifact) | 6 (same) |
| update-card calls | auval 68, cuval 24 | auget 7 + auval 61, cuget 4 + cuval 20 (search-step ENTERs now Fetch) |

With a stub that returns no step at all (every step reads ""), 19 more steps are not reached (PF5/PF12 on the update
cards); that is the expected effect of the condition when the build does not report its step, not a map gap.

Check outputs after the update:

```
$ python3 tools/adapter_full.py check runs/full/zflx/r3/map.json
map ok
$ python3 tools/full_batch_exec.py check runs/full/zflx/r3/batch_map.json
map ok
$ python3 tools/full_batch_exec.py requests runs/full/zflx/r3/batch_map.json <scratch>/req
map ok
43 requests
$ python3 tools/selftest_fix8.py   -> fix 8 self-test: 10/10
$ python3 tools/selftest_fix9.py   -> fix 9 self-test: 6/6
```
