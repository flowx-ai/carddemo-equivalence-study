// LXB002C (Ledgerline ACCRUE) - interest calculation, ported paragraph by paragraph.
// Paragraph names refer to LXB002C.cbl; "A-nn" refers to output/assumptions.md.
// Inputs (workflow state): parmDate, ledgacc, cardlink, balcat, rategrp (file text, one record per line),
// optional runTimestamp (26-char DB2 timestamp used instead of the clock, for reproducible runs).
var Z = BigInt(0), TEN = BigInt(10);
function pow10(n) { var r = BigInt(1); for (var i = 0; i < n; i++) r = r * TEN; return r; }
var CAP_S9_9V99 = pow10(11), CAP_S9_10V99 = pow10(12), DIV = BigInt(120000);

var log = [];
function display(m) { if (log.length < 5000) log.push(m); }

// Fixed-width records, one per line; short lines are space-padded (A-01).
function recs(text, len) {
  var out = [];
  if (text === null || text === undefined) return out;
  var parts = String(text).split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i];
    if (l.replace(/\s+$/, '').length === 0) continue;
    if (l.length < len) l = l + ' '.repeat(len - l.length);
    out.push(l.substring(0, len));
  }
  return out;
}
function rtrim(s) { return s.replace(/ +$/, ''); }

// Signed zoned decimal, sign overpunched on the last byte (A-02). Returns BigInt in units of the
// last digit, or null when the field is not numeric.
var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEG_ASCII = 'pqrstuvwxy';
function zoned(f) {
  var digits = '', neg = false;
  for (var i = 0; i < f.length; i++) {
    var c = f.charAt(i), last = i === f.length - 1, k;
    if (c >= '0' && c <= '9') digits += c;
    else if (last && (k = POS.indexOf(c)) >= 0) digits += k;
    else if (last && (k = NEG.indexOf(c)) >= 0) { digits += k; neg = true; }
    else if (last && (k = NEG_ASCII.indexOf(c)) >= 0) { digits += k; neg = true; }
    else if (c === ' ' || c === '+') digits += '0';
    else if (c === '-') { digits += '0'; neg = true; }
    else return null;
  }
  var v = BigInt(digits);
  return neg ? -v : v;
}
function num(f) { var v = zoned(f); return v === null ? Z : v; }   // A-03
// COBOL store without ON SIZE ERROR: high-order digits are dropped, sign kept (A-11).
function fit(v, cap) { return v % cap; }
function money(v) {
  var neg = v < Z, a = neg ? -v : v, s = a.toString();
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
}
function moneyField(raw, v) {
  if (v !== undefined) return money(v);
  var p = zoned(raw);
  return p === null ? rtrim(raw) : money(p);
}
function intField(raw) { return /^[0-9]+$/.test(raw) ? Number(raw) : rtrim(raw); }

// POSTDAY outputs may arrive in their JSON form (CONTRACT "Step isolation"); rebuild the
// copybook layout from them so the rest of the program reads one format (A-20).
function cents(v) {
  var s = String(v).trim(), neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); } else if (s.charAt(0) === '+') s = s.substring(1);
  var p = s.split('.'), c = BigInt((p[0] || '0') + ((p[1] || '') + '00').substring(0, 2));
  return neg ? -c : c;
}
function zonedStr(v, len) {
  var c = cents(v), neg = c < Z, s = (neg ? -c : c).toString();
  while (s.length < len) s = '0' + s;
  s = s.substring(s.length - len);
  return neg ? s.substring(0, len - 1) + NEG.charAt(Number(s.charAt(len - 1))) : s;
}
function digitsStr(v, len) { var s = String(v === null || v === undefined ? '' : v); while (s.length < len) s = '0' + s; return s.substring(s.length - len); }
function alpha(v, len) { var s = v === null || v === undefined ? '' : String(v); return (s + ' '.repeat(len)).substring(0, len); }
function asRecords(text, toLine) {
  if (text === null || text === undefined) return text;
  var t = String(text).trim();
  return t.charAt(0) === '[' ? JSON.parse(t).map(toLine).join('\n') : text;
}
var ledgaccText = asRecords(input.ledgacc, function (a) {
  return digitsStr(a.acct_id, 11) + alpha(a.active_status, 1) + zonedStr(a.curr_bal, 12) +
    zonedStr(a.credit_limit, 12) + zonedStr(a.cash_credit_limit, 12) + alpha(a.open_date, 10) +
    alpha(a.expiration_date, 10) + alpha(a.reissue_date, 10) + zonedStr(a.curr_cyc_credit, 12) +
    zonedStr(a.curr_cyc_debit, 12) + alpha(a.addr_zip, 10) + alpha(a.group_id, 10);
});
var balcatText = asRecords(input.balcat, function (b) {
  return digitsStr(b.acct_id, 11) + alpha(b.type_cd, 2) + digitsStr(b.cat_cd, 4) + zonedStr(b.bal, 11);
});

