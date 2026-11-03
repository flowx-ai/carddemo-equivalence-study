# Workflow: LedgerlineAccrue

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae203343695c563ea50b2a5 | <uuid> | (0, 0) | → ParseAccrueInputs (seq:<uuid>) |
| End | END | 6ae203343695c563ea50b2a6 | <uuid> | (1500, 0) | — |
| ParseAccrueInputs | SCRIPT | 6ae203343695c563ea50b2a7 | <uuid> | (300, 0) | → CalculateAccrueInterest (seq:<uuid>) | lang: JAVASCRIPT |
| CalculateAccrueInterest | SCRIPT | 6ae203353695c563ea50b2a8 | <uuid> | (600, 0) | → FormatAccrueOutputs (seq:<uuid>) | lang: JAVASCRIPT |
| FormatAccrueOutputs | SCRIPT | 6ae203353695c563ea50b2a9 | <uuid> | (900, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae203353695c563ea50b2aa | <uuid> | (1200, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### ParseAccrueInputs (SCRIPT, id=6ae203343695c563ea50b2a7)

```javascript
var p = {accounts: [], links: [], balances: [], rates: [], errors: [], accrueParameter: String(input.accrueParameter == null ? '2022071800' : input.accrueParameter).padEnd(10, ' ').slice(0,10)};
function readLines(key, min, width) {
  if (typeof input[key] !== 'string') { p.errors.push('Input contents unavailable: ' + key); return []; }
  var text = input[key];
  if (text === '') return [];
  var rows = text.split('\n');
  if (rows[rows.length - 1] === '') rows.pop();
  return rows.map(function(row, index) {
    if (row.endsWith('\r')) row = row.slice(0,-1);
    if (row.length < min || row.length > width) p.errors.push('Record length outside supported layout: ' + key + ' record ' + (index + 1));
    return row.padEnd(width, ' ');
  });
}
var acc = readLines('ledgacc',122,300);
var link = readLines('cardlink',36,50);
var bal = readLines('balcat',28,50);
var rate = readLines('rategrp',22,50);
var accountKeys = {}, cardKeys = {}, linkAccountKeys = {}, balanceKeys = {}, rateKeys = {};
function unique(map, key, label) {
  var safe = 'k' + key;
  if (Object.prototype.hasOwnProperty.call(map, safe)) p.errors.push('Duplicate indexed key: ' + label);
  map[safe] = true;
}
acc.forEach(function(r) { var id=r.slice(0,11); unique(accountKeys,id,'account'); p.accounts.push({id:id,raw:r}); });
link.forEach(function(r) { var card=r.slice(0,16), id=r.slice(25,36); unique(cardKeys,card,'card link primary'); unique(linkAccountKeys,id,'card link alternate account'); p.links.push({id:id,card:card}); });
bal.forEach(function(r) { var key=r.slice(0,17); unique(balanceKeys,key,'category balance'); p.balances.push({key:key,id:r.slice(0,11),type:r.slice(11,13),category:r.slice(13,17),amount:r.slice(17,28)}); });
rate.forEach(function(r) { var key=r.slice(0,16); unique(rateKeys,key,'rate group'); p.rates.push({key:key,amount:r.slice(16,22)}); });
p.balances.sort(function(a,b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
output = {parsedAccrue:p};
```

### CalculateAccrueInterest (SCRIPT, id=6ae203353695c563ea50b2a8)

```javascript
var p = input.parsedAccrue || {accounts:[],links:[],balances:[],rates:[],errors:['Parsed inputs unavailable'],accrueParameter:'2022071800'};
var c = {accounts:(p.accounts || []).map(function(a){return {id:a.id,raw:a.raw};}),transactions:[],diagnostics:(p.errors || []).slice(),returnCode:0,status:'COMPLETED'};
function decimal(raw) {
  var last=raw.slice(-1), digit=last, negative=false;
  var pos='{ABCDEFGHI'.indexOf(last), neg='}JKLMNOPQR'.indexOf(last), ascii='pqrstuvwxy'.indexOf(last);
  if (pos >= 0) digit=String(pos);
  else if (neg >= 0) {digit=String(neg);negative=true;}
  else if (ascii >= 0) {digit=String(ascii);negative=true;}
  var digits=raw.slice(0,-1)+digit;
  if (!/^\d+$/.test(digits)) throw new Error('Invalid numeric field used in interest calculation');
  var n=BigInt(digits); return negative ? -n : n;
}
function limited(n,digits) { return n % (10n ** BigInt(digits)); }
function money(n) {var negative=n<0n;var s=(negative?-n:n).toString().padStart(3,'0');return (negative?'-':'')+s.slice(0,-2)+'.'+s.slice(-2);}
function clock() { var s=new Date().toISOString(); return s.slice(0,10)+'-'+s.slice(11,13)+'.'+s.slice(14,16)+'.'+s.slice(17,19)+'.'+s.slice(20,22)+'0000'; }
function abend(messages) { messages.forEach(function(m){c.diagnostics.push(m);}); c.diagnostics.push('ABENDING PROGRAM'); c.diagnostics.push('LXZ009D ABEND CALLED'); c.returnCode=16;c.status='FAILED'; }
var accounts={},links={},rates={};
c.accounts.forEach(function(a){accounts['k'+a.id]=a;});
(p.links || []).forEach(function(l){links['k'+l.id]=l;});
(p.rates || []).forEach(function(r){rates['k'+r.key]=r;});
var current=null, currentLink=null, total=0n, suffix=0;
if(c.diagnostics.length) {
  abend(['Input contents cannot represent the supported indexed-file run']);
} else {
  try {
    for(var i=0;i<(p.balances || []).length;i++) {
      var b=p.balances[i];
      if(!current || current.id!==b.id) {
        if(current) {
          current.currBal=money(limited(decimal(current.raw.slice(12,24))+total,12));
          current.currCycCredit='0.00';current.currCycDebit='0.00';
        }
        total=0n;
        current=accounts['k'+b.id];
        if(!current) {abend(['ACCOUNT NOT FOUND: '+b.id,'ERROR READING ACCOUNT FILE','FILE STATUS IS: NNNN0023']);break;}
        currentLink=links['k'+b.id];
        if(!currentLink) {abend(['ACCOUNT NOT FOUND: '+b.id,'ERROR READING XREF FILE','FILE STATUS IS: NNNN0023']);break;}
      }
      var rateKey=current.raw.slice(112,122)+b.type+b.category;
      var r=rates['k'+rateKey];
      if(!r) {
        c.diagnostics.push('DISCLOSURE GROUP RECORD MISSING');c.diagnostics.push('TRY WITH STANDARD GROUP CODE');
        r=rates['k'+'STANDARD  '+b.type+b.category];
        if(!r) {abend(['ERROR READING STANDARD DISCLOSURE GROUP','FILE STATUS IS: NNNN0023']);break;}
      }
      var rateValue=decimal(r.amount);
      if(rateValue!==0n) {
        var amount=limited((decimal(b.amount)*rateValue)/120000n,11);
        total=limited(total+amount,11);
        suffix=(suffix+1)%1000000;
        var ts=clock();
        c.transactions.push({tran_id:p.accrueParameter+String(suffix).padStart(6,'0'),type_cd:'07',cat_cd:12,source:'Batch',desc:'Accrued int '+current.id,amt:money(amount),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:currentLink.card.replace(/ +$/,''),orig_ts:ts,proc_ts:ts});
      }
    }
  } catch(e) {abend([String(e.message || e)]);}
}
output={accrueCalculation:c};
```

### FormatAccrueOutputs (SCRIPT, id=6ae203353695c563ea50b2a9)

```javascript
var c=input.accrueCalculation || {accounts:[],transactions:[],status:'FAILED',returnCode:16,diagnostics:['Calculation result unavailable']};
var status=c.status, code=c.returnCode, notes=(c.diagnostics || []).slice(), result=[];
function trim(s){return s.replace(/ +$/,'');}
function cents(raw){var last=raw.slice(-1),d=last,negative=false;var p='{ABCDEFGHI'.indexOf(last),n='}JKLMNOPQR'.indexOf(last),a='pqrstuvwxy'.indexOf(last);if(p>=0)d=String(p);else if(n>=0){d=String(n);negative=true;}else if(a>=0){d=String(a);negative=true;}var s=raw.slice(0,-1)+d;if(!/^\d+$/.test(s))throw new Error('Cannot represent account numeric field in contract JSON');s=s.replace(/^0+(?=\d)/,'').padStart(3,'0');return (negative && /[1-9]/.test(s)?'-':'')+s.slice(0,-2)+'.'+s.slice(-2);}
try {
  result=(c.accounts || []).map(function(a){var r=a.raw;if(!/^\d{11}$/.test(a.id))throw new Error('Cannot represent account identifier in contract JSON');return {acct_id:Number(a.id),active_status:trim(r.slice(11,12)),curr_bal:a.currBal===undefined?cents(r.slice(12,24)):a.currBal,credit_limit:cents(r.slice(24,36)),cash_credit_limit:cents(r.slice(36,48)),open_date:trim(r.slice(48,58)),expiration_date:trim(r.slice(58,68)),reissue_date:trim(r.slice(68,78)),curr_cyc_credit:a.currCycCredit===undefined?cents(r.slice(78,90)):a.currCycCredit,curr_cyc_debit:a.currCycDebit===undefined?cents(r.slice(90,102)):a.currCycDebit,addr_zip:trim(r.slice(102,112)),group_id:trim(r.slice(112,122))};});
} catch(e) {status='FAILED';code=16;notes.push(String(e.message || e));result=[];}
var assumptions=[
'# Ledgerline ACCRUE assumptions',
'',
'## Evidence and delivery',
'- Evidence is accrue-code.pdf, source-code.md / LXB002C.cbl, copybooks LXV022Y, LXV024Y, LXV026Y, LXV027Y and LXV030Y, and CONTRACT.md. The PDF contains no numbered source lines. Each anchor below therefore gives a PDF page, source filename/paragraph and exact statement, or names a setting absent from the supplied source; no line numbers are invented.',
'- The maker chose calculation-only delivery. The caller supplies fixed-width file contents and saves accrue_systxn as accrue_systxn.json, accrue_ledgacc as accrue_ledgacc.json and this assumptions_md text as assumptions.md together. These are returned values, not files created by this workflow. Anchor: CONTRACT.md, accrue-code.pdf p.16, "One JSON file per output: a list of objects, in any order"; the calculation-only exception is the maker\'s explicit answer.',
'- This document is model-authored during implementation from the supplied source and approved decisions, embedded unchanged, and returned on both success and failure. No runtime model interprets customer data or changes interest rules.',
'',
'## Inputs and indexed-file emulation',
'- Only ledgacc.dat (300), cardlink.dat (50), balcat.dat (50) and rategrp.dat (50) are used. Other CONTRACT.md chain inputs are not consumed by this step. Account/category contents must be oracle POSTDAY outputs, not pre-POSTDAY data. Anchors: LXB002C.cbl FILE-CONTROL, pp.2–3, "SELECT BALCAT-FILE", "SELECT LINK-FILE", "SELECT ACCOUNT-FILE", "SELECT RATEGRP-FILE"; CONTRACT.md p.16, "receives the oracle\'s POSTDAY outputs".',
'- Supplied contents use LF or CRLF record separators; a final record separator is ignored, not other blank records. Only trailing carriage-return separators are removed; bytes represented in filler, including NUL, are ignored. A record with its complete meaningful prefix may omit trailing filler; it is space-padded to the copybook width. Oversized records or a missing meaningful prefix fail explicitly. These transport conventions are assumptions: copybooks specify widths but do not define text-dump newline/short-filler conventions (pp.13–14). No validation is added for unread filler, dates or account active status.',
'- Category balances are sorted lexically by the complete 17-character account/type/category key to emulate indexed sequential access, irrespective of supplied text order. Exact fixed-width group/type/category keys retain spaces and leading zeroes. Anchor: LXB002C.cbl p.2, "ORGANIZATION IS INDEXED", "ACCESS MODE IS SEQUENTIAL", "RECORD KEY IS FD-TXN-CAT-KEY"; key layout p.3.',
'- Duplicate primary account, card, category or rate keys, or duplicate alternate card-link account keys, are rejected before calculation as unrepresentable indexed input. Anchor: p.2, "RECORD KEY IS FD-LINK-CRD-NUM" and "ALTERNATE RECORD KEY IS FD-LINK-LACC-ID" without WITH DUPLICATES. The text-to-index build procedure is not supplied, so exact oracle failure timing for invalid duplicate dumps is unknown.',
'- All four content strings must be supplied, including an empty string for an empty file; missing content is an input/open-equivalent failure, while empty balances succeed without updates. Anchor: pp.5–7, OPEN paragraphs and the first EOF read. The source has no separate text-content API, so this mapping is assumed.',
'',
'## Arithmetic and representation',
'- Display numeric fields use implied two decimal places. Accept unsigned display digits, ASCII negative p–y overpunch, and conventional positive { / A–I and negative } / J–R trailing overpunch. These are explicit compatibility assumptions because compiler sign/encoding flags are absent. Digit identifiers remain strings during key lookup and transaction-description generation; only acct_id, cat_cd and merchant_id become contract integers. Anchors: copybook PICTURE clauses pp.13–14 and CONTRACT.md p.16.',
'- Use exact integer arithmetic in implied cents and hundredths of percentage points. Monthly cents are balance-cents multiplied by rate-hundredths divided by 120000, truncated toward zero. This is monthly balance times rate divided by 1200, not daily accrual or compound interest. Anchor: 1300-COMPUTE-INTEREST pp.9–10, "COMPUTE WS-MONTHLY-INT = ( TXN-CAT-BAL * RG-INT-RATE) / 1200"; WS-MONTHLY-INT is S9(09)V99 on p.4 and no ROUNDED phrase appears.',
'- Apply truncation to each monthly amount before addition. For overflow, keep the signed low-order receiving digits: 11 digits including cents for monthly and total interest, 12 for account balances; wrap the six-digit transaction suffix modulo 1000000. Anchors: p.4 "WS-MONTHLY-INT PIC S9(09)V99" and "WS-TOTAL-INT PIC S9(09)V99", p.5 "WS-TRANID-SUFFIX PIC 9(06)", p.13 "LACC-CURR-BAL PIC S9(10)V99"; no ON SIZE ERROR or compiler arithmetic flags are supplied. Digit-loss behaviour is an assumed portability interpretation, not verified oracle behaviour.',
'- Contract amounts are exact two-decimal strings, with zero rendered 0.00 and no negative zero. Only trailing spaces are omitted from output strings; leading spaces remain. Anchor: CONTRACT.md p.16, "Strings may omit trailing spaces" and "Amounts are JSON strings or numbers holding at most two decimals".',
'- Invalid numeric text is diagnosed only when a calculation or contract-field conversion needs it. No account status or date rejection is invented. Invalid account fields that cannot be represented in the contract cause output formatting to fail and return an empty account list rather than invent replacement values; prior transactions remain. Malformed numeric runtime handling is unspecified by the supplied source/compiler settings, so this explicit diagnostic mapping is assumed, not oracle-certified.',
'',
'## Lookup and control-flow decisions',
'- On each new account, load account and link even if the eventual rate is zero. A missing account or card link terminates with code 16. Anchor: main loop p.5, "PERFORM 1100-GET-LACC-DATA" and "PERFORM 1110-GET-LINK-DATA" before rate handling; lookup failure paragraphs pp.8–9; LXZ009D.cbl p.15 "STOP RUN RETURNING 16".',
'- A missing account-group/type/category rate falls back only to the same type/category in the ten-character group STANDARD followed by two spaces. Missing STANDARD is fatal. A found zero rate does not trigger fallback or produce a transaction. Anchors: 1200 and 1200-A p.9, "MOVE STANDARD TO FD-RG-LACC-GROUP-ID" (the source literal is quoted), and main loop p.5 "IF RG-INT-RATE NOT = 0".',
'- Nonzero rates emit a transaction even when cent truncation yields zero, for negative balances as well as positive. No fee is added. Anchors: main loop p.5, the rate check only; 1300 p.10, unconditional "PERFORM 1300-B-WRITE-TX"; 1400-COMPUTE-FEES p.10, "To be implemented" then EXIT.',
'- Previous-account interest is posted only when the next account key is encountered, and that rewrite also zeros its current-cycle credit and debit. The last account is NOT flushed at EOF. Preserve this source quirk, including no rewrite for a single-account or empty batch. Anchor: main loop p.5, "IF BCAT-LACC-ID NOT= WS-LAST-LACC-NUM" and the outer "ELSE PERFORM 1050-UPDATE-ACCOUNT"; 1000 p.7 sets END-OF-FILE to Y; the next PERFORM UNTIL test exits before that outer ELSE; 1050 p.8 adds total interest and zeros both cycle fields.',
'- Preserve all input accounts, including unvisited accounts, in the output. Do not persist changes to external records. Failure preserves prior boundary rewrites and transactions without rolling them back; later records are not processed. Anchors: CONTRACT.md p.16 "for every account"; source REWRITE/WRITE operations pp.8 and 10 followed by immediate abend on failure; no rollback is supplied.',
'- The returned status and diagnostics are adapter metadata, not additional fields inside either contract dataset. COMPLETED has code 0; FAILED has code 16. Expected missing-key diagnostics mirror the source. Actual operating-system open/read/write/close failures cannot be reproduced because this agreed implementation operates on supplied contents, not physical indexed files. Anchors: file-status paragraphs pp.6–13 and abend shim p.15; source has no return-object API.',
'',
'## Transaction text, dates and clock',
'- Default business date is 2022-07-18 and default ACCRUE parameter is 2022071800. Business date is informational: calculation does not read it. The source parameter occupies ten characters, so shorter supplied parameters are right-space-padded and longer ones truncated to ten; the counter is six zero-padded digits beginning 000001. Anchor: CONTRACT.md p.16; p.5 "PARM-DATE PIC X(10)"; 1300-B p.10 "ADD 1 TO WS-TRANID-SUFFIX" and "STRING PARM-DATE, WS-TRANID-SUFFIX DELIMITED BY SIZE INTO TXN-ID"; driver p.15.',
'- Each interest transaction has type 07, numeric category 12, source Batch, description Accrued int followed by one space and the eleven-digit account identifier, zero merchant identifier and blank merchant strings, and the linked card number. Anchors: 1300-B-WRITE-TX p.10, MOVE/STRING assignments; LXV030Y p.14. Unassigned transaction-text tails are assumed space-initialised; compiler/runtime initial-storage policy is absent. Output omits their trailing spaces as permitted by the contract.',
'- Original and processing timestamps are identical for each emitted transaction, sampled from execution time rather than business date. Render YYYY-MM-DD-HH.MM.SS.hh0000, truncating milliseconds to hundredths. Use UTC because host timezone is absent; exact oracle clock parity is not claimed. Anchor: Z-GET-DB2-FORMAT-TIMESTAMP p.12 "MOVE FUNCTION CURRENT-DATE TO COBOL-TS" and "MOVE 0000 TO DB2-REST" (source literal quoted); 1300-B p.10 moves the same DB2-FORMAT-TS to both timestamp fields.',
'',
'## Verification limits',
'- No oracle executable, compiler flags or run fixtures were supplied. Derived examples verify the approved interpretation and contract; they do not certify the unspecified compiler, clock or malformed-input conventions. No source line numbers, live external file writes or oracle comparisons are claimed.'
].join('\n');
output={accrue_systxn:c.transactions || [],accrue_ledgacc:result,assumptions_md:assumptions,status:status,returnCode:code,diagnostics:notes};
```

### Escape text (SCRIPT, id=6ae203353695c563ea50b2aa)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "assumptions_md")), t1: esc(at(input, "status"))}};

```

_(server: 176 ms, 1 API call, 160 ms in API)_
