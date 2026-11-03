// ---- shared batch helpers (copied verbatim at the top of every batch SCRIPT node) ----
var RUN_TS = String((typeof additionalData !== 'undefined' && additionalData && additionalData.applicationConfiguration && additionalData.applicationConfiguration.RUN_TIMESTAMP) || '2022-07-18 10:00:00');
var DB2_TS = RUN_TS.substring(0, 10) + '-' + RUN_TS.substring(11, 13) + '.' + RUN_TS.substring(14, 16) + '.' + RUN_TS.substring(17, 19) + '.000000';
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
function lines(v) { if (v === null || v === undefined) return null; var a = []; if (typeof v === 'string') a = v.split(/\r?\n/); else { var c = JSON.parse(JSON.stringify(v)); for (var i = 0; i < c.length; i++) a.push(String(c[i])); } var o = []; for (var j = 0; j < a.length; j++) if (a[j].replace(/\s+$/, '') !== '') o.push(a[j]); return o; }
function sp(k) { var s = ''; while (s.length < k) s += ' '; return s; }
function rep(c, k) { var s = ''; while (s.length < k) s += c; return s; }
function pad(s, k) { s = (s === null || s === undefined) ? '' : String(s); return s.length >= k ? s.substring(0, k) : s + sp(k - s.length); }
function lpad(s, k, c) { s = String(s); while (s.length < k) s = (c || ' ') + s; return s; }
function x(r, a, b) { return r.substring(a, b).replace(/\s+$/, ''); }
function n(r, a, b) { var v = parseInt(r.substring(a, b).trim(), 10); return isNaN(v) ? 0 : v; }
// signed zoned decimal with implied 2 decimals (ASCII overpunch {A-I / }J-R / p-y, or explicit sign) -> integer cents
function zc(r, a, b) {
  var t = r.substring(a, b).trim(); if (!t) return 0; var neg = false, k;
  if (t.charAt(0) === '-' || t.charAt(0) === '+') { neg = t.charAt(0) === '-'; t = t.substring(1); }
  var e = t.charAt(t.length - 1);
  if (e === '-' || e === '+') { if (e === '-') neg = true; t = t.substring(0, t.length - 1); e = t.charAt(t.length - 1); }
  if ((k = '{ABCDEFGHI'.indexOf(e)) >= 0) t = t.substring(0, t.length - 1) + k;
  else if ((k = '}JKLMNOPQR'.indexOf(e)) >= 0) { t = t.substring(0, t.length - 1) + k; neg = true; }
  else if ((k = 'pqrstuvwxy'.indexOf(e)) >= 0) { t = t.substring(0, t.length - 1) + k; neg = true; }
  var v = t.indexOf('.') >= 0 ? Math.round(parseFloat(t) * 100) : parseInt(t, 10); if (isNaN(v)) v = 0;
  return neg ? -v : v;
}
function amt(c) { return c === 0 ? 0 : Number((c / 100).toFixed(2)); }
function pAcct(r) { return { acct_id: n(r, 0, 11), active_status: x(r, 11, 12), curr_bal: zc(r, 12, 24), credit_limit: zc(r, 24, 36), cash_credit_limit: zc(r, 36, 48), open_date: x(r, 48, 58), expiration_date: x(r, 58, 68), reissue_date: x(r, 68, 78), curr_cyc_credit: zc(r, 78, 90), curr_cyc_debit: zc(r, 90, 102), addr_zip: x(r, 102, 112), group_id: x(r, 112, 122) }; }
function oAcct(a) { return { acct_id: a.acct_id, active_status: a.active_status, curr_bal: amt(a.curr_bal), credit_limit: amt(a.credit_limit), cash_credit_limit: amt(a.cash_credit_limit), open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date, curr_cyc_credit: amt(a.curr_cyc_credit), curr_cyc_debit: amt(a.curr_cyc_debit), addr_zip: a.addr_zip, group_id: a.group_id }; }
function pTran(r) { return { tran_id: x(r, 0, 16), type_cd: x(r, 16, 18), cat_cd: n(r, 18, 22), source: x(r, 22, 32), desc: x(r, 32, 132), amt: zc(r, 132, 143), merchant_id: n(r, 143, 152), merchant_name: x(r, 152, 202), merchant_city: x(r, 202, 252), merchant_zip: x(r, 252, 262), card_num: x(r, 262, 278), orig_ts: x(r, 278, 304), proc_ts: x(r, 304, 330) }; }
function oTran(t) { return { tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc, amt: amt(t.amt), merchant_id: t.merchant_id, merchant_name: t.merchant_name, merchant_city: t.merchant_city, merchant_zip: t.merchant_zip, card_num: t.card_num, orig_ts: t.orig_ts, proc_ts: t.proc_ts }; }
function pXref(r) { return { card_num: x(r, 0, 16), cust_id: n(r, 16, 25), acct_id: n(r, 25, 36) }; }
function pCard(r) { return { card_num: x(r, 0, 16), acct_id: n(r, 16, 27), cvv_cd: n(r, 27, 30), embossed_name: x(r, 30, 80), expiration_date: x(r, 80, 90), active_status: x(r, 90, 91) }; }
function pCust(r) { return { cust_id: n(r, 0, 9), first_name: x(r, 9, 34), middle_name: x(r, 34, 59), last_name: x(r, 59, 84), addr_line_1: x(r, 84, 134), addr_line_2: x(r, 134, 184), addr_line_3: x(r, 184, 234), addr_state_cd: x(r, 234, 236), addr_country_cd: x(r, 236, 239), addr_zip: x(r, 239, 249), phone_num_1: x(r, 249, 264), phone_num_2: x(r, 264, 279), ssn: n(r, 279, 288), govt_issued_id: x(r, 288, 308), dob: x(r, 308, 318), eft_account_id: x(r, 318, 328), pri_card_holder_ind: x(r, 328, 329), fico_credit_score: n(r, 329, 332) }; }
// ---- end helpers ----
