// ACCRUE (interest calculation) - body of the SCRIPT node "Accrue interest"
// in FlowX workflow "accrue_interest". Inputs are the raw contents of the input
// files (fixed-width, one record per line) or, for ledgacc/balcat, the JSON form
// of the POSTDAY outputs. Outputs are JSON strings matching CONTRACT.md.
// See ../assumptions.md for every decision (A-nn references below).
var B = function (x) { return BigInt(x); };
var ZERO = B(0), HUNDRED = B(100), DIVISOR = B(120000); // A-08: bal * rate% / 12 months, in cents

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return s.replace(/\s+$/, ''); }
function padR(s, n) { s = str(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function padL0(s, n) { s = str(s).trim(); while (s.length < n) s = '0' + s; return s; }
function lines(txt) {
  return str(txt).split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
}

// A-04: signed zoned decimal, sign overpunched on the last digit
var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEG_ASCII = 'pqrstuvwxy';
function zoned(raw) {
  var s = raw.replace(/ /g, '0'), neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1), d;
  if (last === '-' || last === '+') { neg = neg || last === '-'; s = s.substring(0, s.length - 1); last = s.charAt(s.length - 1); }
  if ('0123456789'.indexOf(last) >= 0) d = last;
  else if (POS.indexOf(last) >= 0) d = String(POS.indexOf(last));
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); neg = true; }
  else if (NEG_ASCII.indexOf(last) >= 0) { d = String(NEG_ASCII.indexOf(last)); neg = true; }
  else throw new Error('Bad zoned decimal: [' + raw + ']');
  var digits = s.substring(0, s.length - 1) + d;
  if (!/^[0-9]+$/.test(digits)) throw new Error('Bad zoned decimal: [' + raw + ']');
  var v = B(digits);
  return neg ? -v : v;
}
// Amount given in JSON form ("14.56", -500) -> hundredths
function amt(v) {
  var s = str(v).trim(), neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); } else if (s.charAt(0) === '+') s = s.substring(1);
  var p = s.split('.'), frac = ((p[1] || '') + '00').substring(0, 2);
  var r = B((p[0] || '0') + frac);
  return neg ? -r : r;
}
function fmt(c) {
  var neg = c < ZERO, a = neg ? -c : c, f = (a % HUNDRED).toString();
  if (f.length < 2) f = '0' + f;
  return (neg ? '-' : '') + (a / HUNDRED).toString() + '.' + f;
}
function isJson(txt) { return str(txt).trim().charAt(0) === '['; }
function asList(txt) { var v = JSON.parse(str(txt)); return v; }

// ---------- accounts (LXV022Y, RECLN 300) ----------
var accounts = {}, acctOrder = [];
function addAccount(a) { if (!(a.idRaw in accounts)) acctOrder.push(a.idRaw); accounts[a.idRaw] = a; }
if (isJson(input.ledgacc)) {
  asList(input.ledgacc).forEach(function (j) {
    addAccount({
      idRaw: padL0(j.acct_id, 11), status: str(j.active_status), bal: amt(j.curr_bal),
      credit: amt(j.credit_limit), cash: amt(j.cash_credit_limit), open: str(j.open_date),
      expiry: str(j.expiration_date), reissue: str(j.reissue_date), cycCr: amt(j.curr_cyc_credit),
      cycDr: amt(j.curr_cyc_debit), zip: str(j.addr_zip), groupRaw: padR(j.group_id, 10)
    });
  });
} else {
  lines(input.ledgacc).forEach(function (l) {
    l = padR(l, 300);
    addAccount({
      idRaw: l.substring(0, 11), status: l.substring(11, 12), bal: zoned(l.substring(12, 24)),
      credit: zoned(l.substring(24, 36)), cash: zoned(l.substring(36, 48)), open: l.substring(48, 58),
      expiry: l.substring(58, 68), reissue: l.substring(68, 78), cycCr: zoned(l.substring(78, 90)),
      cycDr: zoned(l.substring(90, 102)), zip: l.substring(102, 112), groupRaw: l.substring(112, 122)
    });
  });
}

// ---------- card xref (LXV024Y, RECLN 50): account -> card, A-06 ----------
var cardByAcct = {};
lines(input.cardlink).forEach(function (l) {
  l = padR(l, 50);
  var card = l.substring(0, 16), acct = l.substring(25, 36);
  if (!(acct in cardByAcct) || card < cardByAcct[acct]) cardByAcct[acct] = card;
});

