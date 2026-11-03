// FlowX SCRIPT node "Validate & Post Daily Transactions"
// Workflow: posttran_daily_transaction_posting (P-14 daily-transaction-posting, legacy POSTTRAN / CBTRN02C)
//
// Inputs (workflow state, raw fixed-width file contents, one record per line):
//   input.dailytran (CVTRA06Y, 350)  input.acctdata (CVACT01Y, 300)
//   input.cardxref  (CVACT03Y, 50)   input.tcatbal  (CVTRA01Y, 50)
// Outputs (CONTRACT.md field names):
//   output.posttran_transact, output.posttran_dalyrejs, output.posttran_acctdata, output.posttran_tcatbal
//   plus readCount / postedCount / rejectedCount / duplicateCount / parseWarnings for the run summary.
// Everything runs in one node on plain strings: GraalVM hands complex state to the next node as
// foreign objects, and the whole state of a SCRIPT node is capped at 1MB.

var warnings = [];
function warn(msg) { if (warnings.length < 200) warnings.push(msg); }

// ---------- fixed-width helpers ----------
function splitRecords(text, recLen, fileName) {
  if (text === null || text === undefined) { warn(fileName + ': not supplied, treated as empty'); return []; }
  var raw = String(text).split('\n');
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var l = raw[i];
    if (l.length > 0 && l.charAt(l.length - 1) === '\r') l = l.substring(0, l.length - 1);
    if (l.length === 0) continue;                       // blank line / trailing newline
    if (l.length < recLen) l = l + ' '.repeat(recLen - l.length); // trailing FILLER/spaces stripped
    out.push(l);
  }
  return out;
}
function fld(line, start1, len) { return line.substring(start1 - 1, start1 - 1 + len); }
function rtrim(s) { return s.replace(/\s+$/, ''); }

// Zoned decimal with trailing overpunch sign (S9(n)V99 DISPLAY): '{'..'I' = +0..+9, '}'..'R' = -0..-9.
var OP_POS = '{ABCDEFGHI';
var OP_NEG = '}JKLMNOPQR';
function parseSigned(raw, ctx) {           // returns integer cents
  var t = raw.trim();
  if (t === '') return 0;
  var neg = false;
  var c0 = t.charAt(0);
  if (c0 === '-' || c0 === '+') { neg = (c0 === '-'); t = t.substring(1).trim(); }
  var cl = t.charAt(t.length - 1);
  if (cl === '-' || cl === '+') { neg = (cl === '-'); t = t.substring(0, t.length - 1).trim(); cl = t.charAt(t.length - 1); }
  var p = OP_POS.indexOf(cl), n = OP_NEG.indexOf(cl);
  if (p >= 0) { t = t.substring(0, t.length - 1) + p; }
  else if (n >= 0) { t = t.substring(0, t.length - 1) + n; neg = true; }
  var cents;
  if (/^\d+$/.test(t)) cents = parseInt(t, 10);                     // implied V99
  else if (/^\d*\.\d+$/.test(t)) cents = Math.round(parseFloat(t) * 100);
  else { warn(ctx + ': unparseable amount "' + raw + '", treated as 0'); cents = 0; }
  return neg ? -cents : cents;
}
// COBOL ADD/COMPUTE without ON SIZE ERROR drops high-order digits beyond the PIC.
function truncate(cents, intDigits) { return cents % Math.pow(10, intDigits + 2); }
function fmtAmt(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2);
}
function asInt(raw) { var t = raw.trim(); return /^\d+$/.test(t) ? parseInt(t, 10) : (t === '' ? 0 : t); }
function numKey(raw) { var t = raw.trim(); return /^\d+$/.test(t) ? String(parseInt(t, 10)) : t; }
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
// Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000 (hundredths + '0000')
function nowDb2() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + '-' +
    pad(d.getHours(), 2) + '.' + pad(d.getMinutes(), 2) + '.' + pad(d.getSeconds(), 2) + '.' +
    pad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

