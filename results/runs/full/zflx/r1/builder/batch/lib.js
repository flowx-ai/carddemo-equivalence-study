// ---- shared batch library (copied at the top of every batch_* SCRIPT node) ----
var cfg = (typeof additionalData !== 'undefined' && additionalData.applicationConfiguration) ? additionalData.applicationConfiguration : {};
var RT = String(cfg.RUN_TIMESTAMP || '2022-07-18 10:00:00');
var RT26 = (RT + '.000000').substring(0, 26);
var SP = '                                                                                                                                              ';
function padR(s, n) { s = (s === null || s === undefined) ? '' : String(s); while (s.length < n) s += SP.substring(0, Math.min(SP.length, n - s.length)); return s.substring(0, n); }
function padL(s, n, c) { s = String(s); c = c || ' '; while (s.length < n) s = c + s; return s.substring(s.length - n); }
function rep(c, n) { var s = ''; for (var i = 0; i < n; i++) s += c; return s; }
function rt(s) { return String(s).replace(/\s+$/, ''); }
function fld(l, a, b) { return l.substring(a - 1, b); }
function inFile(name) {
  var v = null, f = input.files;
  if (f !== undefined && f !== null && f[name] !== undefined && f[name] !== null) v = f[name];
  else { var k = name.replace(/\./g, '_'); if (input[k] !== undefined && input[k] !== null) v = input[k]; }
  if (v === null) return null;
  var lines = [];
  if (typeof v === 'string' || v instanceof String) lines = String(v).replace(/\r/g, '').split('\n');
  else { for (var i = 0; i < v.length; i++) lines.push(String(v[i]).replace(/[\r\n]/g, '')); }
  var out = [];
  for (var j = 0; j < lines.length; j++) if (lines[j].replace(/\s+/g, '') !== '') out.push(lines[j]);
  return out;
}
var missing = [];
function req(n) { var x = inFile(n); if (x === null) { missing.push(n); return []; } return x; }
// zoned decimal (with sign overpunch) -> scaled integer; explicit '.' accepted
function zn(str, dec) {
  dec = dec || 0; var s = String(str).trim(); if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); } else if (s.charAt(0) === '+') s = s.substring(1);
  var last = s.charAt(s.length - 1);
  if (last === '-') { neg = true; s = s.substring(0, s.length - 1); }
  else if (last === '+') s = s.substring(0, s.length - 1);
  else {
    var i = '{ABCDEFGHI'.indexOf(last);
    if (i >= 0) s = s.substring(0, s.length - 1) + i;
    else { i = '}JKLMNOPQR'.indexOf(last); if (i < 0) i = 'pqrstuvwxy'.indexOf(last);
      if (i >= 0) { s = s.substring(0, s.length - 1) + i; neg = true; } }
  }
  var n;
  if (s.indexOf('.') >= 0) n = Math.round(parseFloat(s.replace(/[^0-9.]/g, '')) * Math.pow(10, dec));
  else n = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  if (isNaN(n)) n = 0;
  return neg ? -n : n;
}
function money(c) { return c / 100; }
function cents(v) { if (v === null || v === undefined || v === '') return 0; return Math.round(parseFloat(String(v)) * 100); }
function num(v) { if (v === null || v === undefined || String(v).trim() === '') return 0; var n = parseInt(String(v), 10); return isNaN(n) ? 0 : n; }
// 9(n).99-   (z = true -> Z(n).99-)
function picN(c, n, z) {
  var a = Math.abs(c), ip = Math.floor(a / 100), dp = a % 100;
  var is = padL(ip, n, '0'); if (z) { is = ip === 0 ? rep(' ', n) : padL(String(ip), n, ' '); }
  return is + '.' + padL(dp, 2, '0') + (c < 0 ? '-' : ' ');
}
// -ZZZ,ZZZ,ZZZ.ZZ (sg '-') or +ZZZ,ZZZ,ZZZ.ZZ (sg '+'); zero -> all spaces
function picEd(c, sg) {
  if (c === 0) return rep(' ', 15);
  var a = Math.abs(c), ip = Math.floor(a / 100), dp = a % 100;
  var d = padL(ip, 9, '0'), s = '', started = false;
  for (var i = 0; i < 9; i++) {
    if (i === 3 || i === 6) s += started ? ',' : ' ';
    var ch = d.charAt(i); if (ch !== '0') started = true;
    s += started ? ch : ' ';
  }
  var sign = c < 0 ? '-' : (sg === '+' ? '+' : ' ');
  return sign + s + '.' + padL(dp, 2, '0');
}
function parseTran(l) {
  l = padR(l, 350);
  return { tran_id: rt(fld(l, 1, 16)), type_cd: rt(fld(l, 17, 18)), cat_cd: zn(fld(l, 19, 22)), source: rt(fld(l, 23, 32)),
    desc: rt(fld(l, 33, 132)), amtC: zn(fld(l, 133, 143), 2), merchant_id: zn(fld(l, 144, 152)), merchant_name: rt(fld(l, 153, 202)),
    merchant_city: rt(fld(l, 203, 252)), merchant_zip: rt(fld(l, 253, 262)), card_num: rt(fld(l, 263, 278)),
    orig_ts: rt(fld(l, 279, 304)), proc_ts: rt(fld(l, 305, 330)) };
}
function tranOut(t) {
  return { tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc, amt: money(t.amtC),
    merchant_id: t.merchant_id, merchant_name: t.merchant_name, merchant_city: t.merchant_city, merchant_zip: t.merchant_zip,
    card_num: t.card_num, orig_ts: t.orig_ts, proc_ts: t.proc_ts };
}
function parseAcct(l) {
  l = padR(l, 300);
  return { acct_id: zn(fld(l, 1, 11)), active_status: rt(fld(l, 12, 12)), bal: zn(fld(l, 13, 24), 2), lim: zn(fld(l, 25, 36), 2),
    cash: zn(fld(l, 37, 48), 2), open_date: rt(fld(l, 49, 58)), expiration_date: rt(fld(l, 59, 68)), reissue_date: rt(fld(l, 69, 78)),
    cr: zn(fld(l, 79, 90), 2), db: zn(fld(l, 91, 102), 2), addr_zip: rt(fld(l, 103, 112)), group_id: rt(fld(l, 113, 122)), line: l };
}
function acctOut(a, noZip) {
  var o = { acct_id: a.acct_id, active_status: a.active_status, curr_bal: money(a.bal), credit_limit: money(a.lim),
    cash_credit_limit: money(a.cash), open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
    curr_cyc_credit: money(a.cr), curr_cyc_debit: money(a.db) };
  if (!noZip) o.addr_zip = a.addr_zip;
  o.group_id = a.group_id;
  return o;
}
function parseXref(l) { l = padR(l, 50); return { card_num: rt(fld(l, 1, 16)), cust_id: zn(fld(l, 17, 25)), acct_id: zn(fld(l, 26, 36)) }; }
function parseTcat(l) { l = padR(l, 50); return { acct_id: zn(fld(l, 1, 11)), type_cd: rt(fld(l, 12, 13)), cat_cd: zn(fld(l, 14, 17)), balC: zn(fld(l, 18, 28), 2) }; }
function parseDisc(l) { l = padR(l, 50); return { group_id: rt(fld(l, 1, 10)), type_cd: rt(fld(l, 11, 12)), cat_cd: zn(fld(l, 13, 16)), rate: zn(fld(l, 17, 22), 2) }; }
function parseCard(l) { l = padR(l, 150); return { card_num: rt(fld(l, 1, 16)), acct_id: zn(fld(l, 17, 27)), cvv_cd: zn(fld(l, 28, 30)), embossed_name: rt(fld(l, 31, 80)), expiration_date: rt(fld(l, 81, 90)), active_status: rt(fld(l, 91, 91)) }; }
function parseCust(l) {
  l = padR(l, 500);
  return { cust_id: zn(fld(l, 1, 9)), first_name: rt(fld(l, 10, 34)), middle_name: rt(fld(l, 35, 59)), last_name: rt(fld(l, 60, 84)),
    addr_line_1: rt(fld(l, 85, 134)), addr_line_2: rt(fld(l, 135, 184)), addr_line_3: rt(fld(l, 185, 234)), addr_state_cd: rt(fld(l, 235, 236)),
    addr_country_cd: rt(fld(l, 237, 239)), addr_zip: rt(fld(l, 240, 249)), phone_num_1: rt(fld(l, 250, 264)), phone_num_2: rt(fld(l, 265, 279)),
    ssn: zn(fld(l, 280, 288)), govt_issued_id: rt(fld(l, 289, 308)), dob: rt(fld(l, 309, 318)), eft_account_id: rt(fld(l, 319, 328)),
    pri_card_holder_ind: rt(fld(l, 329, 329)), fico_credit_score: zn(fld(l, 330, 332)) };
}
function abend(step, extra) {
  output[step + '_rc'] = '12';
  var s = (extra || []).slice(0);
  s.push('ERROR: required input file missing: ' + missing.join(', '));
  s.push('ABENDING PROGRAM');
  output[step + '_sysout'] = s;
}
// ---- end library ----