// ---- load the indexed files (A-04: first record wins on a duplicate key) ----
var accounts = new Map();          // LEDGFILE, key LACC-ID (LXV022Y)
recs(ledgaccText, 300).forEach(function (r) {
  var id = r.substring(0, 11);
  if (accounts.has(id)) { display('DUPLICATE ACCOUNT KEY IGNORED: ' + id); return; }
  accounts.set(id, {
    id: id, status: r.substring(11, 12), bal: r.substring(12, 24), cl: r.substring(24, 36),
    ccl: r.substring(36, 48), open: r.substring(48, 58), exp: r.substring(58, 68),
    reis: r.substring(68, 78), cycCr: r.substring(78, 90), cycDb: r.substring(90, 102),
    zip: r.substring(102, 112), grp: r.substring(112, 122)
  });
});

var cardSeen = new Map(), linkByAcct = new Map();   // LINKFILE, key CRD-NUM, alt key LACC-ID (LXV024Y)
recs(input.cardlink, 50).forEach(function (r) {
  var card = r.substring(0, 16), acct = r.substring(25, 36);
  if (cardSeen.has(card)) return;
  cardSeen.set(card, true);
  if (!linkByAcct.has(acct)) linkByAcct.set(acct, { card: card, acct: acct });   // A-05
});

var rates = new Map();             // RATEGRP, key GROUP-ID + TYPE-CD + CAT-CD (LXV027Y)
recs(input.rategrp, 50).forEach(function (r) {
  var key = r.substring(0, 16);
  if (!rates.has(key)) rates.set(key, num(r.substring(16, 22)));
});

var balKeys = new Map(), bal = [];   // BALCATF, key LACC-ID + TYPE-CD + CAT-CD (LXV026Y)
recs(balcatText, 50).forEach(function (r) {
  var key = r.substring(0, 17);
  if (balKeys.has(key)) return;
  balKeys.set(key, true);
  bal.push({ raw: r, key: key, acct: r.substring(0, 11), type: r.substring(11, 13),
             cat: r.substring(13, 17), bal: num(r.substring(17, 28)) });
});
// ACCESS MODE SEQUENTIAL on an indexed file = ascending primary key order (A-06).
bal.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });

var parm = input.parmDate === null || input.parmDate === undefined ? '' : String(input.parmDate);
var parmDate = (parm + '          ').substring(0, 10);   // PARM-DATE X(10) (A-07)

function p2(n) { return (n < 10 ? '0' : '') + n; }
function db2Timestamp() {                                 // Z-GET-DB2-FORMAT-TIMESTAMP (A-09)
  if (input.runTimestamp) return (String(input.runTimestamp) + ' '.repeat(26)).substring(0, 26);
  var d = new Date();
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' +
    p2(d.getHours()) + '.' + p2(d.getMinutes()) + '.' + p2(d.getSeconds()) + '.' +
    p2(Math.floor(d.getMilliseconds() / 10)) + '0000';
}

// ---- PROCEDURE DIVISION ----
function Abend(msg, status) { this.msg = msg; this.status = status; }
function abend(msg, status) {
  display(msg);
  display('FILE STATUS IS: NNNN00' + status);
  display('ABENDING PROGRAM');
  display('LXZ009D ABEND CALLED');
  throw new Abend(msg, status);
}

var txns = [], lastAcct = '           ', firstTime = true;
var totalInt = Z, suffix = 0, recordCount = 0, acct = null, link = null;
var returnCode = 0, abendMessage = null;