// ---------- load reference data (ACCTDAT, CCXREF, TCATBALF) ----------
var accounts = [], acctByKey = {};
splitRecords(input.acctdata, 300, 'acctdata').forEach(function (l, i) {
  var ctx = 'acctdata line ' + (i + 1);
  var a = {
    id: fld(l, 1, 11), activeStatus: fld(l, 12, 1),
    currBal: parseSigned(fld(l, 13, 12), ctx), creditLimit: parseSigned(fld(l, 25, 12), ctx),
    cashCreditLimit: parseSigned(fld(l, 37, 12), ctx),
    openDate: fld(l, 49, 10), expirationDate: fld(l, 59, 10), reissueDate: fld(l, 69, 10),
    currCycCredit: parseSigned(fld(l, 79, 12), ctx), currCycDebit: parseSigned(fld(l, 91, 12), ctx),
    addrZip: fld(l, 103, 10), groupId: fld(l, 113, 10)
  };
  var k = numKey(a.id);
  if (acctByKey[k]) { warn(ctx + ': duplicate account id ' + a.id + ', first kept'); return; }
  acctByKey[k] = a; accounts.push(a);
});

var xrefByCard = {};
splitRecords(input.cardxref, 50, 'cardxref').forEach(function (l, i) {
  var card = fld(l, 1, 16);
  if (xrefByCard[card]) { warn('cardxref line ' + (i + 1) + ': duplicate card, first kept'); return; }
  xrefByCard[card] = { cardNum: card, custId: fld(l, 17, 9), acctId: fld(l, 26, 11) };
});

var tcatbals = [], tcatByKey = {};
function tcatKey(acctId, typeCd, catCd) { return numKey(acctId) + '|' + typeCd + '|' + numKey(catCd); }
splitRecords(input.tcatbal, 50, 'tcatbal').forEach(function (l, i) {
  var t = { acctId: fld(l, 1, 11), typeCd: fld(l, 12, 2), catCd: fld(l, 14, 4),
            bal: parseSigned(fld(l, 18, 11), 'tcatbal line ' + (i + 1)) };
  var k = tcatKey(t.acctId, t.typeCd, t.catCd);
  if (tcatByKey[k]) { warn('tcatbal line ' + (i + 1) + ': duplicate key, first kept'); return; }
  tcatByKey[k] = t; tcatbals.push(t);
});

// ---------- main loop over DALYTRAN (READ_DAILY_FEED + For Each Record) ----------
function tranFields(d, procTs) {
  return {
    tran_id: rtrim(d.id), type_cd: rtrim(d.typeCd), cat_cd: asInt(d.catCd), source: rtrim(d.source),
    desc: rtrim(d.desc), amt: fmtAmt(d.amt), merchant_id: asInt(d.merchantId),
    merchant_name: rtrim(d.merchantName), merchant_city: rtrim(d.merchantCity),
    merchant_zip: rtrim(d.merchantZip), card_num: rtrim(d.cardNum), orig_ts: rtrim(d.origTs),
    proc_ts: rtrim(procTs)
  };
}

var posted = [], rejects = [], postedIds = {};
var readCount = 0, duplicateCount = 0;

