// Ledgerline ACCRUE step (legacy LXB002C, FlowX process P-15 "interest-calculation").
// Pure logic, shared verbatim by the FlowX SCRIPT node and the local runner (run_accrue.js).
// Every decision the wiki leaves open is numbered A-xx and explained in assumptions.md.

var ACCRUE = {
  REC_ACCOUNT: 300,          // LXV022Y
  REC_XREF: 50,              // LXV024Y
  REC_CATBAL: 50,            // LXV026Y
  REC_RATE: 50,              // LXV027Y
  DEFAULT_RUN_PARM: '2022071800',  // BR-05 / legacy PARM (A-06)
  FALLBACK_GROUP: 'STANDARD',      // BR-02
  DIVISOR: 1200,                   // BR-03, 12 months x 100
  TXN_TYPE_CD: '07',               // BR-04
  TXN_CAT_CD: 12,                  // BR-04
  TXN_SOURCE: 'Batch',             // BR-04
  TXN_DESC_PREFIX: 'Accrued int ', // BR-04
  // BR-06 "At each change of account": the account is rewritten when the next
  // account starts, so the last account of the file is not rewritten (A-03).
  UPDATE_LAST_ACCOUNT: false
};

function accrueRtrim(s) { return String(s).replace(/\s+$/, ''); }

function accrueRecords(text, len) {
  var out = [];
  var raw = String(text == null ? '' : text).split(/\r?\n/);
  for (var i = 0; i < raw.length; i++) {
    if (accrueRtrim(raw[i]) === '') continue;
    out.push(raw[i].padEnd(len, ' '));
  }
  return out;
}

// Zoned decimal with 2 implied decimals -> BigInt hundredths. Accepts EBCDIC-style
// overpunch ({ A-I positive, } J-R negative), ASCII overpunch (p-y negative),
// explicit leading/trailing sign and an explicit decimal point (A-09).
var ACCRUE_POS = '{ABCDEFGHI', ACCRUE_NEG = '}JKLMNOPQR', ACCRUE_NEG_ASCII = 'pqrstuvwxy';
function accrueZoned(field) {
  var s = String(field).trim();
  if (s === '') return BigInt(0);
  var neg = false, d;
  if (s[0] === '-' || s[0] === '+') { neg = s[0] === '-'; s = s.slice(1).trim(); }
  var last = s[s.length - 1];
  if ((d = ACCRUE_POS.indexOf(last)) >= 0) s = s.slice(0, -1) + d;
  else if ((d = ACCRUE_NEG.indexOf(last)) >= 0) { neg = !neg; s = s.slice(0, -1) + d; }
  else if ((d = ACCRUE_NEG_ASCII.indexOf(last)) >= 0) { neg = !neg; s = s.slice(0, -1) + d; }
  else if (last === '-' || last === '+') { if (last === '-') neg = !neg; s = s.slice(0, -1); }
  if (s.indexOf('.') >= 0) { var p = s.split('.'); s = p[0] + (p[1] + '00').slice(0, 2); }
  if (!/^\d+$/.test(s)) throw new Error('Invalid numeric field: "' + field + '"');
  var v = BigInt(s);
  return neg ? -v : v;
}

function accrueMoney(c) {
  var neg = c < BigInt(0);
  var s = (neg ? -c : c).toString().padStart(3, '0');
  return (neg ? '-' : '') + s.slice(0, -2) + '.' + s.slice(-2);
}

function accrueNumKey(s) {
  var t = String(s).trim();
  return /^\d+$/.test(t) ? String(parseInt(t, 10)) : t;
}

