// Ledgerline ACCRUE (interest calculation) — core logic.
// The same function body is deployed in the FlowX SCRIPT node "Compute interest"
// (workflow ll_accrue) and run locally by run_local.js. See ../assumptions.md (A-nn refs).

function ledgerlineAccrue(files, params) {
  // ---- options (each one is a recorded assumption) ----
  var SKIP_LAST_ACCOUNT_UPDATE = true;      // A-12
  var TXN_TYPE_CD = '01';                   // A-09
  var TXN_CAT_CD = 5;                       // A-09
  var TXN_SOURCE = 'System';                // A-09
  var DEFAULT_GROUP = 'DEFAULT';            // A-07

  var parmDate = String(params.parmDate || '2022071800');          // A-08
  var businessDate = String(params.businessDate || '2022-07-18');
  var ts = businessDate + '-00.00.00.000000';                       // A-10

  function lines(text) {
    if (text === null || text === undefined) return [];
    return String(text).split(/\r?\n/).filter(function (l) { return l.replace(/\s+$/, '').length > 0; });
  }
  function pad(l, n) { while (l.length < n) l += ' '; return l; }
  function rtrim(s) { return s.replace(/\s+$/, ''); }

  // Signed zoned decimal -> BigInt in units of the last digit (A-03).
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEGA = 'pqrstuvwxy';
  function zoned(raw) {
    var s = raw.trim();
    if (s === '') return BigInt(0);
    var neg = false;
    if (s[0] === '-' || s[0] === '+') { neg = s[0] === '-'; s = s.slice(1); }
    var last = s[s.length - 1];
    if (last === '-' || last === '+') { neg = neg || last === '-'; s = s.slice(0, -1); last = s[s.length - 1]; }
    var i;
    if ((i = POS.indexOf(last)) >= 0) { s = s.slice(0, -1) + i; }
    else if ((i = NEG.indexOf(last)) >= 0) { s = s.slice(0, -1) + i; neg = true; }
    else if ((i = NEGA.indexOf(last)) >= 0) { s = s.slice(0, -1) + i; neg = true; }
    s = s.replace(/\./g, '');
    if (!/^[0-9]+$/.test(s)) s = s.replace(/[^0-9]/g, '') || '0';
    var v = BigInt(s);
    return neg ? -v : v;
  }
  function money(c) { // BigInt cents -> "-12.34"
    var neg = c < BigInt(0); var a = neg ? -c : c;
    var w = a / BigInt(100), f = a % BigInt(100);
    var fs = f.toString(); if (fs.length < 2) fs = '0' + fs;
    return (neg ? '-' : '') + w.toString() + '.' + fs;
  }
  function num(s) { var t = s.trim(); return t === '' ? 0 : parseInt(t.replace(/[^0-9]/g, '') || '0', 10); }

  // ---- accounts (LXV022Y, 300) ----
  var accounts = [], acctById = {};
  lines(files.ledgacc).forEach(function (raw) {
    var l = pad(raw, 300);
    var a = {
      acct_id: num(l.substring(0, 11)),
      active_status: rtrim(l.substring(11, 12)),
      curr_bal: zoned(l.substring(12, 24)),
      credit_limit: zoned(l.substring(24, 36)),
      cash_credit_limit: zoned(l.substring(36, 48)),
      open_date: rtrim(l.substring(48, 58)),
      expiration_date: rtrim(l.substring(58, 68)),
      reissue_date: rtrim(l.substring(68, 78)),
      curr_cyc_credit: zoned(l.substring(78, 90)),
      curr_cyc_debit: zoned(l.substring(90, 102)),
      addr_zip: rtrim(l.substring(102, 112)),
      group_id: rtrim(l.substring(112, 122))
    };
    if (acctById[a.acct_id] === undefined) { acctById[a.acct_id] = a; accounts.push(a); }  // A-13
  });

  // ---- card xref (LXV024Y, 50): first card per account by card number (A-11) ----
  var cardByAcct = {};
  lines(files.cardlink).map(function (raw) {
    var l = pad(raw, 50);
    return { card: rtrim(l.substring(0, 16)), acct: num(l.substring(25, 36)) };
  }).sort(function (x, y) { return x.card < y.card ? -1 : x.card > y.card ? 1 : 0; })
    .forEach(function (x) { if (cardByAcct[x.acct] === undefined) cardByAcct[x.acct] = x.card; });

  // ---- disclosure groups (LXV027Y, 50) ----
  var rates = {};
  lines(files.rategrp).forEach(function (raw) {
    var l = pad(raw, 50);
    var key = rtrim(l.substring(0, 10)) + '|' + l.substring(10, 12) + '|' + num(l.substring(12, 16));
    if (rates[key] === undefined) rates[key] = zoned(l.substring(16, 22));   // hundredths of a percent
  });
  function rateFor(group, type, cat) {
    var k = group + '|' + type + '|' + cat;
    if (rates[k] !== undefined) return rates[k];
    k = DEFAULT_GROUP + '|' + type + '|' + cat;                              // A-07
    if (rates[k] !== undefined) return rates[k];
    return BigInt(0);                                                        // A-07
  }

  // ---- category balances (LXV026Y, 50), processed in key order (A-05) ----
  var cats = lines(files.balcat).map(function (raw) {
    var l = pad(raw, 50);
    return { acct: num(l.substring(0, 11)), type: l.substring(11, 13), cat: num(l.substring(13, 17)),
             bal: zoned(l.substring(17, 28)) };
  });
  cats.sort(function (x, y) {
    if (x.acct !== y.acct) return x.acct - y.acct;
    if (x.type !== y.type) return x.type < y.type ? -1 : 1;
    return x.cat - y.cat;
  });

  var systxn = [], suffix = 0, totals = {}, order = [];
  cats.forEach(function (c) {
    if (totals[c.acct] === undefined) { totals[c.acct] = BigInt(0); order.push(c.acct); }
    var acct = acctById[c.acct];
    var group = acct ? acct.group_id : '';
    var rate = rateFor(group, c.type, c.cat);
    if (rate === BigInt(0)) return;                                           // A-06
    // monthly interest = bal * rate / 1200, truncated to cents (A-04)
    var interest = (c.bal * rate) / BigInt(120000);
    totals[c.acct] += interest;
    suffix += 1;
    var sfx = String(suffix); while (sfx.length < 6) sfx = '0' + sfx;
    var idStr = String(c.acct); while (idStr.length < 11) idStr = '0' + idStr;
    systxn.push({
      tran_id: parmDate + sfx, type_cd: TXN_TYPE_CD, cat_cd: TXN_CAT_CD, source: TXN_SOURCE,
      desc: 'Int. for a/c ' + idStr, amt: money(interest), merchant_id: 0,
      merchant_name: '', merchant_city: '', merchant_zip: '',
      card_num: cardByAcct[c.acct] || '', orig_ts: ts, proc_ts: ts
    });
  });

  // ---- account update: add total interest, reset cycle credit/debit (A-14) ----
  var toUpdate = SKIP_LAST_ACCOUNT_UPDATE ? order.slice(0, -1) : order;
  toUpdate.forEach(function (id) {
    var a = acctById[id];
    if (!a) return;                                                           // A-13
    a.curr_bal += totals[id];
    a.curr_cyc_credit = BigInt(0);
    a.curr_cyc_debit = BigInt(0);
  });

  var ledgacc = accounts.map(function (a) {
    return {
      acct_id: a.acct_id, active_status: a.active_status, curr_bal: money(a.curr_bal),
      credit_limit: money(a.credit_limit), cash_credit_limit: money(a.cash_credit_limit),
      open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
      curr_cyc_credit: money(a.curr_cyc_credit), curr_cyc_debit: money(a.curr_cyc_debit),
      addr_zip: a.addr_zip, group_id: a.group_id
    };
  });
  return { accrue_systxn: systxn, accrue_ledgacc: ledgacc };
}

if (typeof module !== 'undefined') module.exports = { ledgerlineAccrue: ledgerlineAccrue };
