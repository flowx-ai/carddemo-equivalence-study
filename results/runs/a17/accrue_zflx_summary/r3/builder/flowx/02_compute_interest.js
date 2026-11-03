// ACCRUE (LXB002C): for each account/type/category balance, find the
// disclosure-group rate (falling back to the STANDARD group), compute monthly
// interest = balance * rate / 1200 (truncated to the cent), write one interest
// transaction (type 07, category 12) when the rate is not 0, then add the
// account's total interest to its current balance and reset cycle credit/debit.

var TXN_TYPE = '07';
var TXN_CAT = 12;
var FALLBACK_GROUP = 'STANDARD';

function fmt(c) { // BigInt minor units -> "123.45"
  var neg = c < 0n;
  var a = neg ? -c : c;
  var s = a.toString();
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substr(0, s.length - 2) + '.' + s.substr(s.length - 2);
}

function pad0(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

function db2Timestamp(d) { // YYYY-MM-DD-HH.MM.SS.hh0000
  return pad0(d.getFullYear(), 4) + '-' + pad0(d.getMonth() + 1, 2) + '-' + pad0(d.getDate(), 2) + '-' +
    pad0(d.getHours(), 2) + '.' + pad0(d.getMinutes(), 2) + '.' + pad0(d.getSeconds(), 2) + '.' +
    pad0(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

var parsed = input.parsed;
var parm = String(input.parm || '2022071800');
var idPrefix = (parm + '          ').substr(0, 10);
var ts = db2Timestamp(new Date());

// account master, in input order
var accounts = [];
var acctIdx = {};
for (var i = 0; i < parsed.accounts.length; i++) {
  var a = parsed.accounts[i];
  var rec = {
    acct_id: Number(a.acct_id), active_status: String(a.active_status),
    curr_bal: BigInt(String(a.curr_bal)), credit_limit: BigInt(String(a.credit_limit)),
    cash_credit_limit: BigInt(String(a.cash_credit_limit)),
    open_date: String(a.open_date), expiration_date: String(a.expiration_date), reissue_date: String(a.reissue_date),
    curr_cyc_credit: BigInt(String(a.curr_cyc_credit)), curr_cyc_debit: BigInt(String(a.curr_cyc_debit)),
    addr_zip: String(a.addr_zip), group_id: String(a.group_id)
  };
  accounts.push(rec);
  if (!acctIdx.hasOwnProperty(String(rec.acct_id))) acctIdx[String(rec.acct_id)] = rec;
}

// disclosure groups keyed by group/type/category
var rateIdx = {};
for (var r = 0; r < parsed.rates.length; r++) {
  var g = parsed.rates[r];
  var key = String(g.group_id) + '|' + String(g.type_cd) + '|' + Number(g.cat_cd);
  if (!rateIdx.hasOwnProperty(key)) rateIdx[key] = BigInt(String(g.rate));
}

// card cross-reference: first card listed for the account
var cardIdx = {};
for (var c = 0; c < parsed.cards.length; c++) {
  var x = parsed.cards[c];
  if (!cardIdx.hasOwnProperty(String(x.acct_id))) cardIdx[String(x.acct_id)] = String(x.card_num);
}

// category balances in key order (account, type, category)
var balances = [];
for (var b = 0; b < parsed.balances.length; b++) {
  var e = parsed.balances[b];
  balances.push({ acct_id: Number(e.acct_id), type_cd: String(e.type_cd), cat_cd: Number(e.cat_cd),
                  bal: BigInt(String(e.bal)), seq: b });
}
balances.sort(function (p, q) {
  if (p.acct_id !== q.acct_id) return p.acct_id < q.acct_id ? -1 : 1;
  if (p.type_cd !== q.type_cd) return p.type_cd < q.type_cd ? -1 : 1;
  if (p.cat_cd !== q.cat_cd) return p.cat_cd - q.cat_cd;
  return p.seq - q.seq;
});

var txns = [];
var suffix = 0;
var skipped = [];
var lastAcct = null;
var acct = null;
var totalInt = 0n;

function updateAccount() {
  if (acct === null) return;
  acct.curr_bal = acct.curr_bal + totalInt;
  acct.curr_cyc_credit = 0n;
  acct.curr_cyc_debit = 0n;
}

for (var n = 0; n < balances.length; n++) {
  var bc = balances[n];
  if (bc.acct_id !== lastAcct) {
    updateAccount();               // account done -> update the previous account
    lastAcct = bc.acct_id;
    totalInt = 0n;
    acct = acctIdx.hasOwnProperty(String(bc.acct_id)) ? acctIdx[String(bc.acct_id)] : null;
  }
  if (acct === null) { skipped.push(bc.acct_id + '/' + bc.type_cd + '/' + bc.cat_cd + ': account not found'); continue; }

  var rate = rateIdx[acct.group_id + '|' + bc.type_cd + '|' + bc.cat_cd];
  if (rate === undefined) rate = rateIdx[FALLBACK_GROUP + '|' + bc.type_cd + '|' + bc.cat_cd];
  if (rate === undefined) { skipped.push(bc.acct_id + '/' + bc.type_cd + '/' + bc.cat_cd + ': no rate'); rate = 0n; }
  if (rate === 0n) continue;

  // cents * (rate in hundredths of a percent) / (100 * 1200 / 100) -> cents, truncated toward zero
  var interest = (bc.bal * rate) / 12000n;
  totalInt = totalInt + interest;

  suffix = suffix + 1;
  txns.push({
    tran_id: idPrefix + pad0(suffix, 6),
    type_cd: TXN_TYPE,
    cat_cd: TXN_CAT,
    source: 'System',
    desc: 'Int. for a/c ' + pad0(acct.acct_id, 11),
    amt: fmt(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardIdx.hasOwnProperty(String(acct.acct_id)) ? cardIdx[String(acct.acct_id)] : '',
    orig_ts: ts,
    proc_ts: ts
  });
}
updateAccount();                   // last account

var outAccts = [];
for (var o = 0; o < accounts.length; o++) {
  var q = accounts[o];
  outAccts.push({
    acct_id: q.acct_id, active_status: q.active_status, curr_bal: fmt(q.curr_bal),
    credit_limit: fmt(q.credit_limit), cash_credit_limit: fmt(q.cash_credit_limit),
    open_date: q.open_date, expiration_date: q.expiration_date, reissue_date: q.reissue_date,
    curr_cyc_credit: fmt(q.curr_cyc_credit), curr_cyc_debit: fmt(q.curr_cyc_debit),
    addr_zip: q.addr_zip, group_id: q.group_id
  });
}

output.accrue_systxn = txns;
output.accrue_ledgacc = outAccts;
output.warnings = skipped;
output.parsed = null;