function accrueDb2Timestamp(d) {
  function p(n, w) { return String(n).padStart(w, '0'); }
  return d.getFullYear() + '-' + p(d.getMonth() + 1, 2) + '-' + p(d.getDate(), 2) + '-' +
    p(d.getHours(), 2) + '.' + p(d.getMinutes(), 2) + '.' + p(d.getSeconds(), 2) + '.' +
    p(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

function accrueParseAccount(l) {
  return {
    key: accrueNumKey(l.slice(0, 11)),
    acct_id: parseInt(l.slice(0, 11).trim(), 10),
    active_status: accrueRtrim(l.slice(11, 12)),
    curr_bal: accrueZoned(l.slice(12, 24)),
    credit_limit: accrueZoned(l.slice(24, 36)),
    cash_credit_limit: accrueZoned(l.slice(36, 48)),
    open_date: accrueRtrim(l.slice(48, 58)),
    expiration_date: accrueRtrim(l.slice(58, 68)),
    reissue_date: accrueRtrim(l.slice(68, 78)),
    curr_cyc_credit: accrueZoned(l.slice(78, 90)),
    curr_cyc_debit: accrueZoned(l.slice(90, 102)),
    addr_zip: accrueRtrim(l.slice(102, 112)),
    group_id: accrueRtrim(l.slice(112, 122))
  };
}

function accrueAccountOut(a) {
  return {
    acct_id: a.acct_id, active_status: a.active_status,
    curr_bal: accrueMoney(a.curr_bal), credit_limit: accrueMoney(a.credit_limit),
    cash_credit_limit: accrueMoney(a.cash_credit_limit),
    open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
    curr_cyc_credit: accrueMoney(a.curr_cyc_credit), curr_cyc_debit: accrueMoney(a.curr_cyc_debit),
    addr_zip: a.addr_zip, group_id: a.group_id
  };
}

function accrueRateKey(group, type, cat) {
  return accrueRtrim(group).trim() + '|' + accrueRtrim(type).trim() + '|' + accrueNumKey(cat);
}

// files: { ledgacc, cardlink, balcat, rategrp } as raw fixed-width text
// params: { interestRunDate, runTimestamp, updateLastAccount }
function accrueInterest(files, params) {
  params = params || {};
  var warnings = [];
  var runParm = (params.interestRunDate ? String(params.interestRunDate) : ACCRUE.DEFAULT_RUN_PARM)
    .padEnd(10, ' ').slice(0, 10);
  var ts = params.runTimestamp ? String(params.runTimestamp) : accrueDb2Timestamp(new Date());
  var updateLast = params.updateLastAccount == null ? ACCRUE.UPDATE_LAST_ACCOUNT : !!params.updateLastAccount;

  // Accounts (LEDGACC) keyed by account id, original order kept for the output.
  var accounts = [], accountByKey = {};
  accrueRecords(files.ledgacc, ACCRUE.REC_ACCOUNT).forEach(function (l) {
    var a = accrueParseAccount(l);
    accounts.push(a);
    accountByKey[a.key] = a;
  });

  // Card cross-reference (CARDLINK) by account id: first card in card-number order (A-07).
  var xref = [];
  accrueRecords(files.cardlink, ACCRUE.REC_XREF).forEach(function (l) {
    xref.push({ card: accrueRtrim(l.slice(0, 16)), acct: accrueNumKey(l.slice(25, 36)) });
  });
  xref.sort(function (x, y) { return x.card < y.card ? -1 : x.card > y.card ? 1 : 0; });
  var cardByAcct = {};
  xref.forEach(function (x) { if (!(x.acct in cardByAcct)) cardByAcct[x.acct] = x.card; });

  // Disclosure groups (RATEGRP): groupId + typeCode + categoryCode -> rate (hundredths of a percent).
  var rates = {};
  accrueRecords(files.rategrp, ACCRUE.REC_RATE).forEach(function (l) {
    rates[accrueRateKey(l.slice(0, 10), l.slice(10, 12), l.slice(12, 16))] = accrueZoned(l.slice(16, 22));
  });

  // Category balances (BALCAT), read in KSDS key order: account, type, category (A-02).
  var balances = accrueRecords(files.balcat, ACCRUE.REC_CATBAL).map(function (l) {
    return {
      acctRaw: l.slice(0, 11), acct: accrueNumKey(l.slice(0, 11)),
      type: accrueRtrim(l.slice(11, 13)), cat: accrueNumKey(l.slice(13, 17)),
      bal: accrueZoned(l.slice(17, 28))
    };
  });
  balances.sort(function (x, y) {
    var ax = Number(x.acct), ay = Number(y.acct);
    if (ax !== ay) return ax < ay ? -1 : 1;
    if (x.type !== y.type) return x.type < y.type ? -1 : 1;
    return Number(x.cat) - Number(y.cat);
  });

  var transactions = [];
  var suffix = 0, fallbackCount = 0, zeroRateCount = 0, updatedCount = 0, skipped = 0;
  var lastAcct = null, current = null, totalInt = BigInt(0), first = true;
  var ZERO = BigInt(0), DIV = BigInt(100 * ACCRUE.DIVISOR);

  function updateAccount(acc, total) {   // BR-06
    if (!acc) return;
    acc.curr_bal = acc.curr_bal + total;
    acc.curr_cyc_credit = ZERO;
    acc.curr_cyc_debit = ZERO;
    updatedCount++;
  }

  balances.forEach(function (b) {
    if (b.acct !== lastAcct) {
      if (!first) updateAccount(current, totalInt); else first = false;
      totalInt = ZERO;
      lastAcct = b.acct;
      current = accountByKey[b.acct] || null;
      if (!current) warnings.push('Account ' + b.acct + ' not in ledgacc: its category balances were skipped (A-10)');
      else if (!(b.acct in cardByAcct)) warnings.push('Account ' + b.acct + ' has no card cross-reference: card_num left blank (A-07)');
    }
    if (!current) { skipped++; return; }

    // BR-01 / BR-02: group rate, else STANDARD; neither found -> no interest (A-05).
    var rate = rates[accrueRateKey(current.group_id, b.type, b.cat)];
    if (rate === undefined) {
      rate = rates[accrueRateKey(ACCRUE.FALLBACK_GROUP, b.type, b.cat)];
      fallbackCount++;
      if (rate === undefined) {
        warnings.push('No rate for ' + current.group_id + '/' + b.type + '/' + b.cat + ' nor STANDARD fallback (account ' + b.acct + '): no interest');
        rate = ZERO;
      }
    }
    if (rate === ZERO || rate == 0) { zeroRateCount++; return; }   // BR-03, BR-10

    // BR-03 / BR-08: (balance x rate) / 1200, truncated to 2 decimals (A-01).
    var interest = (b.bal * rate) / DIV;
    totalInt = totalInt + interest;
    suffix++;
    // BR-04 / BR-05 interest transaction; BR-07 fees stub: nothing charged.
    transactions.push({
      tran_id: runParm + String(suffix).padStart(6, '0'),
      type_cd: ACCRUE.TXN_TYPE_CD,
      cat_cd: ACCRUE.TXN_CAT_CD,
      source: ACCRUE.TXN_SOURCE,
      desc: ACCRUE.TXN_DESC_PREFIX + String(b.acct).padStart(11, '0'),
      amt: accrueMoney(interest),
      merchant_id: 0,
      merchant_name: '',
      merchant_city: '',
      merchant_zip: '',
      card_num: cardByAcct[b.acct] || '',
      orig_ts: ts,
      proc_ts: ts
    });
  });
  if (!first && updateLast) updateAccount(current, totalInt);

  return {
    transactions: transactions,
    accounts: accounts.map(accrueAccountOut),
    warnings: warnings,
    summary: {
      interestRunDate: runParm.trim(),
      runTimestamp: ts,
      accountsRead: accounts.length,
      categoryBalancesRead: balances.length,
      interestTransactions: transactions.length,
      accountsUpdated: updatedCount,
      lastAccountUpdated: updateLast,
      standardFallbacks: fallbackCount,
      zeroRateBalances: zeroRateCount,
      skippedBalances: skipped
    }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { accrueInterest: accrueInterest, ACCRUE: ACCRUE };
