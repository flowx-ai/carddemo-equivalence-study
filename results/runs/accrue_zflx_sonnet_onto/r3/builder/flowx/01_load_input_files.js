// SCRIPT node "Load input files" — workflow accrue_interest_calculation (P-15, legacy ACCRUE / LXB002C).
// Parses the four files LXB002C opens. Each input is either the raw fixed-width file (one record per
// line, copybook layout) or a JSON array shaped like the CONTRACT.md outputs (e.g. postday_ledgacc.json,
// postday_balcat.json), so the step can take the oracle's POSTDAY outputs directly (step isolation).
// Amounts are carried as integer strings in units of 0.01 (no floating point anywhere).
var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR';

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }
function padRight(s, n) { s = str(s); while (s.length < n) s += ' '; return s; }
function padLeft(s, n, c) { s = str(s); while (s.length < n) s = c + s; return s; }
function isJson(t) { var s = str(t).trim(); return s.charAt(0) === '['; }
function acct11(v) { var s = str(v).trim().replace(/^0+/, ''); return padLeft(s === '' ? '0' : s, 11, '0'); }

// Signed numeric -> integer string scaled by 10^scale. `implied` = COBOL implied decimal point
// (PIC S9(n)V99 zoned, trailing overpunch sign); otherwise plain decimal text ("14.56", -500).
function toScaled(v, scale, implied) {
  var s = str(v).trim();
  if (s === '') return '0';
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1).trim(); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = neg || last === '-'; s = s.substring(0, s.length - 1); }
  else {
    var i = POS.indexOf(last);
    if (i >= 0) s = s.substring(0, s.length - 1) + i;
    else { i = NEG.indexOf(last); if (i >= 0) { s = s.substring(0, s.length - 1) + i; neg = true; } }
  }
  var intPart, frac;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.'); intPart = p[0]; frac = p[1] || '';
    while (frac.length < scale) frac += '0';
    frac = frac.substring(0, scale);
  } else if (implied) {
    s = padLeft(s, scale + 1, '0');
    intPart = s.substring(0, s.length - scale); frac = s.substring(s.length - scale);
  } else {
    intPart = s; frac = padLeft('', scale, '0');
  }
  var digits = (intPart + frac).replace(/^0+/, '');
  if (!/^[0-9]*$/.test(digits)) throw new Error('Not a numeric value: [' + v + ']');
  if (digits === '') return '0';
  return (neg ? '-' : '') + digits;
}

function records(text, len) {
  var out = [];
  str(text).split(/\r?\n/).forEach(function (l) {
    if (l.trim() !== '') out.push(padRight(l, len));
  });
  return out;
}

// LXV022Y account record (300 bytes)
function parseAccounts(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (r) {
      return {
        acctId: acct11(r.acct_id), activeStatus: rtrim(r.active_status),
        currBal: toScaled(r.curr_bal, 2, false), creditLimit: toScaled(r.credit_limit, 2, false),
        cashCreditLimit: toScaled(r.cash_credit_limit, 2, false),
        openDate: rtrim(r.open_date), expirationDate: rtrim(r.expiration_date), reissueDate: rtrim(r.reissue_date),
        currCycCredit: toScaled(r.curr_cyc_credit, 2, false), currCycDebit: toScaled(r.curr_cyc_debit, 2, false),
        addrZip: rtrim(r.addr_zip), groupId: rtrim(r.group_id)
      };
    });
  }
  return records(text, 300).map(function (l) {
    return {
      acctId: acct11(l.substring(0, 11)), activeStatus: rtrim(l.substring(11, 12)),
      currBal: toScaled(l.substring(12, 24), 2, true), creditLimit: toScaled(l.substring(24, 36), 2, true),
      cashCreditLimit: toScaled(l.substring(36, 48), 2, true),
      openDate: rtrim(l.substring(48, 58)), expirationDate: rtrim(l.substring(58, 68)), reissueDate: rtrim(l.substring(68, 78)),
      currCycCredit: toScaled(l.substring(78, 90), 2, true), currCycDebit: toScaled(l.substring(90, 102), 2, true),
      addrZip: rtrim(l.substring(102, 112)), groupId: rtrim(l.substring(112, 122))
    };
  });
}

// LXV026Y transaction category balance (50 bytes)
function parseBalances(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (r) {
      return { acctId: acct11(r.acct_id), typeCd: padRight(rtrim(r.type_cd), 2), catCd: parseInt(str(r.cat_cd), 10), bal: toScaled(r.bal, 2, false) };
    });
  }
  return records(text, 50).map(function (l) {
    return { acctId: acct11(l.substring(0, 11)), typeCd: l.substring(11, 13), catCd: parseInt(l.substring(13, 17), 10), bal: toScaled(l.substring(17, 28), 2, true) };
  });
}

// LXV027Y disclosure group (50 bytes); key group + type + category -> rate in 0.01 %
function parseRates(text) {
  var rates = {};
  var rows = isJson(text)
    ? JSON.parse(str(text)).map(function (r) {
        return { g: rtrim(r.group_id), t: padRight(rtrim(r.type_cd), 2), c: parseInt(str(r.cat_cd), 10), rate: toScaled(r.int_rate, 2, false) };
      })
    : records(text, 50).map(function (l) {
        return { g: rtrim(l.substring(0, 10)), t: l.substring(10, 12), c: parseInt(l.substring(12, 16), 10), rate: toScaled(l.substring(16, 22), 2, true) };
      });
  rows.forEach(function (r) { rates[r.g + '|' + r.t + '|' + r.c] = r.rate; });
  return rates;
}

// LXV024Y card cross-reference (50 bytes); alternate key account id -> card number.
// Duplicates on the alternate key: the lowest card number wins (AIX built from the card-ordered KSDS).
function parseXref(text) {
  var byAcct = {};
  var rows = isJson(text)
    ? JSON.parse(str(text)).map(function (r) { return { card: rtrim(r.card_num), acct: acct11(r.acct_id) }; })
    : records(text, 50).map(function (l) { return { card: rtrim(l.substring(0, 16)), acct: acct11(l.substring(25, 36)) }; });
  rows.forEach(function (r) {
    if (!(r.acct in byAcct) || r.card < byAcct[r.acct]) byAcct[r.acct] = r.card;
  });
  return byAcct;
}

var parsed = {
  accounts: parseAccounts(input.ledgacc),
  balances: parseBalances(input.balcat),
  rates: parseRates(input.rategrp),
  cardByAcct: parseXref(input.cardlink)
};
output.parsedJson = JSON.stringify(parsed);
// drop the raw files so they are not carried through the rest of the run
output.ledgacc = null;
output.balcat = null;
output.rategrp = null;
output.cardlink = null;
