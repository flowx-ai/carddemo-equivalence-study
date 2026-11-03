// ACCRUE / LXB002C — monthly interest calculation (wiki P-15 interest-calculation).
// This file is the exact body of the SCRIPT node "Compute interest (LXB002C)" in the FlowX workflow
// accrue_interest_calculation. run_accrue.mjs executes the same text locally with the same input/output contract.
//
// Inputs (workflow state, all STRING):
//   interestRunDate  ACCRUE PARM, e.g. "2022071800" (BR-05)
//   ledgaccFile      accounts: fixed-width LXV022Y (300 bytes/line) or a JSON array in CONTRACT account-field form
//   balcatFile       category balances: fixed-width LXV026Y (50) or a JSON array {acct_id,type_cd,cat_cd,bal}
//   rategrpFile      disclosure groups: fixed-width LXV027Y (50)
//   cardlinkFile     card xref: fixed-width LXV024Y (50)
//   processTs        optional DB2-format timestamp for orig_ts/proc_ts (default: now)
// Outputs: accrueSystxnJson, accrueLedgaccJson (JSON arrays per CONTRACT.md), accrueSummaryJson.

var OVERPUNCH = { '{': [0, false], '}': [0, true] };
'ABCDEFGHI'.split('').forEach(function (c, i) { OVERPUNCH[c] = [i + 1, false]; });
'JKLMNOPQR'.split('').forEach(function (c, i) { OVERPUNCH[c] = [i + 1, true]; });

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }
function padLeft(s, n, ch) { s = str(s); while (s.length < n) s = ch + s; return s; }
function padRight(s, n) { s = str(s); while (s.length < n) s = s + ' '; return s; }

// Numeric field -> BigInt in units of 10^-scale.
// Accepts COBOL zoned decimal with implied decimals (sign overpunched on the last byte, e.g. "00150{"),
// or an explicit decimal string/number ("14.56", -500) as found in the JSON forms.
function toUnits(raw, scale) {
  var s = str(raw).trim();
  if (s === '') return BigInt(0);
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.slice(1).trim(); }
  if (s.charAt(s.length - 1) === '-' || s.charAt(s.length - 1) === '+') { neg = s.charAt(s.length - 1) === '-'; s = s.slice(0, -1); }
  if (s.indexOf('.') >= 0) {
    var parts = s.split('.');
    var frac = (parts[1] + '0000000000').slice(0, scale);
    var v = BigInt((parts[0] || '0') + frac);
    return neg ? -v : v;
  }
  var last = s.charAt(s.length - 1);
  if (OVERPUNCH[last]) {
    if (OVERPUNCH[last][1]) neg = true;
    s = s.slice(0, -1) + OVERPUNCH[last][0];
  }
  s = s.replace(/ /g, '0');
  if (!/^[0-9]+$/.test(s)) throw new Error('Invalid numeric field: "' + str(raw) + '"');
  var u = BigInt(s);
  return neg ? -u : u;
}

function formatCents(c) {
  var neg = c < BigInt(0);
  var a = neg ? -c : c;
  var h = BigInt(100);
  return (neg ? '-' : '') + (a / h).toString() + '.' + padLeft((a % h).toString(), 2, '0');
}

function lines(text) {
  return str(text).split(/\r?\n/).filter(function (l) { return l.replace(/\s/g, '') !== ''; });
}

