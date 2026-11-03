// SCRIPT node "Parse input files" (workflow accrue_interest_calculation).
// Decodes the fixed-width records ACCRUE reads (copybooks LXV022Y account, LXV024Y card xref,
// LXV026Y category balance, LXV027Y disclosure group). ledgacc / balcat may instead arrive as the
// POSTDAY JSON outputs (postday_ledgacc.json / postday_balcat.json) - detected by a leading '['.
// Amounts are kept as signed integer strings in hundredths (S9(n)V99 without the decimal point).

var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEG_ASCII = 'pqrstuvwxy';

function zoned(raw, what) {
  var s = String(raw).trim();
  if (s === '') return '0';
  var neg = false;
  var first = s.charAt(0);
  if (first === '-' || first === '+') { neg = first === '-'; s = s.substring(1); }
  var last = s.charAt(s.length - 1), d;
  if ((d = POS.indexOf(last)) >= 0) { s = s.slice(0, -1) + d; }
  else if ((d = NEG.indexOf(last)) >= 0) { s = s.slice(0, -1) + d; neg = true; }
  else if ((d = NEG_ASCII.indexOf(last)) >= 0) { s = s.slice(0, -1) + d; neg = true; }
  else if (last === '-') { s = s.slice(0, -1); neg = true; }
  else if (last === '+') { s = s.slice(0, -1); }
  if (!/^[0-9]+$/.test(s)) throw new Error('Invalid signed numeric ' + what + ': [' + raw + ']');
  s = s.replace(/^0+/, '');
  if (s === '') return '0';
  return neg ? '-' + s : s;
}

// JSON amount ("14.56", -500, 12.5) -> hundredths string
function decimalToHundredths(v, what) {
  var s = String(v === null || v === undefined ? '0' : v).trim();
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1); }
  var parts = s.split('.');
  var ip = parts[0] === '' ? '0' : parts[0];
  var fp = parts.length > 1 ? parts[1] : '';
  if (parts.length > 2 || !/^[0-9]+$/.test(ip) || !/^[0-9]*$/.test(fp) || fp.length > 2) {
    throw new Error('Invalid amount ' + what + ': [' + v + ']');
  }
  var r = (ip + (fp + '00').slice(0, 2)).replace(/^0+/, '');
  if (r === '') return '0';
  return neg ? '-' + r : r;
}

function digits(raw, width) {
  var s = String(raw).trim();
  while (s.length < width) s = '0' + s;
  return s;
}

function records(text, len) {
  var t = String(text === null || text === undefined ? '' : text);
  var out = [];
  var rows = t.split(/\r?\n/);
  if (rows.length === 1 && t.length > len && t.length % len === 0) {
    rows = [];
    for (var i = 0; i < t.length; i += len) rows.push(t.substring(i, i + len));
  }
  for (var j = 0; j < rows.length; j++) {
    var r = rows[j];
    if (r.trim() === '') continue;
    while (r.length < len) r += ' ';
    out.push(r);
  }
  return out;
}

function isJson(text) {
  return String(text === null || text === undefined ? '' : text).trim().charAt(0) === '[';
}

function parseAccounts(text) {
  if (isJson(text)) {
    return JSON.parse(String(text)).map(function (a, i) {
      var w = 'ledgacc[' + i + ']';
      return {
        acctId: digits(a.acct_id, 11), activeStatus: String(a.active_status || ''),
        currBal: decimalToHundredths(a.curr_bal, w + '.curr_bal'),
        creditLimit: decimalToHundredths(a.credit_limit, w + '.credit_limit'),
        cashCreditLimit: decimalToHundredths(a.cash_credit_limit, w + '.cash_credit_limit'),
        openDate: String(a.open_date || ''), expirationDate: String(a.expiration_date || ''),
        reissueDate: String(a.reissue_date || ''),
        currCycCredit: decimalToHundredths(a.curr_cyc_credit, w + '.curr_cyc_credit'),
        currCycDebit: decimalToHundredths(a.curr_cyc_debit, w + '.curr_cyc_debit'),
        addrZip: String(a.addr_zip || ''), groupId: String(a.group_id || '')
      };
    });
  }
  return records(text, 300).map(function (r, i) {
    var w = 'ledgacc line ' + (i + 1);
    return {
      acctId: digits(r.substring(0, 11), 11), activeStatus: r.substring(11, 12),
      currBal: zoned(r.substring(12, 24), w + ' LACC-CURR-BAL'),
      creditLimit: zoned(r.substring(24, 36), w + ' LACC-CREDIT-LIMIT'),
      cashCreditLimit: zoned(r.substring(36, 48), w + ' LACC-CASH-CREDIT-LIMIT'),
      openDate: r.substring(48, 58), expirationDate: r.substring(58, 68), reissueDate: r.substring(68, 78),
      currCycCredit: zoned(r.substring(78, 90), w + ' LACC-CURR-CYC-CREDIT'),
      currCycDebit: zoned(r.substring(90, 102), w + ' LACC-CURR-CYC-DEBIT'),
      addrZip: r.substring(102, 112), groupId: r.substring(112, 122)
    };
  });
}

function parseBalances(text) {
  if (isJson(text)) {
    return JSON.parse(String(text)).map(function (b, i) {
      return {
        acctId: digits(b.acct_id, 11), typeCd: String(b.type_cd), catCd: digits(b.cat_cd, 4),
        bal: decimalToHundredths(b.bal, 'balcat[' + i + '].bal')
      };
    });
  }
  return records(text, 50).map(function (r, i) {
    return {
      acctId: digits(r.substring(0, 11), 11), typeCd: r.substring(11, 13), catCd: digits(r.substring(13, 17), 4),
      bal: zoned(r.substring(17, 28), 'balcat line ' + (i + 1) + ' TXN-CAT-BAL')
    };
  });
}

function parseXrefs(text) {
  return records(text, 50).map(function (r) {
    return { cardNum: r.substring(0, 16), custId: r.substring(16, 25), acctId: digits(r.substring(25, 36), 11) };
  });
}

function parseRates(text) {
  return records(text, 50).map(function (r, i) {
    return {
      groupId: r.substring(0, 10), typeCd: r.substring(10, 12), catCd: digits(r.substring(12, 16), 4),
      rate: zoned(r.substring(16, 22), 'rategrp line ' + (i + 1) + ' RG-INT-RATE')
    };
  });
}

var runDate = String(input.interestRunDate === null || input.interestRunDate === undefined ? '' : input.interestRunDate).trim();
if (runDate === '') runDate = '2022071800';
runDate = (runDate + '          ').substring(0, 10);

output.parsed = JSON.stringify({
  runDate: runDate,
  accounts: parseAccounts(input.ledgaccDat),
  balances: parseBalances(input.balcatDat),
  xrefs: parseXrefs(input.cardlinkDat),
  rates: parseRates(input.rategrpDat)
});
