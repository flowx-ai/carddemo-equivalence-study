// ACCRUE / LXB002C: for each account/type/category balance, look up the
// disclosure-group rate (fallback group STANDARD), compute monthly interest,
// write a type 07 / category 12 transaction, then add the account's total
// interest to its balance and reset the cycle credit/debit totals.

var p = JSON.parse(String(input.parsedJson));
var parm = input.accrueParm ? String(input.accrueParm) : '2022071800';
while (parm.length < 10) parm += ' ';
parm = parm.substring(0, 10);

var DEFAULT_GROUP = 'STANDARD';
var TXN_TYPE = '07';
var TXN_CAT = 12;
var bizDate = parm.substring(0, 4) + '-' + parm.substring(4, 6) + '-' + parm.substring(6, 8);
var ts = bizDate + '-00.00.00.000000';

// monthly interest in cents = trunc(bal * rate / 1200), bal in cents, rate in hundredths of a percent
function monthlyInterest(balCents, rateHundredths) {
  if (typeof BigInt === 'function') {
    var q = (BigInt(balCents) * BigInt(rateHundredths)) / BigInt(120000); // BigInt division truncates toward zero
    return Number(q);
  }
  var prod = balCents * rateHundredths;
  return prod < 0 ? Math.ceil(prod / 120000) : Math.floor(prod / 120000);
}

function amt(cents) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  var frac = String(a % 100);
  if (frac.length < 2) frac = '0' + frac;
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + frac;
}

var acctById = {};
for (var i = 0; i < p.accounts.length; i++) acctById[p.accounts[i].acct_id] = p.accounts[i];

var cardByAcct = {};
for (var i = 0; i < p.xrefs.length; i++) {
  var x = p.xrefs[i];
  if (cardByAcct[x.acct_id] === undefined) cardByAcct[x.acct_id] = x.card_num;
}

var rateByKey = {};
for (var i = 0; i < p.rates.length; i++) {
  var g = p.rates[i];
  var k = g.group_id + '|' + g.type_cd + '|' + g.cat_cd;
  if (rateByKey[k] === undefined) rateByKey[k] = g.rate;
}

function findRate(groupId, typeCd, catCd) {
  var r = rateByKey[groupId + '|' + typeCd + '|' + catCd];
  if (r !== undefined) return r;
  r = rateByKey[DEFAULT_GROUP + '|' + typeCd + '|' + catCd];
  return r !== undefined ? r : 0;
}

var systxn = [];
var suffix = 0;
var current = null;   // account being accumulated
var totalInt = 0;
var lastAcctId = null;

function updateAccount() {
  if (current === null) return;
  current.curr_bal += totalInt;
  current.curr_cyc_credit = 0;
  current.curr_cyc_debit = 0;
}

for (var i = 0; i < p.balances.length; i++) {
  var b = p.balances[i];
  if (b.acct_id !== lastAcctId) {
    updateAccount();
    lastAcctId = b.acct_id;
    totalInt = 0;
    current = acctById[b.acct_id] || null;
  }
  if (current === null) continue; // balance for an account not in the account file
  var rate = findRate(current.group_id, b.type_cd, b.cat_cd);
  if (rate === 0) continue;
  var interest = monthlyInterest(b.bal, rate);
  totalInt += interest;
  suffix += 1;
  var sfx = String(suffix);
  while (sfx.length < 6) sfx = '0' + sfx;
  var card = cardByAcct[b.acct_id];
  systxn.push({
    tran_id: parm + sfx,
    type_cd: TXN_TYPE,
    cat_cd: TXN_CAT,
    source: 'System',
    desc: 'Int. for a/c ' + String(b.acct_id),
    amt: amt(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: card === undefined ? '' : card,
    orig_ts: ts,
    proc_ts: ts
  });
}
updateAccount(); // the last account in the balance file

var ledgacc = [];
for (var i = 0; i < p.accounts.length; i++) {
  var a = p.accounts[i];
  ledgacc.push({
    acct_id: a.acct_id,
    active_status: a.active_status,
    curr_bal: amt(a.curr_bal),
    credit_limit: amt(a.credit_limit),
    cash_credit_limit: amt(a.cash_credit_limit),
    open_date: a.open_date,
    expiration_date: a.expiration_date,
    reissue_date: a.reissue_date,
    curr_cyc_credit: amt(a.curr_cyc_credit),
    curr_cyc_debit: amt(a.curr_cyc_debit),
    addr_zip: a.addr_zip,
    group_id: a.group_id
  });
}

output.accrue_systxn = systxn;
output.accrue_ledgacc = ledgacc;
output.parsedJson = null;
