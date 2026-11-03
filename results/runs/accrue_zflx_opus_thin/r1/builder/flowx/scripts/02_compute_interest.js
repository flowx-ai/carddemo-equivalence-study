// FlowX SCRIPT node "Compute interest" (workflow accrue_interest_calculation).
// Rule ComputeInterest (LXB002C): walks the category balances in key order
// (account id, type code, category code), looks up the disclosure-group rate for
// (account group, type, category), and computes
//     monthly interest = balance x rate / 1200, truncated to the cent (no rounding)
// For every balance whose rate is not zero an interest transaction is written. The per-account
// total is handed to "Post interest". See assumptions.md for each decision taken here.
// Result: output.computed = JSON string { txns, postings, warnings }.

var loaded = JSON.parse(String(input.loaded));
var warnings = loaded.warnings || [];
var parmDate = String(input.parmDate == null ? "" : input.parmDate);
var businessDate = String(input.businessDate == null ? "" : input.businessDate);

var DEFAULT_GROUP = "DEFAULT";
var INTEREST_TYPE_CD = "01";
var INTEREST_CAT_CD = 5;
var INTEREST_SOURCE = "System";

function pad(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function padRight(s, n) { s = String(s); while (s.length < n) s += " "; return s.substring(0, n); }
function fmtCents(v) {
  var b = BigInt(v);
  var neg = b < BigInt(0);
  if (neg) b = -b;
  var s = pad(b.toString(), 3, "0");
  return (neg ? "-" : "") + s.slice(0, -2) + "." + s.slice(-2);
}
// DB2-format timestamp (YYYY-MM-DD-HH.MM.SS.mmmmmm) for the business date.
function db2Timestamp(d) {
  var m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(d);
  var day = m ? m[1] + "-" + m[2] + "-" + m[3] : "0001-01-01";
  return day + "-00.00.00.000000";
}

// Lookups
var accounts = {};
loaded.accounts.forEach(function (a) { accounts[a.acct_id] = a; });
var cardByAcct = {};
loaded.xrefs.forEach(function (x) {
  var cur = cardByAcct[x.acct_id];
  if (cur === undefined || x.card_num < cur) cardByAcct[x.acct_id] = x.card_num; // AIX read returns lowest primary key
});
var rates = {};
function rateKey(g, t, c) { return String(g).replace(/\s+$/, "") + "|" + String(t).replace(/\s+$/, "") + "|" + Number(c); }
loaded.rates.forEach(function (r) { rates[rateKey(r.group_id, r.type_cd, r.cat_cd)] = r.int_rate; });

// KSDS sequential order of the category-balance file
var balcats = loaded.balcats.slice().sort(function (a, b) {
  var ka = pad(a.acct_id, 11, "0") + padRight(a.type_cd, 2) + pad(a.cat_cd, 4, "0");
  var kb = pad(b.acct_id, 11, "0") + padRight(b.type_cd, 2) + pad(b.cat_cd, 4, "0");
  return ka < kb ? -1 : ka > kb ? 1 : 0;
});

var ts = db2Timestamp(businessDate);
var tranPrefix = padRight(parmDate, 10);
var suffix = 0;
var txns = [];
var postings = {};   // acct_id -> total interest in cents (string)
var order = [];      // accounts in processing order
var missingAccounts = {};

balcats.forEach(function (bc) {
  var acct = accounts[bc.acct_id];
  if (!acct) {
    if (!missingAccounts[bc.acct_id]) warnings.push("category balance for unknown account " + bc.acct_id + " skipped");
    missingAccounts[bc.acct_id] = true;
    return;
  }
  if (postings[bc.acct_id] === undefined) { postings[bc.acct_id] = "0"; order.push(bc.acct_id); }

  var rate = rates[rateKey(acct.group_id, bc.type_cd, bc.cat_cd)];
  if (rate === undefined) {
    rate = rates[rateKey(DEFAULT_GROUP, bc.type_cd, bc.cat_cd)];
    if (rate === undefined) {
      warnings.push("no rate for group '" + acct.group_id + "' or " + DEFAULT_GROUP + ", type " + bc.type_cd + ", cat " + bc.cat_cd + " (account " + bc.acct_id + "): no interest");
      return;
    }
  }
  if (BigInt(rate) === BigInt(0)) return;

  // cents = balance(cents) * rate(hundredths of a percent-point) / (1200 * 100); BigInt division truncates toward zero
  var interest = BigInt(bc.bal) * BigInt(rate) / BigInt(120000);
  postings[bc.acct_id] = (BigInt(postings[bc.acct_id]) + interest).toString();

  suffix += 1;
  var card = cardByAcct[bc.acct_id];
  if (card === undefined) { warnings.push("no card cross-reference for account " + bc.acct_id); card = ""; }
  txns.push({
    tran_id: tranPrefix + pad(suffix, 6, "0"),
    type_cd: INTEREST_TYPE_CD,
    cat_cd: INTEREST_CAT_CD,
    source: INTEREST_SOURCE,
    desc: "Int. for a/c " + pad(bc.acct_id, 11, "0"),
    amt: fmtCents(interest.toString()),
    merchant_id: 0,
    merchant_name: "",
    merchant_city: "",
    merchant_zip: "",
    card_num: card,
    orig_ts: ts,
    proc_ts: ts
  });
});

output.computed = JSON.stringify({ txns: txns, postings: postings, order: order, warnings: warnings });