// ---------- disclosure groups (LXV027Y, RECLN 50) ----------
var rates = {};
lines(input.rategrp).forEach(function (l) {
  l = padR(l, 50);
  rates[l.substring(0, 16)] = zoned(l.substring(16, 22)); // key = group(10)+type(2)+cat(4)
});

// ---------- category balances (LXV026Y, RECLN 50), A-03 key order ----------
var cats = [];
if (isJson(input.balcat)) {
  asList(input.balcat).forEach(function (j) {
    cats.push({ acct: padL0(j.acct_id, 11), type: padR(j.type_cd, 2), cat: padL0(j.cat_cd, 4), bal: amt(j.bal) });
  });
} else {
  lines(input.balcat).forEach(function (l) {
    l = padR(l, 50);
    cats.push({ acct: l.substring(0, 11), type: l.substring(11, 13), cat: l.substring(13, 17), bal: zoned(l.substring(17, 28)) });
  });
}
cats.sort(function (x, y) {
  var a = x.acct + x.type + x.cat, b = y.acct + y.type + y.cat;
  return a < b ? -1 : a > b ? 1 : 0;
});

// ---------- run parameters ----------
var parm = padR(str(input.parmDate) || '2022071800', 10);                         // A-11
var bizDate = str(input.businessDate) || '2022-07-18';
var ts = str(input.procTs) || (bizDate + '-00.00.00.000000');                     // A-13
var updateLast = str(input.updateLastAccount).toUpperCase() === 'Y';              // A-10

// ---------- main loop ----------
var txns = [], anomalies = [], suffix = 0;
var lastAcct = null, first = true, cur = null, card = '', totalInt = ZERO;
function rewrite() {                                                              // A-09
  if (!cur) return;
  cur.bal = cur.bal + totalInt;
  cur.cycCr = ZERO;
  cur.cycDr = ZERO;
}
cats.forEach(function (c) {
  if (c.acct !== lastAcct) {
    if (!first) rewrite(); else first = false;
    totalInt = ZERO;
    lastAcct = c.acct;
    cur = accounts[c.acct] || null;
    if (!cur) anomalies.push('ACCOUNT NOT FOUND ' + c.acct + ' - its category balances skipped (A-14)');
    card = c.acct in cardByAcct ? cardByAcct[c.acct] : '';
    if (cur && card === '') anomalies.push('XREF NOT FOUND ' + c.acct + ' - card_num left blank (A-14)');
  }
  if (!cur) return;
  var rate = rates[cur.groupRaw + c.type + c.cat];                                // A-05
  if (rate === undefined) rate = rates['DEFAULT   ' + c.type + c.cat];
  if (rate === undefined) {
    anomalies.push('NO RATE for group [' + rtrim(cur.groupRaw) + '] or DEFAULT, ' + c.type + '/' + c.cat + ' - treated as 0 (A-14)');
    rate = ZERO;
  }
  if (rate !== ZERO) {                                                            // A-07
    var interest = (c.bal * rate) / DIVISOR;                                      // A-08: BigInt division truncates toward zero
    totalInt = totalInt + interest;
    suffix += 1;
    txns.push({
      tran_id: parm + padL0(suffix, 6),                                           // A-11
      type_cd: '01', cat_cd: 5, source: 'System',                                 // A-12
      desc: 'Int. for a/c ' + c.acct,
      amt: fmt(interest), merchant_id: 0, merchant_name: '', merchant_city: '', merchant_zip: '',
      card_num: rtrim(card), orig_ts: ts, proc_ts: ts
    });
  }
});
if (updateLast) rewrite();

output.systxnJson = JSON.stringify(txns);
output.ledgaccJson = JSON.stringify(acctOrder.map(function (k) {
  var a = accounts[k];
  return {
    acct_id: parseInt(a.idRaw, 10), active_status: rtrim(a.status), curr_bal: fmt(a.bal),
    credit_limit: fmt(a.credit), cash_credit_limit: fmt(a.cash), open_date: rtrim(a.open),
    expiration_date: rtrim(a.expiry), reissue_date: rtrim(a.reissue), curr_cyc_credit: fmt(a.cycCr),
    curr_cyc_debit: fmt(a.cycDr), addr_zip: rtrim(a.zip), group_id: rtrim(a.groupRaw)
  };
}));
output.anomalies = anomalies.join('\n');
output.stats = 'catbal=' + cats.length + ' accounts=' + acctOrder.length + ' txns=' + txns.length;
