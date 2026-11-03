# Workflow: accrue_lxb002c

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE batch step (COBOL LXB002C): interest calculation. Inputs: raw contents of balcat.dat, ledgacc.dat, cardlink.dat, rategrp.dat (fixed width, or the JSON list form) + ACCRUE parm. Outputs: accrue_systxn, accrue_ledgacc (CONTRACT.md field names), returnCode, displayLog.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae138033695c563ea509682 | <uuid> | (0, 0) | → LXB002C accrue interest (seq:<uuid>) |
| LXB002C accrue interest | SCRIPT | 6ae138063695c563ea509683 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae138083695c563ea509684 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### LXB002C accrue interest (SCRIPT, id=6ae138063695c563ea509683)

```javascript
// ============================================================================
// LXB002C - Ledgerline ACCRUE step (interest calculation), FlowX SCRIPT node.
// Paragraph names follow the COBOL source; see assumptions.md (A-nn refs).
// Inputs (workflow state, raw file contents as strings):
//   balcat, ledgacc, cardlink, rategrp  - fixed width (one record per line) or
//                                         a JSON list in the CONTRACT.md field names
//   parm                                - ACCRUE PARM, e.g. "2022071800"
// Output:  result = { accrue_systxn, accrue_ledgacc, returnCode, displayLog }
// ============================================================================

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }
function padR(s, n) {
  s = str(s);
  return s.length >= n ? s.substring(0, n) : s + ' '.repeat(n - s.length);
}
function pow10(n) { return BigInt('1' + '0'.repeat(n)); }

// Unsigned DISPLAY numeric PIC 9(n): keep the low-order n digits, zero filled.
function num9(v, n) {
  var s = str(v).trim().replace(/[^0-9]/g, '');
  if (s.length > n) s = s.substring(s.length - n);
  return '0'.repeat(n - s.length) + s;
}

// Signed DISPLAY numeric, sign overpunched on the last byte (A-03).
var OVERPUNCH = { '{': [0, 1], '}': [0, -1] };
'ABCDEFGHI'.split('').forEach(function (c, i) { OVERPUNCH[c] = [i + 1, 1]; });
'JKLMNOPQR'.split('').forEach(function (c, i) { OVERPUNCH[c] = [i + 1, -1]; });
'pqrstuvwxy'.split('').forEach(function (c, i) { OVERPUNCH[c] = [i, -1]; });

// Returns a BigInt in units of 10^-scale.
function decodeSigned(field, scale) {
  var t = str(field).trim();
  if (t === '') return 0n;
  // Text with an explicit point: "-123.45"
  if (/^[+-]?\d*\.\d*[+-]?$/.test(t)) return parseDecimal(t, scale);
  // Separate sign, implied decimal: "-0000012345", "0000012345-"
  if (/^[+-]?\d+[+-]?$/.test(t) && /[+-]/.test(t)) {
    var sv = BigInt(t.replace(/[+-]/g, ''));
    return /-/.test(t) ? -sv : sv;
  }
  var neg = false;
  var last = t.charAt(t.length - 1);
  var body = t.substring(0, t.length - 1);
  var lastDigit;
  if (OVERPUNCH.hasOwnProperty(last)) {
    lastDigit = OVERPUNCH[last][0];
    neg = OVERPUNCH[last][1] < 0;
  } else {
    lastDigit = /[0-9]/.test(last) ? Number(last) : 0;
  }
  var digits = body.replace(/[^0-9]/g, '0') + String(lastDigit);
  var v = BigInt(digits);
  return neg ? -v : v;
}

// Decimal text or JSON number -> BigInt in units of 10^-scale (excess decimals truncated).
function parseDecimal(v, scale) {
  if (typeof v === 'number') v = v.toFixed(scale + 2);
  var t = str(v).trim();
  if (t === '') return 0n;
  var neg = false;
  if (/^-/.test(t) || /-$/.test(t)) neg = true;
  t = t.replace(/[+-]/g, '');
  var parts = t.split('.');
  var ip = (parts[0] || '0').replace(/[^0-9]/g, '') || '0';
  var fp = (parts[1] || '').replace(/[^0-9]/g, '');
  fp = (fp + '0'.repeat(scale)).substring(0, scale);
  var r = BigInt(ip + fp);
  return neg ? -r : r;
}

// High-order truncation into a PIC S9(i)V9(d) field (no ON SIZE ERROR) (A-11).
function fit(v, totalDigits) {
  var m = pow10(totalDigits);
  var neg = v < 0n;
  var a = (neg ? -v : v) % m;
  return neg ? -a : a;
}

function fmt(v, scale) {
  var neg = v < 0n;
  var s = (neg ? -v : v).toString();
  while (s.length <= scale) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - scale) + '.' + s.substring(s.length - scale);
}

// Split a file into fixed-width records (A-02), or parse the JSON list form.
function readFile(content, reclen) {
  var text = str(content);
  if (/^\s*\[/.test(text)) return { json: JSON.parse(text) };
  var recs = [];
  text.split(/\r?\n/).forEach(function (line) {
    if (line.replace(/\s+$/, '') === '') return;
    if (line.length > reclen && line.length % reclen === 0) {
      for (var p = 0; p < line.length; p += reclen) recs.push(line.substring(p, p + reclen));
    } else {
      recs.push(padR(line, reclen));
    }
  });
  return { fixed: recs };
}

// ---------------------------------------------------------------- loaders --
// LXV026Y TXN-CAT-BAL-RECORD (50)
function loadBalcat(content) {
  var f = readFile(content, 50);
  var out = [];
  if (f.json) {
    f.json.forEach(function (j) {
      var acct = num9(j.acct_id, 11), type = padR(j.type_cd, 2), cat = num9(j.cat_cd, 4);
      var bal = parseDecimal(j.bal, 2);
      out.push({ acct: acct, type: type, cat: cat, bal: bal, key: acct + type + cat,
        raw: acct + type + cat + fmt(bal, 2) });
    });
  } else {
    f.fixed.forEach(function (r) {
      out.push({ acct: r.substring(0, 11), type: r.substring(11, 13), cat: r.substring(13, 17),
        bal: decodeSigned(r.substring(17, 28), 2), key: r.substring(0, 17), raw: rtrim(r) });
    });
  }
  // KSDS: unique primary key, first loaded wins (A-04); sequential read in key order (A-01).
  var seen = {}, uniq = [];
  out.forEach(function (b) { if (!seen[b.key]) { seen[b.key] = true; uniq.push(b); } });
  uniq.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
  return uniq;
}

// LXV022Y ACCOUNT-RECORD (300)
function loadLedgacc(content) {
  var f = readFile(content, 300);
  var out = [];
  if (f.json) {
    f.json.forEach(function (j) {
      out.push({
        id: num9(j.acct_id, 11), active_status: padR(j.active_status, 1),
        curr_bal: parseDecimal(j.curr_bal, 2), credit_limit: parseDecimal(j.credit_limit, 2),
        cash_credit_limit: parseDecimal(j.cash_credit_limit, 2),
        open_date: padR(j.open_date, 10), expiration_date: padR(j.expiration_date, 10),
        reissue_date: padR(j.reissue_date, 10),
        curr_cyc_credit: parseDecimal(j.curr_cyc_credit, 2), curr_cyc_debit: parseDecimal(j.curr_cyc_debit, 2),
        addr_zip: padR(j.addr_zip, 10), group_id: padR(j.group_id, 10)
      });
    });
  } else {
    f.fixed.forEach(function (r) {
      out.push({
        id: r.substring(0, 11), active_status: r.substring(11, 12),
        curr_bal: decodeSigned(r.substring(12, 24), 2), credit_limit: decodeSigned(r.substring(24, 36), 2),
        cash_credit_limit: decodeSigned(r.substring(36, 48), 2),
        open_date: r.substring(48, 58), expiration_date: r.substring(58, 68), reissue_date: r.substring(68, 78),
        curr_cyc_credit: decodeSigned(r.substring(78, 90), 2), curr_cyc_debit: decodeSigned(r.substring(90, 102), 2),
        addr_zip: r.substring(102, 112), group_id: r.substring(112, 122)
      });
    });
  }
  var map = {}, keys = [];
  out.forEach(function (a) { if (!map[a.id]) { map[a.id] = a; keys.push(a.id); } });
  keys.sort();
  return { map: map, keys: keys };
}

// LXV024Y CRD-LINK-RECORD (50), read by alternate key LINK-LACC-ID (A-05)
function loadCardlink(content) {
  var f = readFile(content, 50);
  var out = [];
  if (f.json) {
    f.json.forEach(function (j) {
      out.push({ card: padR(j.card_num, 16), clnt: num9(j.cust_id !== undefined ? j.cust_id : j.clnt_id, 9),
        acct: num9(j.acct_id, 11) });
    });
  } else {
    f.fixed.forEach(function (r) {
      out.push({ card: r.substring(0, 16), clnt: r.substring(16, 25), acct: r.substring(25, 36) });
    });
  }
  var byCard = {}, byAcct = {};
  out.forEach(function (l) {
    if (byCard[l.card]) return;          // duplicate primary key rejected
    if (byAcct[l.acct]) return;          // duplicate alternate key rejected (no WITH DUPLICATES)
    byCard[l.card] = l; byAcct[l.acct] = l;
  });
  return byAcct;
}

// LXV027Y RG-GROUP-RECORD (50)
function loadRategrp(content) {
  var f = readFile(content, 50);
  var out = [];
  if (f.json) {
    f.json.forEach(function (j) {
      var g = padR(j.group_id, 10), t = padR(j.type_cd, 2), c = num9(j.cat_cd, 4);
      out.push({ key: g + t + c, rate: parseDecimal(j.int_rate, 2) });
    });
  } else {
    f.fixed.forEach(function (r) {
      out.push({ key: r.substring(0, 16), rate: decodeSigned(r.substring(16, 22), 2) });
    });
  }
  var map = {};
  out.forEach(function (g) { if (!map[g.key]) map[g.key] = g; });
  return map;
}

// ------------------------------------------------------------------ main --
var displayLog = [];
function display(s) { if (displayLog.length < 5000) displayLog.push(s); }

var ABEND = { abend: true };
var returnCode = 0;

function displayIoStatus(status) {
  display('FILE STATUS IS: NNNN' + '00' + status);
}
function abendProgram(message, status) {          // 9999-ABEND-PROGRAM via LXZ009D
  display(message);
  displayIoStatus(status);
  display('ABENDING PROGRAM');
  display('LXZ009D ABEND CALLED');
  returnCode = 16;
  throw ABEND;
}

function z2(n) { return (n < 10 ? '0' : '') + n; }
function db2Timestamp() {                         // Z-GET-DB2-FORMAT-TIMESTAMP (A-09)
  var d = new Date();
  return d.getUTCFullYear() + '-' + z2(d.getUTCMonth() + 1) + '-' + z2(d.getUTCDate()) + '-' +
    z2(d.getUTCHours()) + '.' + z2(d.getUTCMinutes()) + '.' + z2(d.getUTCSeconds()) + '.' +
    z2(Math.floor(d.getUTCMilliseconds() / 10)) + '0000';
}

var parmDate = padR(input.parm, 10);              // PARM-DATE PIC X(10)
var accounts = { map: {}, keys: [] };
var txns = [];

display('START OF EXECUTION OF PROGRAM LXB002C');
try {
  // 0000..0400 OPEN: an absent file is an OPEN failure -> abend (A-12)
  if (input.balcat === null || input.balcat === undefined)
    abendProgram('ERROR OPENING TRANSACTION CATEGORY BALANCE', '35');
  var balcat = loadBalcat(input.balcat);
  if (input.cardlink === null || input.cardlink === undefined)
    abendProgram('ERROR OPENING CROSS REF FILE', '35');
  var links = loadCardlink(input.cardlink);
  if (input.rategrp === null || input.rategrp === undefined)
    abendProgram('ERROR OPENING DALY REJECTS FILE', '35');
  var rategrp = loadRategrp(input.rategrp);
  if (input.ledgacc === null || input.ledgacc === undefined)
    abendProgram('ERROR OPENING ACCOUNT MASTER FILE', '35');
  accounts = loadLedgacc(input.ledgacc);

  var wsLastLaccNum = ' '.repeat(11);
  var wsFirstTime = 'Y';
  var wsTotalInt = 0n;                            // S9(09)V99
  var wsTranidSuffix = 0;                         // 9(06)
  var accountRecord = null;                       // ACCOUNT-RECORD (WS)
  var crdLinkRecord = null;                       // CRD-LINK-RECORD (WS)
  var rgGroupRecord = null;                       // RG-GROUP-RECORD (WS)

  var update1050 = function () {                  // 1050-UPDATE-ACCOUNT
    accountRecord.curr_bal = fit(accountRecord.curr_bal + wsTotalInt, 12);
    accountRecord.curr_cyc_credit = 0n;
    accountRecord.curr_cyc_debit = 0n;
    accounts.map[accountRecord.id] = Object.assign({}, accountRecord);   // REWRITE
  };

  var getLaccData1100 = function (id) {
    var a = accounts.map[id];
    if (!a) {
      display('ACCOUNT NOT FOUND: ' + id);
      abendProgram('ERROR READING ACCOUNT FILE', '23');
    }
    accountRecord = Object.assign({}, a);
  };

  var getLinkData1110 = function (id) {
    var l = links[id];
    if (!l) {
      display('ACCOUNT NOT FOUND: ' + id);
      abendProgram('ERROR READING XREF FILE', '23');
    }
    crdLinkRecord = l;
  };

  var getInterestRate1200 = function (groupId, catCd, typeCd) {
    var g = rategrp[padR(groupId, 10) + typeCd + catCd];
    if (g) { rgGroupRecord = g; return; }
    display('DISCLOSURE GROUP RECORD MISSING');
    display('TRY WITH STANDARD GROUP CODE');
    var s = rategrp[padR('STANDARD', 10) + typeCd + catCd];       // 1200-A-GET-STANDARD-INT-RATE
    if (!s) abendProgram('ERROR READING STANDARD DISCLOSURE GROUP', '23');
    rgGroupRecord = s;
  };

  var writeTx1300B = function (monthlyInt) {
    wsTranidSuffix = (wsTranidSuffix + 1) % 1000000;
    var ts = db2Timestamp();
    txns.push({
      tran_id: parmDate + num9(wsTranidSuffix, 6),
      type_cd: '07',
      cat_cd: 12,
      source: 'Batch',
      desc: 'Accrued int ' + accountRecord.id,
      amt: fmt(monthlyInt, 2),
      merchant_id: 0,
      merchant_name: '',
      merchant_city: '',
      merchant_zip: '',
      card_num: rtrim(crdLinkRecord.card),
      orig_ts: ts,
      proc_ts: ts
    });
  };

  var computeInterest1300 = function (bal, rate) {
    // (TXN-CAT-BAL * RG-INT-RATE) / 1200, no ROUNDED: truncated to cents (A-07)
    var monthlyInt = fit((bal * rate) / 120000n, 11);
    wsTotalInt = fit(wsTotalInt + monthlyInt, 11);
    writeTx1300B(monthlyInt);
  };

  for (var i = 0; i < balcat.length; i++) {       // 1000-BALCATF-GET-NEXT
    var b = balcat[i];
    display(b.raw);
    if (b.acct !== wsLastLaccNum) {
      if (wsFirstTime !== 'Y') update1050();
      else wsFirstTime = 'N';
      wsTotalInt = 0n;
      wsLastLaccNum = b.acct;
      getLaccData1100(b.acct);
      getLinkData1110(b.acct);
    }
    getInterestRate1200(accountRecord.group_id, b.cat, b.type);
    if (rgGroupRecord.rate !== 0n) {
      computeInterest1300(b.bal, rgGroupRecord.rate);
      // 1400-COMPUTE-FEES: "To be implemented" - no-op
    }
  }
  // EOF: PERFORM UNTIL tests before each pass, so the ELSE PERFORM 1050 is never
  // reached and the last account's accrued interest is NOT rewritten (A-06).
  display('END OF EXECUTION OF PROGRAM LXB002C');
} catch (e) {
  if (e !== ABEND) throw e;
}

var ledgaccOut = accounts.keys.map(function (k) {
  var a = accounts.map[k];
  return {
    acct_id: Number(a.id.replace(/[^0-9]/g, '') || '0'),
    active_status: rtrim(a.active_status),
    curr_bal: fmt(a.curr_bal, 2),
    credit_limit: fmt(a.credit_limit, 2),
    cash_credit_limit: fmt(a.cash_credit_limit, 2),
    open_date: rtrim(a.open_date),
    expiration_date: rtrim(a.expiration_date),
    reissue_date: rtrim(a.reissue_date),
    curr_cyc_credit: fmt(a.curr_cyc_credit, 2),
    curr_cyc_debit: fmt(a.curr_cyc_debit, 2),
    addr_zip: rtrim(a.addr_zip),
    group_id: rtrim(a.group_id)
  };
});
// Returned by the END node (payload ${result})
output.result = {
  accrue_systxn: txns,
  accrue_ledgacc: ledgaccOut,
  returnCode: returnCode,
  displayLog: displayLog
};

```

_(server: 339 ms, 1 API call, 336 ms in API)_
