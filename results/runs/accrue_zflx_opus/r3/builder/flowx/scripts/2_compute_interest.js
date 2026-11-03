// Compute Interest — one pass over the category balances in key order (LXB002C main loop).
// Per balance: rate = rategrp[account group, type, category], falling back to group DEFAULT;
// a zero rate writes nothing. Otherwise
//   monthly interest = (category balance x annual rate %) / 1200, truncated to cents (no ROUNDED)
// and one System interest transaction is written; the amounts are totalled per account.
var st = JSON.parse(String(input.accrueState));
var HAS_BIG = typeof BigInt === 'function';

// bal in cents x rate in hundredths of a percent / (100 x 1200) -> cents, truncated toward zero
function monthlyInterest(balCents, rateHund) {
  if (HAS_BIG) return Number(BigInt(balCents) * BigInt(rateHund) / BigInt(120000));
  var p = balCents * rateHund;
  return p < 0 ? Math.ceil(p / 120000) : Math.floor(p / 120000);
}
function rateFor(groupId, typeCd, catCd) {
  var k = groupId + '|' + typeCd + '|' + catCd;
  if (st.rates.hasOwnProperty(k)) return st.rates[k];
  var d = 'DEFAULT|' + typeCd + '|' + catCd;
  return st.rates.hasOwnProperty(d) ? st.rates[d] : 0;
}
function zpad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

var acctById = {};
st.accounts.forEach(function (a) { acctById[a.id] = a; });

var txns = [], totals = {}, order = [], suffix = 0;
st.balances.forEach(function (b) {
  if (!totals.hasOwnProperty(b.acctId)) { totals[b.acctId] = 0; order.push(b.acctId); }
  var acct = acctById[b.acctId];
  var rate = rateFor(acct ? acct.groupId : '', b.typeCd, b.catCd);
  if (rate === 0) return;
  var amt = monthlyInterest(b.bal, rate);
  totals[b.acctId] += amt;
  suffix += 1;
  txns.push({
    tran_id: st.parm + zpad(suffix % 1000000, 6),
    type_cd: '01',
    cat_cd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + zpad(b.acctId, 11),
    amt: amt,
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: st.xref[b.acctId] || '',
    orig_ts: st.timestamp,
    proc_ts: st.timestamp
  });
});

output.interestState = JSON.stringify({ txns: txns, totals: totals, order: order });