function isJsonArray(text) { return /^\s*\[/.test(str(text)); }

function acctKey(v) { return padLeft(str(v).trim(), 11, '0'); }
function typeKey(v) { return padLeft(str(v).trim(), 2, '0'); }
function catKey(v) { return parseInt(str(v).trim() || '0', 10); }

function parseAccounts(text) {
  if (isJsonArray(text)) {
    return JSON.parse(text).map(function (r) {
      return {
        acctId: acctKey(r.acct_id), activeStatus: rtrim(r.active_status),
        currBal: toUnits(r.curr_bal, 2), creditLimit: toUnits(r.credit_limit, 2),
        cashCreditLimit: toUnits(r.cash_credit_limit, 2), openDate: rtrim(r.open_date),
        expirationDate: rtrim(r.expiration_date), reissueDate: rtrim(r.reissue_date),
        currCycCredit: toUnits(r.curr_cyc_credit, 2), currCycDebit: toUnits(r.curr_cyc_debit, 2),
        addrZip: rtrim(r.addr_zip), groupId: rtrim(r.group_id)
      };
    });
  }
  return lines(text).map(function (l) {
    l = padRight(l, 300);
    return {
      acctId: acctKey(l.slice(0, 11)), activeStatus: rtrim(l.slice(11, 12)),
      currBal: toUnits(l.slice(12, 24), 2), creditLimit: toUnits(l.slice(24, 36), 2),
      cashCreditLimit: toUnits(l.slice(36, 48), 2), openDate: rtrim(l.slice(48, 58)),
      expirationDate: rtrim(l.slice(58, 68)), reissueDate: rtrim(l.slice(68, 78)),
      currCycCredit: toUnits(l.slice(78, 90), 2), currCycDebit: toUnits(l.slice(90, 102), 2),
      addrZip: rtrim(l.slice(102, 112)), groupId: rtrim(l.slice(112, 122))
    };
  });
}

function parseBalances(text) {
  var rows;
  if (isJsonArray(text)) {
    rows = JSON.parse(text).map(function (r) {
      return { acctId: acctKey(r.acct_id), typeCd: typeKey(r.type_cd), catCd: catKey(r.cat_cd), bal: toUnits(r.bal, 2) };
    });
  } else {
    rows = lines(text).map(function (l) {
      l = padRight(l, 50);
      return { acctId: acctKey(l.slice(0, 11)), typeCd: l.slice(11, 13), catCd: catKey(l.slice(13, 17)), bal: toUnits(l.slice(17, 28), 2) };
    });
  }
  // BALCATF is a KSDS read sequentially: records arrive in key order (account, type, category).
  rows.sort(function (a, b) {
    if (a.acctId !== b.acctId) return a.acctId < b.acctId ? -1 : 1;
    if (a.typeCd !== b.typeCd) return a.typeCd < b.typeCd ? -1 : 1;
    return a.catCd - b.catCd;
  });
  return rows;
}

function rateKey(groupId, typeCd, catCd) { return rtrim(groupId) + '|' + typeCd + '|' + catCd; }

function parseRates(text) {
  var map = {};
  lines(text).forEach(function (l) {
    l = padRight(l, 50);
    var k = rateKey(l.slice(0, 10), l.slice(10, 12), catKey(l.slice(12, 16)));
    if (!(k in map)) map[k] = toUnits(l.slice(16, 22), 2); // rate in hundredths of a percent
  });
  return map;
}

// Card of an account via the LINK alternate index on account id: the lowest card number (AIX duplicate order).
function parseCardByAccount(text) {
  var map = {};
  lines(text).forEach(function (l) {
    l = padRight(l, 50);
    var card = rtrim(l.slice(0, 16)), acct = acctKey(l.slice(25, 36));
    if (!(acct in map) || card < map[acct]) map[acct] = card;
  });
  return map;
}

function db2Timestamp(d) {
  function p(n, w) { return padLeft(String(n), w, '0'); }
  return p(d.getFullYear(), 4) + '-' + p(d.getMonth() + 1, 2) + '-' + p(d.getDate(), 2) + '-' +
    p(d.getHours(), 2) + '.' + p(d.getMinutes(), 2) + '.' + p(d.getSeconds(), 2) + '.' +
    p(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

function runAccrue(req) {
  var runParm = padRight(str(req.interestRunDate).trim() || '2022071800', 10).slice(0, 10);
  var accounts = parseAccounts(req.ledgaccFile);
  var balances = parseBalances(req.balcatFile);
  var rates = parseRates(req.rategrpFile);
  var cards = parseCardByAccount(req.cardlinkFile);
  var ts = str(req.processTs).trim() || db2Timestamp(new Date());
  var byId = {};
  accounts.forEach(function (a) { byId[a.acctId] = a; });

  var txns = [], warnings = [];
  var suffix = 0, fallbackCount = 0, accountsUpdated = 0;
  var lastAcct = null, current = null, totalInt = BigInt(0);
  var ZERO = BigInt(0), DIVISOR = BigInt(120000); // cents * (rate% x100) / (1200 x 100)

  function updateAccount() { // BR-06
    if (!current) return;
    current.currBal = current.currBal + totalInt;
    current.currCycCredit = ZERO;
    current.currCycDebit = ZERO;
    accountsUpdated++;
  }

  balances.forEach(function (b) {
    if (b.acctId !== lastAcct) {
      if (lastAcct !== null) updateAccount();
      totalInt = ZERO;
      lastAcct = b.acctId;
      current = byId[b.acctId] || null;
      if (!current) warnings.push('Account ' + b.acctId + ' in balcat not found in ledgacc: its balances are skipped');
    }
    if (!current) return;
    // BR-01 / BR-02: rate by account group, fallback STANDARD.
    var rate = rates[rateKey(current.groupId, b.typeCd, b.catCd)];
    if (rate === undefined) {
      rate = rates[rateKey('STANDARD', b.typeCd, b.catCd)];
      if (rate !== undefined) fallbackCount++;
    }
    if (rate === undefined) {
      warnings.push('No rate for group ' + current.groupId + ' nor STANDARD, type ' + b.typeCd + ' cat ' + b.catCd + ': no interest');
      return;
    }
    if (rate === ZERO) return; // BR-03 / BR-10
    var interest = (b.bal * rate) / DIVISOR; // BR-03, BR-08: truncation (BigInt division truncates toward zero)
    totalInt = totalInt + interest;
    suffix++;
    txns.push({ // BR-04 / BR-05
      tran_id: runParm + padLeft(String(suffix), 6, '0'),
      type_cd: '07', cat_cd: 12, source: 'Batch',
      desc: 'Accrued int ' + current.acctId,
      amt: formatCents(interest),
      merchant_id: 0, merchant_name: '', merchant_city: '', merchant_zip: '',
      card_num: cards[current.acctId] || '',
      orig_ts: ts, proc_ts: ts
    });
    // BR-07: 1400-COMPUTE-FEES is an empty stub; no fee transaction.
  });
  if (lastAcct !== null) updateAccount();

  var ledgacc = accounts.map(function (a) {
    return {
      acct_id: parseInt(a.acctId, 10), active_status: a.activeStatus,
      curr_bal: formatCents(a.currBal), credit_limit: formatCents(a.creditLimit),
      cash_credit_limit: formatCents(a.cashCreditLimit), open_date: a.openDate,
      expiration_date: a.expirationDate, reissue_date: a.reissueDate,
      curr_cyc_credit: formatCents(a.currCycCredit), curr_cyc_debit: formatCents(a.currCycDebit),
      addr_zip: a.addrZip, group_id: a.groupId
    };
  });
  return {
    systxn: txns, ledgacc: ledgacc,
    summary: {
      interestRunDate: runParm, balancesRead: balances.length, transactionsWritten: txns.length,
      accountsUpdated: accountsUpdated, standardFallbacks: fallbackCount, warnings: warnings
    }
  };
}

var accrueResult = runAccrue({
  interestRunDate: input.interestRunDate, ledgaccFile: input.ledgaccFile, balcatFile: input.balcatFile,
  rategrpFile: input.rategrpFile, cardlinkFile: input.cardlinkFile, processTs: input.processTs
});
output.accrueSystxnJson = JSON.stringify(accrueResult.systxn);
output.accrueLedgaccJson = JSON.stringify(accrueResult.ledgacc);
output.accrueSummaryJson = JSON.stringify(accrueResult.summary);
