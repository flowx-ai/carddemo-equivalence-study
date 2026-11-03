// Load Accounts — parse the ACCRUE inputs (ledgacc / balcat / cardlink / rategrp).
// Each input is the raw file text: fixed-width copybook records, one per line, or (for the
// step-isolated POSTDAY outputs) a JSON array using the CONTRACT.md field names.
// Amounts are carried as integers in hundredths (cents / rate basis points) to stay exact.
var POS_OP = '{ABCDEFGHI', NEG_OP = '}JKLMNOPQR', NEG_ASC = 'pqrstuvwxy';

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(v) { return str(v).replace(/\s+$/, ''); }
function isJson(t) { return str(t).replace(/^\s+/, '').charAt(0) === '['; }
function records(t) {
  return str(t).split(/\r?\n/).filter(function (l) { return l.replace(/\s+$/, '').length > 0; });
}
function pad(l, n) { while (l.length < n) l += ' '; return l; }
function num(v) { var s = str(v).replace(/[^0-9-]/g, ''); return s === '' ? 0 : (parseInt(s, 10) || 0); }
function typeCd(v) { var t = rtrim(v); return /^[0-9]$/.test(t) ? '0' + t : t; }

// Decimal text ("-12.3", "1234") -> integer scaled by 10^scale; extra decimals truncated.
function decScaled(v, scale) {
  var s = str(v).trim(); if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1); }
  var parts = s.split('.');
  var ip = parts[0].replace(/[^0-9]/g, '') || '0';
  var fp = (parts[1] || '').replace(/[^0-9]/g, '');
  while (fp.length < scale) fp += '0';
  var n = parseInt(ip + fp.substring(0, scale), 10) || 0;
  return neg ? -n : n;
}

// Zoned decimal PIC S9(n)V9(scale) with a trailing overpunched sign ({A-I / }J-R, or the
// GnuCOBOL ASCII p-y negatives) or a separate +/- sign. Returns the scaled integer.
function zoned(f, scale) {
  var t = str(f).trim(); if (t === '') return 0;
  if (t.indexOf('.') >= 0) return decScaled(t, scale);
  var neg = false, c = t.charAt(0), d;
  if (c === '-' || c === '+') { neg = c === '-'; t = t.substring(1); }
  c = t.charAt(t.length - 1);
  if (c === '-' || c === '+') { neg = neg || c === '-'; t = t.substring(0, t.length - 1); c = t.charAt(t.length - 1); }
  if ((d = POS_OP.indexOf(c)) >= 0) t = t.substring(0, t.length - 1) + d;
  else if ((d = NEG_OP.indexOf(c)) >= 0) { t = t.substring(0, t.length - 1) + d; neg = true; }
  else if ((d = NEG_ASC.indexOf(c)) >= 0) { t = t.substring(0, t.length - 1) + d; neg = true; }
  var n = parseInt(t.replace(/[^0-9]/g, '') || '0', 10) || 0;
  return neg ? -n : n;
}

// ledgacc — LXV022Y ACCOUNT-RECORD (300 bytes)
var accounts = [];
if (isJson(input.ledgaccData)) {
  JSON.parse(str(input.ledgaccData)).forEach(function (a) {
    accounts.push({
      id: num(a.acct_id), status: rtrim(a.active_status), bal: decScaled(a.curr_bal, 2),
      creditLimit: decScaled(a.credit_limit, 2), cashCreditLimit: decScaled(a.cash_credit_limit, 2),
      openDate: rtrim(a.open_date), expirationDate: rtrim(a.expiration_date), reissueDate: rtrim(a.reissue_date),
      cycCredit: decScaled(a.curr_cyc_credit, 2), cycDebit: decScaled(a.curr_cyc_debit, 2),
      zip: rtrim(a.addr_zip), groupId: rtrim(a.group_id)
    });
  });
} else {
  records(input.ledgaccData).forEach(function (l) {
    l = pad(l, 300);
    accounts.push({
      id: num(l.substring(0, 11)), status: rtrim(l.substring(11, 12)), bal: zoned(l.substring(12, 24), 2),
      creditLimit: zoned(l.substring(24, 36), 2), cashCreditLimit: zoned(l.substring(36, 48), 2),
      openDate: rtrim(l.substring(48, 58)), expirationDate: rtrim(l.substring(58, 68)),
      reissueDate: rtrim(l.substring(68, 78)),
      cycCredit: zoned(l.substring(78, 90), 2), cycDebit: zoned(l.substring(90, 102), 2),
      zip: rtrim(l.substring(102, 112)), groupId: rtrim(l.substring(112, 122))
    });
  });
}

// balcat — LXV026Y TRAN-CAT-BAL-RECORD (50 bytes), read in key order like the KSDS
var balances = [];
if (isJson(input.balcatData)) {
  JSON.parse(str(input.balcatData)).forEach(function (b) {
    balances.push({ acctId: num(b.acct_id), typeCd: typeCd(b.type_cd), catCd: num(b.cat_cd), bal: decScaled(b.bal, 2) });
  });
} else {
  records(input.balcatData).forEach(function (l) {
    l = pad(l, 50);
    balances.push({ acctId: num(l.substring(0, 11)), typeCd: typeCd(l.substring(11, 13)),
      catCd: num(l.substring(13, 17)), bal: zoned(l.substring(17, 28), 2) });
  });
}
balances.sort(function (a, b) {
  if (a.acctId !== b.acctId) return a.acctId - b.acctId;
  if (a.typeCd !== b.typeCd) return a.typeCd < b.typeCd ? -1 : 1;
  return a.catCd - b.catCd;
});

// cardlink — LXV024Y CARD-XREF-RECORD (50 bytes); account -> card via the account AIX.
// Duplicate account ids: the lowest card number wins (AIX duplicates in primary-key order).
var xref = {};
records(input.cardlinkData).forEach(function (l) {
  l = pad(l, 50);
  var card = rtrim(l.substring(0, 16)), acct = num(l.substring(25, 36));
  if (!xref.hasOwnProperty(acct) || card < xref[acct]) xref[acct] = card;
});

// rategrp — LXV027Y DIS-GROUP-RECORD (50 bytes): group X(10), type X(2), cat 9(4), rate S9(4)V99
var rates = {};
records(input.rategrpData).forEach(function (l) {
  l = pad(l, 50);
  var k = rtrim(l.substring(0, 10)) + '|' + typeCd(l.substring(10, 12)) + '|' + num(l.substring(12, 16));
  if (!rates.hasOwnProperty(k)) rates[k] = zoned(l.substring(16, 22), 2);
});

// Run parameters: PARM-DATE X(10) prefixes every transaction id; business date stamps them.
var businessDate = rtrim(input.businessDate) || '2022-07-18';
var parm = rtrim(input.accrueParm) || (businessDate.replace(/-/g, '') + '00');
parm = pad(parm, 10).substring(0, 10);

output.accrueState = JSON.stringify({
  accounts: accounts, balances: balances, xref: xref, rates: rates, parm: parm,
  timestamp: businessDate + '-00.00.00.000000'
});