splitRecords(input.dailytran, 350, 'dailytran').forEach(function (l, i) {
  readCount++;
  var ctx = 'dailytran line ' + (i + 1);
  var d = {
    id: fld(l, 1, 16), typeCd: fld(l, 17, 2), catCd: fld(l, 19, 4), source: fld(l, 23, 10),
    desc: fld(l, 33, 100), amt: parseSigned(fld(l, 133, 11), ctx), merchantId: fld(l, 144, 9),
    merchantName: fld(l, 153, 50), merchantCity: fld(l, 203, 50), merchantZip: fld(l, 253, 10),
    cardNum: fld(l, 263, 16), origTs: fld(l, 279, 26), procTs: fld(l, 305, 26)
  };

  // BR-09: a transactionId already posted in this run is not posted twice.
  if (postedIds[d.id]) { duplicateCount++; warn(ctx + ': transaction ' + rtrim(d.id) + ' already posted, skipped'); return; }

  // 1500-VALIDATE-TRAN: xref -> account -> limit -> expiry; a later failure overwrites an earlier one.
  var reason = 0, reasonDesc = '';
  var xref = xrefByCard[d.cardNum];
  var acct = null;
  if (!xref) {
    reason = 100; reasonDesc = 'INVALID CARD NUMBER FOUND';                       // BR-01
  } else {
    acct = acctByKey[numKey(xref.acctId)];
    if (!acct) {
      reason = 101; reasonDesc = 'ACCOUNT RECORD NOT FOUND';                      // BR-02
    } else {
      var tempBal = truncate(acct.currCycCredit - acct.currCycDebit + d.amt, 9);  // WS-TEMP-BAL S9(9)V99
      if (!(acct.creditLimit >= tempBal)) { reason = 102; reasonDesc = 'OVERLIMIT TRANSACTION'; }           // BR-03
      if (!(acct.expirationDate >= d.origTs.substring(0, 10))) {                   // BR-04 (overwrites 102)
        reason = 103; reasonDesc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION';
      }
    }
  }

  if (reason !== 0) {
    // 2500-WRITE-REJECT-REC (BR-06): original record + 4-digit reason + 76-char description
    var r = tranFields(d, d.procTs);
    r.reason = reason;
    r.reason_desc = reasonDesc;
    rejects.push(r);
    return;
  }

  // 2000-POST-TRANSACTION (BR-05)
  var procTs = nowDb2();
  var k = tcatKey(xref.acctId, d.typeCd, d.catCd);                                // 2700-UPDATE-TCATBAL
  var tc = tcatByKey[k];
  if (tc) {
    tc.bal = truncate(tc.bal + d.amt, 9);
  } else {
    tc = { acctId: xref.acctId, typeCd: d.typeCd, catCd: d.catCd, bal: truncate(d.amt, 9) };
    tcatByKey[k] = tc; tcatbals.push(tc);
  }
  acct.currBal = truncate(acct.currBal + d.amt, 10);                              // 2800-UPDATE-ACCOUNT-REC
  if (d.amt >= 0) acct.currCycCredit = truncate(acct.currCycCredit + d.amt, 10);
  else acct.currCycDebit = truncate(acct.currCycDebit + d.amt, 10);
  posted.push(tranFields(d, procTs));                                             // 2900-WRITE-TRANSACTION-FILE
  postedIds[d.id] = true;
});

// ---------- outputs ----------
output.posttran_transact = posted;
output.posttran_dalyrejs = rejects;
output.posttran_acctdata = accounts.map(function (a) {
  return {
    acct_id: asInt(a.id), active_status: rtrim(a.activeStatus), curr_bal: fmtAmt(a.currBal),
    credit_limit: fmtAmt(a.creditLimit), cash_credit_limit: fmtAmt(a.cashCreditLimit),
    open_date: rtrim(a.openDate), expiration_date: rtrim(a.expirationDate), reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: fmtAmt(a.currCycCredit), curr_cyc_debit: fmtAmt(a.currCycDebit),
    addr_zip: rtrim(a.addrZip), group_id: rtrim(a.groupId)
  };
});
output.posttran_tcatbal = tcatbals.map(function (t) {
  return { acct_id: asInt(t.acctId), type_cd: rtrim(t.typeCd), cat_cd: asInt(t.catCd), bal: fmtAmt(t.bal) };
});
output.readCount = readCount;
output.postedCount = posted.length;
output.rejectedCount = rejects.length;
output.duplicateCount = duplicateCount;
output.parseWarnings = warnings;

// The raw files are not needed past this node; drop them so they do not travel on.
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;
