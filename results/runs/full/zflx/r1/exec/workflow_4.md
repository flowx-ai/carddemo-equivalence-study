# Workflow: ui_carddemo

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Online CardDemo dispatcher: every screen action starts this with {type, op, params, session}. Plans reads, reads the FlowX Database stores, applies the screen rules, writes, and returns the screen view model.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae859cc3695c563ea51a95e | <uuid> | (0, 0) | → Plan reads (seq:<uuid>) |
| Plan reads | SCRIPT | 6ae859d13695c563ea51a95f | <uuid> | (500, 0) | → Read users (seq:<uuid>) | lang: JAVASCRIPT |
| Read users | DATA_SOURCE | 6ae859d43695c563ea51a960 | <uuid> | (1000, 0) | → Read accounts [SUCCESS] (seq:<uuid>), → Read accounts [FAIL] (seq:<uuid>) | responseKey: ra_users, endpoint: <uuid> |
| Read accounts | DATA_SOURCE | 6ae859d83695c563ea51a961 | <uuid> | (1500, 0) | → Read customers [SUCCESS] (seq:<uuid>), → Read customers [FAIL] (seq:<uuid>) | responseKey: ra_accounts, endpoint: <uuid> |
| Read customers | DATA_SOURCE | 6ae859dc3695c563ea51a962 | <uuid> | (2000, 0) | → Read card_xref [SUCCESS] (seq:<uuid>), → Read card_xref [FAIL] (seq:<uuid>) | responseKey: ra_customers, endpoint: <uuid> |
| Read card_xref | DATA_SOURCE | 6ae859df3695c563ea51a963 | <uuid> | (2500, 0) | → Read cards [SUCCESS] (seq:<uuid>), → Read cards [FAIL] (seq:<uuid>) | responseKey: ra_card_xref, endpoint: <uuid> |
| Read cards | DATA_SOURCE | 6ae859e33695c563ea51a964 | <uuid> | (3000, 0) | → Read transactions [SUCCESS] (seq:<uuid>), → Read transactions [FAIL] (seq:<uuid>) | responseKey: ra_cards, endpoint: <uuid> |
| Read transactions | DATA_SOURCE | 6ae859e63695c563ea51a965 | <uuid> | (3500, 0) | → Plan dependent reads [SUCCESS] (seq:<uuid>), → Plan dependent reads [FAIL] (seq:<uuid>) | responseKey: ra_transactions, endpoint: <uuid> |
| Plan dependent reads | SCRIPT | 6ae859ea3695c563ea51a966 | <uuid> | (4000, 0) | → Read accounts 2 (seq:<uuid>) | lang: JAVASCRIPT |
| Read accounts 2 | DATA_SOURCE | 6ae859ed3695c563ea51a967 | <uuid> | (4500, 0) | → Read customers 2 [SUCCESS] (seq:<uuid>), → Read customers 2 [FAIL] (seq:<uuid>) | responseKey: rb_accounts, endpoint: <uuid> |
| Read customers 2 | DATA_SOURCE | 6ae859f13695c563ea51a968 | <uuid> | (5000, 0) | → Read transactions 2 [SUCCESS] (seq:<uuid>), → Read transactions 2 [FAIL] (seq:<uuid>) | responseKey: rb_customers, endpoint: <uuid> |
| Read transactions 2 | DATA_SOURCE | 6ae859f43695c563ea51a969 | <uuid> | (5500, 0) | → Apply screen rules [SUCCESS] (seq:<uuid>), → Apply screen rules [FAIL] (seq:<uuid>) | responseKey: rb_transactions, endpoint: <uuid> |
| Apply screen rules | SCRIPT | 6ae859f83695c563ea51a96a | <uuid> | (6000, 0) | → Write users update (seq:<uuid>) | lang: JAVASCRIPT |
| Write users update | DATA_SOURCE | 6ae859fb3695c563ea51a96b | <uuid> | (6500, 0) | → Write users delete [SUCCESS] (seq:<uuid>), → Write users delete [FAIL] (seq:<uuid>) | responseKey: wr_users_upd, endpoint: <uuid> |
| Write users delete | DATA_SOURCE | 6ae859ff3695c563ea51a96c | <uuid> | (7000, 0) | → Write accounts update [SUCCESS] (seq:<uuid>), → Write accounts update [FAIL] (seq:<uuid>) | responseKey: wr_users_del, endpoint: <uuid> |
| Write accounts update | DATA_SOURCE | 6ae85a023695c563ea51a96d | <uuid> | (7500, 0) | → Write customers update [SUCCESS] (seq:<uuid>), → Write customers update [FAIL] (seq:<uuid>) | responseKey: wr_accounts_upd, endpoint: <uuid> |
| Write customers update | DATA_SOURCE | 6ae85a063695c563ea51a96e | <uuid> | (8000, 0) | → Write cards update [SUCCESS] (seq:<uuid>), → Write cards update [FAIL] (seq:<uuid>) | responseKey: wr_customers_upd, endpoint: <uuid> |
| Write cards update | DATA_SOURCE | 6ae85a0a3695c563ea51a96f | <uuid> | (8500, 0) | → Which insert [SUCCESS] (seq:<uuid>), → Which insert [FAIL] (seq:<uuid>) | responseKey: wr_cards_upd, endpoint: <uuid> |
| Which insert | FORK | 6ae85a0f3695c563ea51a970 | <uuid> | (9000, 0) | → Insert user [cond:<uuid>] (seq:<uuid>), → Insert transaction [cond:<uuid>] (seq:<uuid>), → Insert job request [cond:<uuid>] (seq:<uuid>), → Finalize view model [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Insert user | DATA_SOURCE | 6ae85a173695c563ea51a971 | <uuid> | (9500, -300) | → Finalize view model [SUCCESS] (seq:<uuid>), → Finalize view model [FAIL] (seq:<uuid>) | responseKey: wr_ins, endpoint: <uuid> |
| Insert transaction | DATA_SOURCE | 6ae85a183695c563ea51a972 | <uuid> | (9500, -100) | → Finalize view model [SUCCESS] (seq:<uuid>), → Finalize view model [FAIL] (seq:<uuid>) | responseKey: wr_ins, endpoint: <uuid> |
| Insert job request | DATA_SOURCE | 6ae85a1a3695c563ea51a973 | <uuid> | (9500, 100) | → Finalize view model [SUCCESS] (seq:<uuid>), → Finalize view model [FAIL] (seq:<uuid>) | responseKey: wr_ins, endpoint: <uuid> |
| Finalize view model | SCRIPT | 6ae85a1b3695c563ea51a974 | <uuid> | (10000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae85a1c3695c563ea51a975 | <uuid> | (10500, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read users, Write users update, Write users delete, Insert user
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read accounts, Read accounts 2, Write accounts update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read customers, Read customers 2, Write customers update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read card_xref
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read cards, Write cards update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read transactions, Read transactions 2, Insert transaction
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Insert job request

## Scripts

### Plan reads (SCRIPT, id=6ae859d13695c563ea51a95f)

```javascript
// Plan reads: validate key inputs and decide the first round of store reads.
var t = input.type || '';
var op = input.op || '';
var p = {}; var src = input.params || {}; for (var key in src) p[key] = src[key];
var sel = input.sel || null;
if (op === 'init' && sel) {
  op = 'load';
  if (sel.acct_id !== undefined && sel.acct_id !== null) p.acctId = String(sel.acct_id);
  if (sel.card_num) p.cardNum = String(sel.card_num);
  if (sel.tran_id) p.tranId = String(sel.tran_id);
  if (sel.usr_id) p.userId = String(sel.usr_id);
}
var NONE = { "_id": { "$exists": false } };
function q(pre, store, f, s, l, k) { output[pre + store + '_f'] = f || NONE; output[pre + store + '_s'] = s || {}; output[pre + store + '_l'] = l || 1; output[pre + store + '_k'] = k || 0; }
['users', 'accounts', 'customers', 'card_xref', 'cards', 'transactions'].forEach(function (s) { q('qa_', s); });
function tr(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function isNum(v) { return /^[0-9]+$/.test(v); }
function pad(s, n) { s = String(s); while (s.length < n) s = '0' + s; return s; }
function lastTran() { q('qa_', 'transactions', { "tran_id": { "$exists": true } }, { "tran_id": -1 }, 1, 0); }
function move(p) {
  if (op === 'prev') { if (!p.pageNum || p.pageNum <= 1) return { dir: 'same', msg: 'You are already at the top of the page...' }; return { dir: 'prev' }; }
  if (op === 'next') { if (!p.hasNext) return { dir: 'same', msg: 'You are already at the bottom of the page...' }; return { dir: 'next' }; }
  return { dir: 'first' };
}
function pageQ(store, key, base, start, pg, firstKey, lastKey, size) {
  var cond = {}, s = {};
  if (pg.dir === 'next' && lastKey) { cond[key] = { "$gt": lastKey }; s[key] = 1; }
  else if (pg.dir === 'prev' && firstKey) { cond[key] = { "$lt": firstKey }; s[key] = -1; }
  else if (pg.dir === 'same' && firstKey) { cond[key] = { "$gte": firstKey }; s[key] = 1; }
  else { cond[key] = start ? { "$gte": start } : { "$exists": true }; s[key] = 1; }
  var f = Object.keys(base).length ? { "$and": [base, cond] } : cond;
  q('qa_', store, f, s, size + 1, 0);
}
function acctKey(v) {
  if (!v) return 'Account number not provided';
  if (!isNum(v) || v.length !== 11 || Number(v) === 0) return 'Account number must be a non zero 11 digit number';
  return null;
}
var plan = { err: null, op: op, p: p };

if (op === 'init' || op === 'clear') {
  // blank screen; lists still show their first page
  if (op === 'init' && (t === 'card_list' || t === 'tran_list' || t === 'user_list')) {
    plan.pg = { dir: 'first' };
    if (t === 'card_list') pageQ('cards', 'card_num', {}, '', plan.pg, null, null, 7);
    if (t === 'tran_list') pageQ('transactions', 'tran_id', {}, '', plan.pg, null, null, 10);
    if (t === 'user_list') pageQ('users', 'usr_id', {}, '', plan.pg, null, null, 10);
  }
}
else if (t === 'signon') {
  var uid = tr(p.userId), pw = tr(p.password);
  if (op === 'exit') { }
  else if (!uid) plan.err = 'Please enter User ID ...';
  else if (!pw) plan.err = 'Please enter Password ...';
  else q('qa_', 'users', { "usr_id": { "$in": [uid.toUpperCase(), uid] } }, { "usr_id": 1 }, 2, 0);
}
else if (t === 'acct_view' || (t === 'acct_update' && op === 'load')) {
  var a = tr(p.acctId);
  plan.err = acctKey(a);
  if (!plan.err) { q('qa_', 'card_xref', { "acct_id": Number(a) }, { "card_num": 1 }, 1, 0); q('qa_', 'accounts', { "acct_id": Number(a) }); }
}
else if (t === 'acct_update' && op === 'save') {
  var sn = p.snap || {};
  if (!sn.acct || !sn.cust) plan.err = 'Account number not provided';
  else { q('qa_', 'accounts', { "acct_id": sn.acct.acct_id }); q('qa_', 'customers', { "cust_id": sn.cust.cust_id }); }
}
else if (t === 'card_list') {
  var ac = tr(p.acctId), cn = tr(p.cardNum);
  if (ac && (!isNum(ac) || ac.length !== 11)) plan.err = 'Account number must be a 11 digit number';
  else if (cn && (!isNum(cn) || cn.length !== 16)) plan.err = 'Card number if supplied must be a 16 digit number';
  else {
    var base = {};
    if (ac) base.acct_id = Number(ac);
    if (cn) base.card_num = cn;
    plan.pg = move(p);
    pageQ('cards', 'card_num', base, '', plan.pg, p.firstKey, p.lastKey, 7);
  }
}
else if (t === 'card_view' || (t === 'card_update' && op === 'load')) {
  var ac2 = tr(p.acctId), cn2 = tr(p.cardNum);
  if (!ac2 && !cn2) plan.err = 'No input received';
  else if (!ac2) plan.err = 'Account number not provided';
  else if (!isNum(ac2) || ac2.length !== 11 || Number(ac2) === 0) plan.err = 'Account number must be a non zero 11 digit number';
  else if (!cn2) plan.err = 'Card number not provided';
  else if (!isNum(cn2) || cn2.length !== 16) plan.err = 'Card number if supplied must be a 16 digit number';
  else q('qa_', 'cards', { "card_num": cn2, "acct_id": Number(ac2) });
}
else if (t === 'card_update' && op === 'save') {
  if (!p.snap || !p.snap.card_num) plan.err = 'No input received';
  else q('qa_', 'cards', { "card_num": p.snap.card_num });
}
else if (t === 'tran_list') {
  var st = tr(p.startTranId);
  if (st && !isNum(st)) plan.err = 'Tran ID must be Numeric ...';
  else { plan.pg = move(p); pageQ('transactions', 'tran_id', {}, st ? pad(st, 16) : '', plan.pg, p.firstKey, p.lastKey, 10); }
}
else if (t === 'tran_view') {
  var ti = tr(p.tranId);
  if (!ti) plan.err = 'Tran ID can NOT be empty...';
  else q('qa_', 'transactions', { "tran_id": { "$in": [ti, isNum(ti) ? pad(ti, 16) : ti] } }, { "tran_id": 1 }, 1, 0);
}
else if (t === 'tran_add' && (op === 'add' || op === 'copy')) {
  var ta = tr(p.acctId), tc = tr(p.cardNum);
  if (ta) {
    if (!isNum(ta)) plan.err = 'Account ID must be Numeric...';
    else { q('qa_', 'card_xref', { "acct_id": Number(ta) }, { "card_num": 1 }, 1, 0); plan.keyBy = 'acct'; }
  } else if (tc) {
    if (!isNum(tc)) plan.err = 'Card Number must be Numeric...';
    else { q('qa_', 'card_xref', { "card_num": tc }); plan.keyBy = 'card'; }
  } else plan.err = 'Account or Card Number must be entered...';
  if (!plan.err && op === 'add') lastTran();
}
else if (t === 'bill_pay') {
  var ba = tr(p.acctId);
  if (!ba) plan.err = 'Acct ID can NOT be empty...';
  else if (!isNum(ba)) plan.err = 'Account ID NOT found...';
  else { q('qa_', 'accounts', { "acct_id": Number(ba) }); q('qa_', 'card_xref', { "acct_id": Number(ba) }, { "card_num": 1 }, 1, 0); lastTran(); }
}
else if (t === 'user_list') {
  plan.pg = move(p);
  pageQ('users', 'usr_id', {}, tr(p.startUserId), plan.pg, p.firstKey, p.lastKey, 10);
}
else if (t === 'user_add' && op === 'add') {
  if (!tr(p.firstName)) plan.err = 'First Name can NOT be empty...';
  else if (!tr(p.lastName)) plan.err = 'Last Name can NOT be empty...';
  else if (!tr(p.userId)) plan.err = 'User ID can NOT be empty...';
  else if (!tr(p.password)) plan.err = 'Password can NOT be empty...';
  else if (!tr(p.userType)) plan.err = 'User Type can NOT be empty...';
  else q('qa_', 'users', { "usr_id": tr(p.userId) });
}
else if (t === 'user_update' || t === 'user_delete') {
  var uu = tr(p.userId);
  if (!uu) plan.err = 'User ID can NOT be empty...';
  else q('qa_', 'users', { "usr_id": uu });
}
output.plan = plan;
```

### Plan dependent reads (SCRIPT, id=6ae859ea3695c563ea51a966)

```javascript
// Plan dependent reads: reads that need a key found in the first round.
// The qb_* keys are first written here (not in Plan reads): FlowX deep-merges object outputs into existing state.
var t = input.type || '';
var plan = input.plan || {};
var op = plan.op || '';
var NONE = { "_id": { "$exists": false } };
function rows(k) { var r = input[k]; return r && r.data ? r.data : []; }
function q(pre, store, f, s, l, k) { output[pre + store + '_f'] = f || NONE; output[pre + store + '_s'] = s || {}; output[pre + store + '_l'] = l || 1; output[pre + store + '_k'] = k || 0; }
q('qb_', 'accounts'); q('qb_', 'customers'); q('qb_', 'transactions');
if (!plan.err) {
  var x = rows('ra_card_xref')[0];
  if ((t === 'acct_view' || (t === 'acct_update' && op === 'load')) && x) {
    q('qb_', 'customers', { "cust_id": x.cust_id });
  }
  if (t === 'tran_add' && op === 'copy' && x) {
    q('qb_', 'transactions', { "card_num": x.card_num }, { "tran_id": -1 }, 1, 0);
  }
}
```

### Apply screen rules (SCRIPT, id=6ae859f83695c563ea51a96a)

```javascript
// Apply screen rules: build the screen view model and decide the writes.
var t = input.type || '';
var plan = input.plan || {};
var op = plan.op || input.op || '';
var p = plan.p || input.params || {};
var ses = input.session || {};
var cfg = (typeof additionalData !== 'undefined' && additionalData.applicationConfiguration) ? additionalData.applicationConfiguration : {};
var RT = String(cfg.RUN_TIMESTAMP || '2022-07-18 10:00:00');
var RUN_DATE = RT.substring(0, 10);
var RT26 = (RT + '.000000').substring(0, 26);
var NONE = { "_id": { "$exists": false } }, NOOP = { "$unset": { "__noop": "" } };
output.w_users_upd_f = NONE; output.w_users_upd_u = NOOP; output.w_users_del_f = NONE;
output.w_accounts_upd_f = NONE; output.w_accounts_upd_u = NOOP;
output.w_customers_upd_f = NONE; output.w_customers_upd_u = NOOP;
output.w_cards_upd_f = NONE; output.w_cards_upd_u = NOOP;
output.ins_target = 'none'; output.w_ins_doc = {};
var checks = [];
var vm = {};
if (input.selKey) vm[input.selKey] = null;

function tr(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function isNum(v) { return /^[0-9]+$/.test(v); }
function pad(s, n) { s = String(s); while (s.length < n) s = '0' + s; return s; }
function rows(k) { var r = input[k]; return r && r.data ? r.data : []; }
function failed(k) { return input[k] === undefined || input[k] === null; }
function r2(n) { return Math.round(Number(n) * 100) / 100; }
function money(n) {
  if (n === null || n === undefined || n === '') return '';
  var v = r2(n), neg = v < 0; var s = Math.abs(v).toFixed(2).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + '$' + s[0] + '.' + s[1];
}
function amtStr(n) { return n === null || n === undefined || n === '' ? '' : r2(n).toFixed(2); }
function dim(y, m) { return [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var y = +s.substr(0, 4), m = +s.substr(5, 2), d = +s.substr(8, 2);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  return d <= dim(y, m);
}
function mmddyy(ts) { var s = tr(ts); if (s.length < 10) return s; return s.substr(5, 2) + '/' + s.substr(8, 2) + '/' + s.substr(2, 2); }
function incId(s) {
  var d = tr(s).replace(/\D/g, ''); if (!d) d = '0';
  var a = d.split(''), i = a.length - 1;
  while (i >= 0) { if (a[i] === '9') { a[i] = '0'; i--; } else { a[i] = String(+a[i] + 1); break; } }
  if (i < 0) a.unshift('1');
  return pad(a.join(''), 16);
}
function ssnMask(n) { if (n === null || n === undefined || n === '') return ''; var s = pad(String(n), 9); return '***-**-' + s.substr(5, 4); }
function ssnFmt(n) { if (n === null || n === undefined || n === '') return ''; var s = pad(String(n), 9); return s.substr(0, 3) + '-' + s.substr(3, 2) + '-' + s.substr(5, 4); }
function same(a, b, fields) { for (var i = 0; i < fields.length; i++) { var k = fields[i]; if (tr(a[k]) !== tr(b[k])) return false; } return true; }
function listResult(rs, pg, size, prevNum, mapRow, keyName) {
  var more = rs.length > size; var r = rs.slice(0, size);
  if (pg.dir === 'prev') r.reverse();
  var num = pg.dir === 'first' ? 1 : pg.dir === 'next' ? (prevNum || 1) + 1 : pg.dir === 'prev' ? Math.max(1, (prevNum || 2) - 1) : (prevNum || 1);
  return { rows: r.map(mapRow), pageNum: num, hasNext: pg.dir === 'prev' ? true : more,
    firstKey: r.length ? r[0][keyName] : null, lastKey: r.length ? r[r.length - 1][keyName] : null };
}
var ACCT_FIELDS = ['acct_id', 'active_status', 'curr_bal', 'credit_limit', 'cash_credit_limit', 'open_date', 'expiration_date', 'reissue_date', 'curr_cyc_credit', 'curr_cyc_debit', 'addr_zip', 'group_id'];
var CUST_FIELDS = ['cust_id', 'first_name', 'middle_name', 'last_name', 'addr_line_1', 'addr_line_2', 'addr_line_3', 'addr_state_cd', 'addr_country_cd', 'addr_zip', 'phone_num_1', 'phone_num_2', 'ssn', 'govt_issued_id', 'dob', 'eft_account_id', 'pri_card_holder_ind', 'fico_credit_score'];
var CARD_FIELDS = ['card_num', 'acct_id', 'cvv_cd', 'embossed_name', 'expiration_date', 'active_status'];
var STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI'.split(' ');

// ---------------- signon ----------------
if (t === 'signon') {
  var sg = { userId: tr(p.userId), password: '', msg: null, info: null };
  var sess = null;
  if (op === 'exit') { sg.userId = ''; sg.info = 'Thank you for using CardDemo application...'; }
  else if (plan.err) sg.msg = plan.err;
  else if (failed('ra_users')) sg.msg = 'Unable to verify the User ...';
  else {
    var urs = rows('ra_users'), up = tr(p.userId).toUpperCase();
    var u = urs.filter(function (r) { return r.usr_id === up; })[0] || urs[0];
    var pw = tr(p.password);
    if (!u) sg.msg = 'User not found. Try again ...';
    else if (tr(u.pwd) !== pw && tr(u.pwd) !== pw.toUpperCase()) sg.msg = 'Wrong Password. Try again ...';
    else { sess = { userId: u.usr_id, userType: tr(u.usr_type) === 'A' ? 'A' : 'U', firstName: tr(u.first_name), lastName: tr(u.last_name) }; sg.userId = ''; }
  }
  vm.sg = sg; vm.session = sess;
}
else if (t === 'signoff') {
  vm.session = null; vm.sg = { userId: '', password: '', msg: null, info: 'Thank you for using CardDemo application...' };
}

// ---------------- account view ----------------
function acctDisp(a) {
  return { acct_id: pad(a.acct_id, 11), active_status: tr(a.active_status), curr_bal: money(a.curr_bal), credit_limit: money(a.credit_limit),
    cash_credit_limit: money(a.cash_credit_limit), open_date: tr(a.open_date), expiration_date: tr(a.expiration_date), reissue_date: tr(a.reissue_date),
    curr_cyc_credit: money(a.curr_cyc_credit), curr_cyc_debit: money(a.curr_cyc_debit), group_id: tr(a.group_id) };
}
function custDisp(c) {
  return { cust_id: pad(c.cust_id, 9), ssn: ssnMask(c.ssn), dob: tr(c.dob), fico: c.fico_credit_score === null || c.fico_credit_score === undefined ? '' : String(c.fico_credit_score),
    first_name: tr(c.first_name), middle_name: tr(c.middle_name), last_name: tr(c.last_name), addr_line_1: tr(c.addr_line_1), addr_line_2: tr(c.addr_line_2),
    addr_line_3: tr(c.addr_line_3), addr_state_cd: tr(c.addr_state_cd), addr_zip: tr(c.addr_zip), addr_country_cd: tr(c.addr_country_cd),
    phone_num_1: tr(c.phone_num_1), phone_num_2: tr(c.phone_num_2), govt_issued_id: tr(c.govt_issued_id), eft_account_id: tr(c.eft_account_id),
    pri_card_holder_ind: tr(c.pri_card_holder_ind) };
}
function lookupAcct() {
  var r = { msg: null };
  if (plan.err) { r.msg = plan.err; return r; }
  if (failed('ra_card_xref') || failed('ra_accounts')) { r.msg = 'Unable to read the account. Please try again'; return r; }
  r.x = rows('ra_card_xref')[0]; r.a = rows('ra_accounts')[0]; r.c = rows('rb_customers')[0];
  if (!r.x) r.msg = 'Did not find this account in account card xref file';
  else if (!r.a) r.msg = 'Did not find this account in account master file';
  else if (!r.c) r.msg = 'Did not find associated customer in master file';
  return r;
}
if (t === 'acct_view') {
  var av = { acctId: tr(p.acctId), found: false, acct: null, cust: null, msg: null };
  if (op === 'init' || op === 'clear') { av.acctId = ''; }
  else { var lk = lookupAcct(); if (lk.msg) av.msg = lk.msg; else { av.found = true; av.acct = acctDisp(lk.a); av.cust = custDisp(lk.c); } }
  vm.av = av;
}

// ---------------- account update ----------------
function fFrom(a, c) {
  return { active_status: tr(a.active_status), open_date: tr(a.open_date), credit_limit: amtStr(a.credit_limit), expiration_date: tr(a.expiration_date),
    cash_credit_limit: amtStr(a.cash_credit_limit), reissue_date: tr(a.reissue_date), curr_bal: amtStr(a.curr_bal), curr_cyc_credit: amtStr(a.curr_cyc_credit),
    curr_cyc_debit: amtStr(a.curr_cyc_debit), group_id: tr(a.group_id), ssn: ssnFmt(c.ssn), dob: tr(c.dob),
    fico_credit_score: c.fico_credit_score === null || c.fico_credit_score === undefined ? '' : String(c.fico_credit_score),
    first_name: tr(c.first_name), middle_name: tr(c.middle_name), last_name: tr(c.last_name), addr_line_1: tr(c.addr_line_1), addr_line_2: tr(c.addr_line_2),
    addr_line_3: tr(c.addr_line_3), addr_state_cd: tr(c.addr_state_cd), addr_zip: tr(c.addr_zip), addr_country_cd: tr(c.addr_country_cd),
    phone_num_1: tr(c.phone_num_1), phone_num_2: tr(c.phone_num_2), govt_issued_id: tr(c.govt_issued_id), eft_account_id: tr(c.eft_account_id),
    pri_card_holder_ind: tr(c.pri_card_holder_ind) };
}
function valAcct(f) {
  var e = null;
  function yn(v, l) { if (e) return; var s = tr(v).toUpperCase(); if (!s) e = l + ' must be supplied.'; else if (s !== 'Y' && s !== 'N') e = l + ' must be Y or N.'; }
  function dt(v, l) { if (e) return; var s = tr(v); if (!s) e = l + ' must be supplied.'; else if (!validDate(s)) e = l + ' is not a valid date (YYYY-MM-DD).'; }
  function am(v, l) { if (e) return; var s = tr(v).replace(/[$,]/g, ''); if (!s) e = l + ' must be supplied.'; else if (!/^[+-]?\d{1,10}(\.\d{1,2})?$/.test(s)) e = l + ' is not valid.'; }
  function al(v, l, req) { if (e) return; var s = tr(v); if (!s) { if (req) e = l + ' must be supplied.'; return; } if (!/^[A-Za-z ]+$/.test(s)) e = l + ' can have alphabets only.'; }
  function rq(v, l) { if (!e && !tr(v)) e = l + ' must be supplied.'; }
  function ph(v, l) { if (e) return; var s = tr(v); if (!s) return; if (!/^\(\d{3}\)\d{3}-\d{4}$/.test(s)) e = l + ' must be in format (999)999-9999'; else if (s.substr(1, 3) === '000') e = l + ': Area code cannot be zero'; else if (s.substr(5, 3) === '000') e = l + ': Prefix code cannot be zero'; else if (s.substr(9, 4) === '0000') e = l + ': Line number cannot be zero'; }
  yn(f.active_status, 'Account Status');
  dt(f.open_date, 'Open Date');
  am(f.credit_limit, 'Credit Limit');
  dt(f.expiration_date, 'Expiry Date');
  am(f.cash_credit_limit, 'Cash Credit Limit');
  dt(f.reissue_date, 'Reissue Date');
  am(f.curr_bal, 'Current Balance');
  am(f.curr_cyc_credit, 'Current Cycle Credit');
  am(f.curr_cyc_debit, 'Current Cycle Debit');
  if (!e) {
    var s = tr(f.ssn).replace(/-/g, '');
    if (!s) e = 'SSN must be supplied.';
    else if (!/^\d{9}$/.test(s)) e = 'SSN must be a 9 digit number.';
    else { var p1 = +s.substr(0, 3), p2 = +s.substr(3, 2), p3 = +s.substr(5, 4);
      if (p1 === 0 || p1 === 666 || p1 >= 900) e = 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999';
      else if (p2 === 0) e = 'SSN: 4th & 5th chars: should not be zero';
      else if (p3 === 0) e = 'SSN: Last 4 chars: should not be zero'; }
  }
  dt(f.dob, 'Date of Birth');
  if (!e && tr(f.dob) > RUN_DATE) e = 'Date of Birth: cannot be in the future';
  if (!e) { var fi = tr(f.fico_credit_score); if (!fi) e = 'FICO Score must be supplied.'; else if (!/^\d{1,3}$/.test(fi) || +fi < 300 || +fi > 850) e = 'FICO Score: should be between 300 and 850'; }
  al(f.first_name, 'First Name', true); al(f.middle_name, 'Middle Name', false); al(f.last_name, 'Last Name', true);
  rq(f.addr_line_1, 'Address Line 1');
  if (!e) { var stc = tr(f.addr_state_cd).toUpperCase(); if (!stc) e = 'State must be supplied.'; else if (STATES.indexOf(stc) < 0) e = 'State: Invalid State Code'; }
  if (!e) { var z = tr(f.addr_zip); if (!z) e = 'Zip must be supplied.'; else if (!/^\d{5}$/.test(z)) e = 'Zip must be a 5 digit number.'; }
  rq(f.addr_line_3, 'City');
  if (!e) { var co = tr(f.addr_country_cd); if (!co) e = 'Country must be supplied.'; else if (!/^[A-Za-z]{3}$/.test(co)) e = 'Country must be a 3 letter code.'; }
  ph(f.phone_num_1, 'Phone Number 1'); ph(f.phone_num_2, 'Phone Number 2');
  if (!e) { var ef = tr(f.eft_account_id); if (!ef) e = 'EFT Account Id must be supplied.'; else if (!/^\d{10}$/.test(ef)) e = 'EFT Account Id must be a 10 digit number.'; }
  yn(f.pri_card_holder_ind, 'Primary Card Holder');
  return e;
}
function num(v) { return r2(tr(v).replace(/[$,]/g, '')); }
function newAcct(f) { return { active_status: tr(f.active_status).toUpperCase(), open_date: tr(f.open_date), credit_limit: num(f.credit_limit), expiration_date: tr(f.expiration_date),
  cash_credit_limit: num(f.cash_credit_limit), reissue_date: tr(f.reissue_date), curr_bal: num(f.curr_bal), curr_cyc_credit: num(f.curr_cyc_credit),
  curr_cyc_debit: num(f.curr_cyc_debit), group_id: tr(f.group_id) }; }
function newCust(f) { return { first_name: tr(f.first_name), middle_name: tr(f.middle_name), last_name: tr(f.last_name), ssn: Number(tr(f.ssn).replace(/-/g, '')),
  dob: tr(f.dob), fico_credit_score: Number(tr(f.fico_credit_score)), addr_line_1: tr(f.addr_line_1), addr_line_2: tr(f.addr_line_2), addr_line_3: tr(f.addr_line_3),
  addr_state_cd: tr(f.addr_state_cd).toUpperCase(), addr_zip: tr(f.addr_zip), addr_country_cd: tr(f.addr_country_cd).toUpperCase(), phone_num_1: tr(f.phone_num_1),
  phone_num_2: tr(f.phone_num_2), govt_issued_id: tr(f.govt_issued_id), eft_account_id: tr(f.eft_account_id), pri_card_holder_ind: tr(f.pri_card_holder_ind).toUpperCase() }; }
function diff(nv, old) {
  var d = {}, n = 0;
  for (var k in nv) { var a = nv[k], b = old[k];
    if (typeof a === 'number') { if (b === null || b === undefined || b === '' || r2(b) !== a) { d[k] = a; n++; } }
    else if (tr(a) !== tr(b)) { d[k] = a; n++; } }
  return n ? d : null;
}
if (t === 'acct_update') {
  var au = { acctId: tr(p.acctId), mode: p.mode || 'search', f: p.f || null, snap: p.snap || null, msg: null, info: null, acctDisp: p.acctDisp || null };
  if (op === 'init' || op === 'clear') { au = { acctId: '', mode: 'search', f: null, snap: null, msg: null, info: null, acctDisp: null }; }
  else if (op === 'load') {
    var lk2 = lookupAcct();
    au.mode = 'search'; au.f = null; au.snap = null; au.acctDisp = null;
    if (lk2.msg) au.msg = lk2.msg;
    else { au.mode = 'edit'; au.f = fFrom(lk2.a, lk2.c); au.snap = { acct: lk2.a, cust: lk2.c }; au.acctDisp = { acct_id: pad(lk2.a.acct_id, 11), cust_id: pad(lk2.c.cust_id, 9) }; }
  }
  else if (op === 'cancel') {
    if (au.snap) { au.f = fFrom(au.snap.acct, au.snap.cust); au.mode = 'edit'; }
  }
  else if (op === 'validate' || op === 'save') {
    var f = au.f || {};
    var e1 = au.snap ? valAcct(f) : 'Account number not provided';
    if (e1) { au.msg = e1; au.mode = au.snap ? 'edit' : 'search'; }
    else {
      var da = diff(newAcct(f), au.snap.acct), dc = diff(newCust(f), au.snap.cust);
      if (!da && !dc) { au.msg = 'No change detected with respect to values fetched.'; au.mode = 'edit'; }
      else if (op === 'validate') { au.mode = 'review'; au.info = 'Changes validated.Press F5 to save'; }
      else {
        var fa = rows('ra_accounts')[0], fc = rows('ra_customers')[0];
        if (failed('ra_accounts') || failed('ra_customers') || !fa || !fc) { au.msg = 'Update of record failed'; au.mode = 'edit'; }
        else if (!same(fa, au.snap.acct, ACCT_FIELDS) || !same(fc, au.snap.cust, CUST_FIELDS)) {
          au.msg = 'Record changed by some one else. Please review'; au.mode = 'edit';
          au.snap = { acct: fa, cust: fc }; au.f = fFrom(fa, fc);
        } else {
          if (da) { output.w_accounts_upd_f = { "acct_id": fa.acct_id }; output.w_accounts_upd_u = { "$set": da }; checks.push({ key: 'wr_accounts_upd', kind: 'upd', screen: 'au', msg: 'Update of record failed', mode: 'edit' }); }
          if (dc) { output.w_customers_upd_f = { "cust_id": fc.cust_id }; output.w_customers_upd_u = { "$set": dc }; checks.push({ key: 'wr_customers_upd', kind: 'upd', screen: 'au', msg: 'Update of record failed', mode: 'edit' }); }
          var na = {}, nc = {}, k2;
          for (k2 in fa) na[k2] = fa[k2]; for (k2 in (da || {})) na[k2] = da[k2];
          for (k2 in fc) nc[k2] = fc[k2]; for (k2 in (dc || {})) nc[k2] = dc[k2];
          au.snap = { acct: na, cust: nc }; au.f = fFrom(na, nc);
          au.mode = 'done'; au.info = 'Changes committed to database';
        }
      }
    }
  }
  vm.au = au;
}

// ---------------- card list / view / update ----------------
if (t === 'card_list') {
  var cl = { acctId: tr(p.acctId), cardNum: tr(p.cardNum), rows: p.rows || [], pageNum: p.pageNum || 0, hasNext: !!p.hasNext, firstKey: p.firstKey || null, lastKey: p.lastKey || null, msg: null };
  if (op === 'init' || op === 'clear') { cl = { acctId: '', cardNum: '', rows: [], pageNum: 0, hasNext: false, firstKey: null, lastKey: null, msg: null }; }
  if (op === 'init' || (op !== 'clear' && !plan.err)) {
    if (plan.pg) {
      var lr = listResult(rows('ra_cards'), plan.pg, 7, p.pageNum, function (r) { return { acct_id: pad(r.acct_id, 11), card_num: tr(r.card_num), active_status: tr(r.active_status) }; }, 'card_num');
      cl.rows = lr.rows; cl.pageNum = lr.pageNum; cl.hasNext = lr.hasNext; cl.firstKey = lr.firstKey; cl.lastKey = lr.lastKey;
      if (plan.pg.msg) cl.msg = plan.pg.msg;
      else if (!lr.rows.length) cl.msg = 'Did not find cards for this search condition';
    }
  } else if (plan.err) { cl.msg = plan.err; }
  vm.cl = cl;
}
function expParts(d) { var s = tr(d); return { m: s.length >= 7 ? s.substr(5, 2) : '', y: s.length >= 4 ? s.substr(0, 4) : '', d: s.length >= 10 ? s.substr(8, 2) : '01' }; }
if (t === 'card_view') {
  var cv = { acctId: tr(p.acctId), cardNum: tr(p.cardNum), found: false, card: null, msg: null };
  if (op === 'init' || op === 'clear') { cv.acctId = ''; cv.cardNum = ''; }
  else if (plan.err) cv.msg = plan.err;
  else { var cd = rows('ra_cards')[0];
    if (!cd) cv.msg = 'Did not find cards for this search condition';
    else { var ep = expParts(cd.expiration_date); cv.found = true; cv.card = { embossed_name: tr(cd.embossed_name), active_status: tr(cd.active_status), expiry: ep.m + '/' + ep.y, exp_month: ep.m, exp_year: ep.y }; } }
  vm.cv = cv;
}
function valCard(f) {
  var n = tr(f.embossed_name);
  if (!n) return 'Card name not provided';
  if (!/^[A-Za-z ]+$/.test(n) || n.length > 50) return 'Card name can only contain alphabets and spaces';
  var s = tr(f.active_status).toUpperCase();
  if (s !== 'Y' && s !== 'N') return 'Card Active Status must be Y or N';
  var m = tr(f.exp_month);
  if (!/^\d{1,2}$/.test(m) || +m < 1 || +m > 12) return 'Card expiry month must be between 1 and 12';
  var y = tr(f.exp_year);
  if (!/^\d{4}$/.test(y) || +y < 1950 || +y > 2099) return 'Invalid card expiry year';
  return null;
}
if (t === 'card_update') {
  var cu = { acctId: tr(p.acctId), cardNum: tr(p.cardNum), mode: p.mode || 'search', f: p.f || null, snap: p.snap || null, msg: null, info: null };
  if (op === 'init' || op === 'clear') cu = { acctId: '', cardNum: '', mode: 'search', f: null, snap: null, msg: null, info: null };
  else if (op === 'load') {
    cu.mode = 'search'; cu.f = null; cu.snap = null;
    if (plan.err) cu.msg = plan.err;
    else { var cd2 = rows('ra_cards')[0];
      if (!cd2) cu.msg = 'Did not find cards for this search condition';
      else { var ep2 = expParts(cd2.expiration_date); cu.mode = 'edit'; cu.snap = cd2; cu.f = { embossed_name: tr(cd2.embossed_name), active_status: tr(cd2.active_status), exp_month: ep2.m, exp_year: ep2.y }; } }
  }
  else if (op === 'cancel') { if (cu.snap) { var ep3 = expParts(cu.snap.expiration_date); cu.f = { embossed_name: tr(cu.snap.embossed_name), active_status: tr(cu.snap.active_status), exp_month: ep3.m, exp_year: ep3.y }; cu.mode = 'edit'; } }
  else if (op === 'validate' || op === 'save') {
    var cf = cu.f || {};
    var ce = cu.snap ? valCard(cf) : 'No input received';
    if (ce) { cu.msg = ce; cu.mode = cu.snap ? 'edit' : 'search'; }
    else {
      var oe = expParts(cu.snap.expiration_date);
      var nName = tr(cf.embossed_name).toUpperCase(), nStat = tr(cf.active_status).toUpperCase();
      var nExp = pad(tr(cf.exp_year), 4) + '-' + pad(tr(cf.exp_month), 2) + '-' + oe.d;
      if (nName === tr(cu.snap.embossed_name).toUpperCase() && nStat === tr(cu.snap.active_status).toUpperCase() && nExp === tr(cu.snap.expiration_date)) { cu.msg = 'No change detected with respect to values fetched.'; cu.mode = 'edit'; }
      else if (op === 'validate') { cu.mode = 'review'; cu.info = 'Changes validated. Press F5 to save'; }
      else {
        var fcd = rows('ra_cards')[0];
        if (failed('ra_cards') || !fcd) { cu.msg = 'Changes unsuccessful. Please try again'; cu.mode = 'edit'; }
        else if (!same(fcd, cu.snap, CARD_FIELDS)) {
          var ep4 = expParts(fcd.expiration_date);
          cu.msg = 'Record changed by some one else. Please review'; cu.mode = 'edit'; cu.snap = fcd;
          cu.f = { embossed_name: tr(fcd.embossed_name), active_status: tr(fcd.active_status), exp_month: ep4.m, exp_year: ep4.y };
        } else {
          var cset = { embossed_name: nName, active_status: nStat, expiration_date: nExp };
          output.w_cards_upd_f = { "card_num": fcd.card_num }; output.w_cards_upd_u = { "$set": cset };
          checks.push({ key: 'wr_cards_upd', kind: 'upd', screen: 'cu', msg: 'Changes unsuccessful. Please try again', mode: 'edit' });
          var ns = {}; for (var k3 in fcd) ns[k3] = fcd[k3]; ns.embossed_name = nName; ns.active_status = nStat; ns.expiration_date = nExp;
          cu.snap = ns; cu.f = { embossed_name: nName, active_status: nStat, exp_month: pad(tr(cf.exp_month), 2), exp_year: tr(cf.exp_year) };
          cu.mode = 'done'; cu.info = 'Changes committed to database';
        }
      }
    }
  }
  vm.cu = cu;
}

// ---------------- transactions ----------------
if (t === 'tran_list') {
  var tl = { startTranId: tr(p.startTranId), rows: p.rows || [], pageNum: p.pageNum || 0, hasNext: !!p.hasNext, firstKey: p.firstKey || null, lastKey: p.lastKey || null, msg: null };
  if (op === 'init' || op === 'clear') tl = { startTranId: '', rows: [], pageNum: 0, hasNext: false, firstKey: null, lastKey: null, msg: null };
  if (plan.err) tl.msg = plan.err;
  else if (plan.pg) {
    var lr2 = listResult(rows('ra_transactions'), plan.pg, 10, p.pageNum, function (r) { return { tran_id: tr(r.tran_id), date: mmddyy(r.orig_ts), desc: tr(r.desc), amount: money(r.amt) }; }, 'tran_id');
    tl.rows = lr2.rows; tl.pageNum = lr2.pageNum; tl.hasNext = lr2.hasNext; tl.firstKey = lr2.firstKey; tl.lastKey = lr2.lastKey;
    if (plan.pg.msg) tl.msg = plan.pg.msg;
  }
  vm.tl = tl;
}
if (t === 'tran_view') {
  var tv = { tranId: tr(p.tranId), found: false, t: null, msg: null };
  if (op === 'init' || op === 'clear') tv.tranId = '';
  else if (plan.err) tv.msg = plan.err;
  else if (failed('ra_transactions')) tv.msg = 'Unable to lookup Transaction...';
  else { var tx = rows('ra_transactions')[0];
    if (!tx) tv.msg = 'Transaction ID NOT found...';
    else { tv.found = true; tv.tranId = tr(tx.tran_id);
      tv.t = { tran_id: tr(tx.tran_id), card_num: tr(tx.card_num), type_cd: tr(tx.type_cd), cat_cd: pad(tx.cat_cd, 4), source: tr(tx.source), desc: tr(tx.desc),
        amount: money(tx.amt), orig_ts: tr(tx.orig_ts), proc_ts: tr(tx.proc_ts), merchant_id: tx.merchant_id === null || tx.merchant_id === undefined ? '' : String(tx.merchant_id),
        merchant_name: tr(tx.merchant_name), merchant_city: tr(tx.merchant_city), merchant_zip: tr(tx.merchant_zip) }; } }
  vm.tv = tv;
}
function blankTa() { return { acctId: '', cardNum: '', typeCd: '', catCd: '', source: '', desc: '', amount: '', origDate: '', procDate: '', merchantId: '', merchantName: '', merchantCity: '', merchantZip: '', confirm: '', msg: null, info: null }; }
function amt12(n) { var v = r2(n); var s = Math.abs(v).toFixed(2).split('.'); return (v < 0 ? '-' : '+') + pad(s[0], 8) + '.' + s[1]; }
if (t === 'tran_add') {
  var ta = blankTa();
  if (op !== 'init' && op !== 'clear') { for (var k4 in ta) if (p[k4] !== undefined && p[k4] !== null) ta[k4] = String(p[k4]); ta.msg = null; ta.info = null; }
  if (op === 'add' || op === 'copy') {
    var x = rows('ra_card_xref')[0];
    if (plan.err) ta.msg = plan.err;
    else if (!x) ta.msg = plan.keyBy === 'acct' ? 'Account ID NOT found...' : 'Card Number NOT found...';
    else {
      ta.acctId = pad(x.acct_id, 11); ta.cardNum = tr(x.card_num);
      if (op === 'copy') {
        var lt = rows('rb_transactions')[0];
        if (!lt) ta.msg = 'No previous transaction found for this card...';
        else { ta.typeCd = tr(lt.type_cd); ta.catCd = pad(lt.cat_cd, 4); ta.source = tr(lt.source); ta.desc = tr(lt.desc); ta.amount = amt12(lt.amt);
          ta.origDate = tr(lt.orig_ts).substring(0, 10); ta.procDate = tr(lt.proc_ts).substring(0, 10); ta.merchantId = String(lt.merchant_id);
          ta.merchantName = tr(lt.merchant_name); ta.merchantCity = tr(lt.merchant_city); ta.merchantZip = tr(lt.merchant_zip); }
      } else {
        var e2 = null, v = function (k) { return tr(ta[k]); };
        var req = [['typeCd', 'Type CD'], ['catCd', 'Category CD'], ['source', 'Source'], ['desc', 'Description'], ['amount', 'Amount'], ['origDate', 'Orig Date'],
          ['procDate', 'Proc Date'], ['merchantId', 'Merchant ID'], ['merchantName', 'Merchant Name'], ['merchantCity', 'Merchant City'], ['merchantZip', 'Merchant Zip']];
        for (var i = 0; i < req.length && !e2; i++) if (!v(req[i][0])) e2 = req[i][1] + ' can NOT be empty...';
        if (!e2 && !isNum(v('typeCd'))) e2 = 'Type CD must be Numeric...';
        if (!e2 && !isNum(v('catCd'))) e2 = 'Category CD must be Numeric...';
        if (!e2 && !/^[+-]\d{8}\.\d{2}$/.test(v('amount'))) e2 = 'Amount should be in format -99999999.99';
        if (!e2 && !/^\d{4}-\d{2}-\d{2}$/.test(v('origDate'))) e2 = 'Orig Date should be in format YYYY-MM-DD';
        if (!e2 && !/^\d{4}-\d{2}-\d{2}$/.test(v('procDate'))) e2 = 'Proc Date should be in format YYYY-MM-DD';
        if (!e2 && !isNum(v('merchantId'))) e2 = 'Merchant ID must be Numeric...';
        if (!e2 && !validDate(v('origDate'))) e2 = 'Orig Date - Not a valid date...';
        if (!e2 && !validDate(v('procDate'))) e2 = 'Proc Date - Not a valid date...';
        var cfm = v('confirm');
        if (!e2) { if (cfm === '' || cfm.toUpperCase() === 'N') e2 = 'Confirm to add this transaction...'; else if (cfm.toUpperCase() !== 'Y') e2 = 'Invalid value. Valid values are (Y/N)...'; }
        if (e2) ta.msg = e2;
        else {
          var last = rows('ra_transactions')[0];
          var nid = incId(last ? last.tran_id : '0');
          output.ins_target = 'transactions';
          output.w_ins_doc = { tran_id: nid, type_cd: pad(v('typeCd'), 2), cat_cd: Number(v('catCd')), source: v('source'), desc: v('desc'), amt: r2(v('amount')),
            merchant_id: Number(v('merchantId')), merchant_name: v('merchantName'), merchant_city: v('merchantCity'), merchant_zip: v('merchantZip'),
            card_num: tr(x.card_num), orig_ts: v('origDate') + ' 00:00:00.000000', proc_ts: v('procDate') + ' 00:00:00.000000' };
          checks.push({ key: 'wr_ins', kind: 'ins', screen: 'ta', msg: 'Unable to Add Transaction...' });
          ta = blankTa(); ta.info = 'Transaction added successfully. Your Tran ID is ' + nid + '.';
        }
      }
    }
  }
  vm.ta = ta;
}

// ---------------- bill payment ----------------
if (t === 'bill_pay') {
  var bp = { acctId: tr(p.acctId), balance: '', confirm: tr(p.confirm), msg: null, info: null };
  if (op === 'init' || op === 'clear') bp = { acctId: '', balance: '', confirm: '', msg: null, info: null };
  else if (plan.err) bp.msg = plan.err;
  else {
    var c3 = bp.confirm.toUpperCase();
    if (c3 === 'N') bp = { acctId: '', balance: '', confirm: '', msg: null, info: null };
    else if (c3 !== '' && c3 !== 'Y') bp.msg = 'Invalid value. Valid values are (Y/N)...';
    else {
      var ba = rows('ra_accounts')[0];
      if (!ba) bp.msg = 'Account ID NOT found...';
      else {
        var bal = r2(ba.curr_bal);
        bp.balance = money(bal);
        if (bal <= 0) bp.msg = 'You have nothing to pay...';
        else if (c3 !== 'Y') bp.msg = 'Confirm to make a bill payment...';
        else {
          var bx = rows('ra_card_xref')[0];
          if (!bx) bp.msg = 'Account ID NOT found...';
          else {
            var bl = rows('ra_transactions')[0], bid = incId(bl ? bl.tran_id : '0');
            output.ins_target = 'transactions';
            output.w_ins_doc = { tran_id: bid, type_cd: '02', cat_cd: 2, source: 'POS TERM', desc: 'BILL PAYMENT - ONLINE', amt: bal, merchant_id: 999999999,
              merchant_name: 'BILL PAYMENT', merchant_city: 'N/A', merchant_zip: 'N/A', card_num: tr(bx.card_num), orig_ts: RT26, proc_ts: RT26 };
            output.w_accounts_upd_f = { "acct_id": ba.acct_id }; output.w_accounts_upd_u = { "$set": { curr_bal: r2(bal - bal) } };
            checks.push({ key: 'wr_ins', kind: 'ins', screen: 'bp', msg: 'Unable to Add Bill pay Transaction...' });
            checks.push({ key: 'wr_accounts_upd', kind: 'upd', screen: 'bp', msg: 'Unable to Update Account...' });
            bp.balance = money(0); bp.confirm = ''; bp.info = 'Payment successful. Your Transaction ID is ' + bid + '.';
          }
        }
      }
    }
  }
  vm.bp = bp;
}

// ---------------- report request ----------------
function blankRr() { return { reportType: '', sm: '', sd: '', sy: '', em: '', ed: '', ey: '', confirm: '', msg: null, info: null }; }
if (t === 'report') {
  var rr = blankRr();
  if (op !== 'init' && op !== 'clear') { for (var k5 in rr) if (p[k5] !== undefined && p[k5] !== null) rr[k5] = String(p[k5]); rr.msg = null; rr.info = null; }
  if (op === 'submit') {
    var rt = tr(rr.reportType).toLowerCase(), name = null, sdt = null, edt = null, e3 = null;
    var y0 = +RUN_DATE.substr(0, 4), m0 = +RUN_DATE.substr(5, 2);
    if (rt === 'monthly') { name = 'Monthly'; sdt = RUN_DATE.substr(0, 8) + '01'; edt = RUN_DATE.substr(0, 8) + pad(dim(y0, m0), 2); }
    else if (rt === 'yearly') { name = 'Yearly'; sdt = y0 + '-01-01'; edt = y0 + '-12-31'; }
    else if (rt === 'custom') {
      name = 'Custom';
      var parts = [['sm', 'Start Date - Month'], ['sd', 'Start Date - Day'], ['sy', 'Start Date - Year'], ['em', 'End Date - Month'], ['ed', 'End Date - Day'], ['ey', 'End Date - Year']];
      for (var j = 0; j < parts.length && !e3; j++) if (!tr(rr[parts[j][0]])) e3 = parts[j][1] + ' can NOT be empty...';
      function chk(pre, mk, dk, yk) {
        if (e3) return;
        var m = tr(rr[mk]), d = tr(rr[dk]), y = tr(rr[yk]);
        if (!isNum(m) || +m < 1 || +m > 12) e3 = pre + ' - Not a valid Month...';
        else if (!isNum(d) || +d < 1 || +d > 31) e3 = pre + ' - Not a valid Day...';
        else if (!/^\d{4}$/.test(y)) e3 = pre + ' - Not a valid Year...';
      }
      chk('Start Date', 'sm', 'sd', 'sy'); chk('End Date', 'em', 'ed', 'ey');
      if (!e3) { sdt = tr(rr.sy) + '-' + pad(tr(rr.sm), 2) + '-' + pad(tr(rr.sd), 2); edt = tr(rr.ey) + '-' + pad(tr(rr.em), 2) + '-' + pad(tr(rr.ed), 2);
        if (!validDate(sdt)) e3 = 'Start Date - Not a valid date...'; else if (!validDate(edt)) e3 = 'End Date - Not a valid date...'; }
    }
    else e3 = 'Select a report type to print report...';
    if (!e3) {
      var c4 = tr(rr.confirm).toUpperCase();
      if (c4 === '') e3 = 'Please confirm to print the ' + name + ' report...';
      else if (c4 === 'N') { rr = blankRr(); }
      else if (c4 !== 'Y') e3 = 'Invalid value. Valid values are (Y/N)...';
      else {
        output.ins_target = 'job_requests';
        output.w_ins_doc = { start_date: sdt, end_date: edt, report_type: name, requested_by: tr(ses.userId), requested_ts: RT, status: 'SUBMITTED' };
        checks.push({ key: 'wr_ins', kind: 'ins', screen: 'rr', msg: 'Unable to submit the report request...' });
        rr = blankRr(); rr.info = name + ' report submitted for printing ...';
      }
    }
    if (e3) rr.msg = e3;
  }
  vm.rr = rr;
}

// ---------------- users ----------------
if (t === 'user_list') {
  var ul = { startUserId: tr(p.startUserId), rows: p.rows || [], pageNum: p.pageNum || 0, hasNext: !!p.hasNext, firstKey: p.firstKey || null, lastKey: p.lastKey || null, msg: null };
  if (op === 'clear') ul = { startUserId: '', rows: [], pageNum: 0, hasNext: false, firstKey: null, lastKey: null, msg: null };
  if (op === 'init') ul.startUserId = '';
  if (plan.pg) {
    var lr3 = listResult(rows('ra_users'), plan.pg, 10, p.pageNum, function (r) { return { usr_id: tr(r.usr_id), first_name: tr(r.first_name), last_name: tr(r.last_name), usr_type: tr(r.usr_type) }; }, 'usr_id');
    ul.rows = lr3.rows; ul.pageNum = lr3.pageNum; ul.hasNext = lr3.hasNext; ul.firstKey = lr3.firstKey; ul.lastKey = lr3.lastKey;
    if (plan.pg.msg) ul.msg = plan.pg.msg;
  }
  vm.ul = ul;
}
function blankUa() { return { firstName: '', lastName: '', userId: '', password: '', userType: '', msg: null, info: null }; }
if (t === 'user_add') {
  var ua = blankUa();
  if (op === 'add') {
    for (var k6 in ua) if (p[k6] !== undefined && p[k6] !== null) ua[k6] = String(p[k6]); ua.msg = null; ua.info = null;
    if (plan.err) ua.msg = plan.err;
    else if (failed('ra_users')) ua.msg = 'Unable to Add User...';
    else if (rows('ra_users').length) ua.msg = 'User ID already exist...';
    else {
      var nid2 = tr(ua.userId);
      output.ins_target = 'users';
      output.w_ins_doc = { usr_id: nid2, first_name: tr(ua.firstName), last_name: tr(ua.lastName), pwd: tr(ua.password), usr_type: tr(ua.userType).toUpperCase() };
      checks.push({ key: 'wr_ins', kind: 'ins', screen: 'ua', msg: 'Unable to Add User...' });
      ua = blankUa(); ua.info = 'User ' + nid2 + ' has been added ...';
    }
  }
  vm.ua = ua;
}
function blankUu() { return { userId: '', firstName: '', lastName: '', password: '', userType: '', mode: 'search', msg: null, info: null }; }
if (t === 'user_update' || t === 'user_delete') {
  var scr = t === 'user_update' ? 'uu' : 'ud';
  var uv = blankUu();
  if (op !== 'init' && op !== 'clear') { for (var k7 in uv) if (p[k7] !== undefined && p[k7] !== null) uv[k7] = String(p[k7]); uv.msg = null; uv.info = null; }
  if (op === 'load' || op === 'save' || op === 'delete') {
    var uf = rows('ra_users')[0];
    if (plan.err) uv.msg = plan.err;
    else if (failed('ra_users')) uv.msg = 'Unable to lookup User...';
    else if (!uf) { uv.msg = 'User ID NOT found...'; uv.mode = 'search'; }
    else if (op === 'load') { uv.userId = tr(uf.usr_id); uv.firstName = tr(uf.first_name); uv.lastName = tr(uf.last_name); uv.password = tr(uf.pwd); uv.userType = tr(uf.usr_type); uv.mode = 'edit'; }
    else if (op === 'save') {
      var e4 = null;
      if (!tr(uv.firstName)) e4 = 'First Name can NOT be empty...';
      else if (!tr(uv.lastName)) e4 = 'Last Name can NOT be empty...';
      else if (!tr(uv.password)) e4 = 'Password can NOT be empty...';
      else if (!tr(uv.userType)) e4 = 'User Type can NOT be empty...';
      if (e4) uv.msg = e4;
      else {
        var us = {}, nchg = 0;
        if (tr(uv.firstName) !== tr(uf.first_name)) { us.first_name = tr(uv.firstName); nchg++; }
        if (tr(uv.lastName) !== tr(uf.last_name)) { us.last_name = tr(uv.lastName); nchg++; }
        if (tr(uv.password) !== tr(uf.pwd)) { us.pwd = tr(uv.password); nchg++; }
        if (tr(uv.userType).toUpperCase() !== tr(uf.usr_type)) { us.usr_type = tr(uv.userType).toUpperCase(); nchg++; }
        if (!nchg) uv.msg = 'Please modify to update ...';
        else {
          output.w_users_upd_f = { "usr_id": uf.usr_id }; output.w_users_upd_u = { "$set": us };
          checks.push({ key: 'wr_users_upd', kind: 'upd', screen: scr, msg: 'Unable to Update User...' });
          uv.info = 'User ' + tr(uf.usr_id) + ' has been updated ...';
        }
      }
    }
    else if (op === 'delete') {
      output.w_users_del_f = { "usr_id": uf.usr_id };
      checks.push({ key: 'wr_users_del', kind: 'del', screen: scr, msg: 'Unable to Delete User...' });
      var did = tr(uf.usr_id);
      uv = blankUu(); uv.info = 'User ' + did + ' has been deleted ...';
    }
  }
  vm[scr] = uv;
}
output.vm = vm;
output.checks = checks;
```

### Which insert (FORK, id=6ae85a0f3695c563ea51a970)
  0. [IF] input.ins_target === 'users'  (id: <uuid>)
  1. [ELSE_IF] input.ins_target === 'transactions'  (id: <uuid>)
  2. [ELSE_IF] input.ins_target === 'job_requests'  (id: <uuid>)
  3. [ELSE] true  (id: <uuid>)

### Finalize view model (SCRIPT, id=6ae85a1b3695c563ea51a974)

```javascript
// Finalize: verify every write the rules asked for; on failure, replace the success text with the failure message.
var vm = input.vm || {};
var checks = input.checks || [];
var failedScreens = {};
for (var i = 0; i < checks.length; i++) {
  var c = checks[i], r = input[c.key], ok = false;
  if (r && r.data) {
    if (c.kind === 'upd') ok = Number(r.data.matchedCount) === 1;
    else if (c.kind === 'del') ok = Number(r.data.deletedCount) === 1;
    else if (c.kind === 'ins') ok = !!r.data;
  }
  if (!ok && !failedScreens[c.screen]) {
    failedScreens[c.screen] = true;
    var s = vm[c.screen] || {};
    s.msg = c.msg; s.info = null;
    if (c.mode) s.mode = c.mode;
    vm[c.screen] = s;
  }
}
output.vm = vm;
```

## Data source bindings

### Read users (DATA_SOURCE, id=6ae859d43695c563ea51a960)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** ra_users
- **variables:**
  - filter [DB operation param] <uuid> ← `${qa_users_f}`
  - sort [DB operation param] <uuid> ← `${qa_users_s}`
  - limit [DB operation param] <uuid> ← `${qa_users_l}`
  - skip [DB operation param] <uuid> ← `${qa_users_k}`

### Read accounts (DATA_SOURCE, id=6ae859d83695c563ea51a961)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** ra_accounts
- **variables:**
  - filter [DB operation param] <uuid> ← `${qa_accounts_f}`
  - sort [DB operation param] <uuid> ← `${qa_accounts_s}`
  - limit [DB operation param] <uuid> ← `${qa_accounts_l}`
  - skip [DB operation param] <uuid> ← `${qa_accounts_k}`

### Read customers (DATA_SOURCE, id=6ae859dc3695c563ea51a962)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** ra_customers
- **variables:**
  - filter [DB operation param] <uuid> ← `${qa_customers_f}`
  - sort [DB operation param] <uuid> ← `${qa_customers_s}`
  - limit [DB operation param] <uuid> ← `${qa_customers_l}`
  - skip [DB operation param] <uuid> ← `${qa_customers_k}`

### Read card_xref (DATA_SOURCE, id=6ae859df3695c563ea51a963)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** ra_card_xref
- **variables:**
  - filter [DB operation param] <uuid> ← `${qa_card_xref_f}`
  - sort [DB operation param] <uuid> ← `${qa_card_xref_s}`
  - limit [DB operation param] <uuid> ← `${qa_card_xref_l}`
  - skip [DB operation param] <uuid> ← `${qa_card_xref_k}`

### Read cards (DATA_SOURCE, id=6ae859e33695c563ea51a964)
- **system:** NOSQL_DB — cards (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** ra_cards
- **variables:**
  - filter [DB operation param] <uuid> ← `${qa_cards_f}`
  - sort [DB operation param] <uuid> ← `${qa_cards_s}`
  - limit [DB operation param] <uuid> ← `${qa_cards_l}`
  - skip [DB operation param] <uuid> ← `${qa_cards_k}`

### Read transactions (DATA_SOURCE, id=6ae859e63695c563ea51a965)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** ra_transactions
- **variables:**
  - filter [DB operation param] <uuid> ← `${qa_transactions_f}`
  - sort [DB operation param] <uuid> ← `${qa_transactions_s}`
  - limit [DB operation param] <uuid> ← `${qa_transactions_l}`
  - skip [DB operation param] <uuid> ← `${qa_transactions_k}`

### Read accounts 2 (DATA_SOURCE, id=6ae859ed3695c563ea51a967)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** rb_accounts
- **variables:**
  - filter [DB operation param] <uuid> ← `${qb_accounts_f}`
  - sort [DB operation param] <uuid> ← `${qb_accounts_s}`
  - limit [DB operation param] <uuid> ← `${qb_accounts_l}`
  - skip [DB operation param] <uuid> ← `${qb_accounts_k}`

### Read customers 2 (DATA_SOURCE, id=6ae859f13695c563ea51a968)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** rb_customers
- **variables:**
  - filter [DB operation param] <uuid> ← `${qb_customers_f}`
  - sort [DB operation param] <uuid> ← `${qb_customers_s}`
  - limit [DB operation param] <uuid> ← `${qb_customers_l}`
  - skip [DB operation param] <uuid> ← `${qb_customers_k}`

### Read transactions 2 (DATA_SOURCE, id=6ae859f43695c563ea51a969)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** rb_transactions
- **variables:**
  - filter [DB operation param] <uuid> ← `${qb_transactions_f}`
  - sort [DB operation param] <uuid> ← `${qb_transactions_s}`
  - limit [DB operation param] <uuid> ← `${qb_transactions_l}`
  - skip [DB operation param] <uuid> ← `${qb_transactions_k}`

### Write users update (DATA_SOURCE, id=6ae859fb3695c563ea51a96b)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** wr_users_upd
- **variables:**
  - filter [DB operation param] <uuid> ← `${w_users_upd_f}`
  - update [DB operation param] <uuid> ← `${w_users_upd_u}`

### Write users delete (DATA_SOURCE, id=6ae859ff3695c563ea51a96c)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** delete — flowxUuid <uuid>
- **responseKey:** wr_users_del
- **variables:**
  - filter [DB operation param] <uuid> ← `${w_users_del_f}`

### Write accounts update (DATA_SOURCE, id=6ae85a023695c563ea51a96d)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** wr_accounts_upd
- **variables:**
  - filter [DB operation param] <uuid> ← `${w_accounts_upd_f}`
  - update [DB operation param] <uuid> ← `${w_accounts_upd_u}`

### Write customers update (DATA_SOURCE, id=6ae85a063695c563ea51a96e)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** wr_customers_upd
- **variables:**
  - filter [DB operation param] <uuid> ← `${w_customers_upd_f}`
  - update [DB operation param] <uuid> ← `${w_customers_upd_u}`

### Write cards update (DATA_SOURCE, id=6ae85a0a3695c563ea51a96f)
- **system:** NOSQL_DB — cards (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** wr_cards_upd
- **variables:**
  - filter [DB operation param] <uuid> ← `${w_cards_upd_f}`
  - update [DB operation param] <uuid> ← `${w_cards_upd_u}`

### Insert user (DATA_SOURCE, id=6ae85a173695c563ea51a971)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** wr_ins
- **variables:**
  - doc [DB operation param] <uuid> ← `${w_ins_doc}`

### Insert transaction (DATA_SOURCE, id=6ae85a183695c563ea51a972)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** wr_ins
- **variables:**
  - doc [DB operation param] <uuid> ← `${w_ins_doc}`

### Insert job request (DATA_SOURCE, id=6ae85a1a3695c563ea51a973)
- **system:** NOSQL_DB — job_requests (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** wr_ins
- **variables:**
  - doc [DB operation param] <uuid> ← `${w_ins_doc}`

_(server: 440 ms, 9 API calls, 411 ms in API)_