function updateAccount() {                                // 1050-UPDATE-ACCOUNT
  acct.balV = fit(num(acct.bal) + totalInt, CAP_S9_10V99);
  acct.cycCrV = Z;
  acct.cycDbV = Z;
}

function writeTx(monthly) {                               // 1300-B-WRITE-TX
  suffix = (suffix + 1) % 1000000;                        // WS-TRANID-SUFFIX 9(06)
  var sfx = String(suffix); while (sfx.length < 6) sfx = '0' + sfx;
  var ts = db2Timestamp();
  txns.push({
    tran_id: parmDate + sfx, type_cd: '07', cat_cd: 12, source: 'Batch',
    desc: 'Accrued int ' + acct.id, amt: money(monthly), merchant_id: 0,
    merchant_name: '', merchant_city: '', merchant_zip: '',
    card_num: rtrim(link.card), orig_ts: ts, proc_ts: ts
  });
}

display('START OF EXECUTION OF PROGRAM LXB002C');
try {
  for (var i = 0; i < bal.length; i++) {                  // PERFORM UNTIL END-OF-FILE = 'Y'
    var b = bal[i];
    recordCount++;
    display(b.raw);
    if (b.acct !== lastAcct) {
      if (!firstTime) updateAccount(); else firstTime = false;
      totalInt = Z;
      lastAcct = b.acct;
      acct = accounts.get(b.acct);                        // 1100-GET-LACC-DATA
      if (!acct) { display('ACCOUNT NOT FOUND: ' + b.acct); abend('ERROR READING ACCOUNT FILE', '23'); }
      link = linkByAcct.get(b.acct);                      // 1110-GET-LINK-DATA
      if (!link) { display('ACCOUNT NOT FOUND: ' + b.acct); abend('ERROR READING XREF FILE', '23'); }
    }
    var rate = rates.get(acct.grp + b.type + b.cat);      // 1200-GET-INTEREST-RATE
    if (rate === undefined) {
      display('DISCLOSURE GROUP RECORD MISSING');
      display('TRY WITH STANDARD GROUP CODE');
      rate = rates.get('STANDARD  ' + b.type + b.cat);    // 1200-A-GET-STANDARD-INT-RATE
      if (rate === undefined) abend('ERROR READING STANDARD DISCLOSURE GROUP', '23');
    }
    if (rate !== Z) {
      // 1300-COMPUTE-INTEREST: (bal * rate) / 1200, truncated to S9(09)V99 (A-10)
      var monthly = fit((b.bal * rate) / DIV, CAP_S9_9V99);
      totalInt = fit(totalInt + monthly, CAP_S9_9V99);
      writeTx(monthly);
      // 1400-COMPUTE-FEES: "To be implemented" - no-op
    }
  }
  // At EOF the loop ends; the ELSE branch that would update the last account is never reached (A-08).
  display('END OF EXECUTION OF PROGRAM LXB002C');
} catch (e) {
  if (!(e instanceof Abend)) throw e;
  returnCode = 16;                                        // LXZ009D: STOP RUN RETURNING 16
  abendMessage = e.msg + ' (FILE STATUS ' + e.status + ')';
}

var ledger = [];
Array.from(accounts.keys()).sort().forEach(function (k) {
  var a = accounts.get(k);
  ledger.push({
    acct_id: intField(a.id), active_status: rtrim(a.status),
    curr_bal: a.balV !== undefined ? money(a.balV) : moneyField(a.bal),
    credit_limit: moneyField(a.cl), cash_credit_limit: moneyField(a.ccl),
    open_date: rtrim(a.open), expiration_date: rtrim(a.exp), reissue_date: rtrim(a.reis),
    curr_cyc_credit: moneyField(a.cycCr, a.cycCrV), curr_cyc_debit: moneyField(a.cycDb, a.cycDbV),
    addr_zip: rtrim(a.zip), group_id: rtrim(a.grp)
  });
});

output.result = {
  accrue_systxn: txns, accrue_ledgacc: ledger, returnCode: returnCode,
  abendMessage: abendMessage, recordCount: recordCount, log: log.join('\n')
};
// Drop the input file texts from the run state so they are not carried to END.
output.ledgacc = null; output.cardlink = null; output.balcat = null; output.rategrp = null;
