# Workflow: ui_carddemo

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Page dispatcher for the CardDemo UI Flow: every screen action starts it with {screen, action, data, session}; returns the UI state patch.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae873b83695c563ea51ad19 | <uuid> | (0, 0) | → Logic (seq:<uuid>) |
| Logic | SCRIPT | 6ae873bb3695c563ea51ad1a | <uuid> | (500, 0) | → Load op (seq:<uuid>) | lang: JAVASCRIPT |
| Route | FORK | 6ae873be3695c563ea51ad1b | <uuid> | (1500, 0) | → users.find [cond:<uuid>] (seq:<uuid>), → users.insert [cond:<uuid>] (seq:<uuid>), → users.update [cond:<uuid>] (seq:<uuid>), → users.delete [cond:<uuid>] (seq:<uuid>), → accounts.find [cond:<uuid>] (seq:<uuid>), → accounts.update [cond:<uuid>] (seq:<uuid>), → customers.find [cond:<uuid>] (seq:<uuid>), → customers.update [cond:<uuid>] (seq:<uuid>), → card_xref.find [cond:<uuid>] (seq:<uuid>), → cards.find [cond:<uuid>] (seq:<uuid>), → cards.update [cond:<uuid>] (seq:<uuid>), → transactions.find [cond:<uuid>] (seq:<uuid>), → transactions.insert [cond:<uuid>] (seq:<uuid>), → job_requests.insert [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae873c73695c563ea51ad1c | <uuid> | (2500, -300) | — |
| users.find | DATA_SOURCE | 6ae873c93695c563ea51ad1d | <uuid> | (2000, 0) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| users.insert | DATA_SOURCE | 6ae873ca3695c563ea51ad1e | <uuid> | (2000, 200) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| users.update | DATA_SOURCE | 6ae873cc3695c563ea51ad1f | <uuid> | (2000, 400) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| users.delete | DATA_SOURCE | 6ae873cd3695c563ea51ad20 | <uuid> | (2000, 600) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| accounts.find | DATA_SOURCE | 6ae873ce3695c563ea51ad21 | <uuid> | (2000, 800) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| accounts.update | DATA_SOURCE | 6ae873d03695c563ea51ad22 | <uuid> | (2000, 1000) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| customers.find | DATA_SOURCE | 6ae873d13695c563ea51ad23 | <uuid> | (2000, 1200) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| customers.update | DATA_SOURCE | 6ae873d23695c563ea51ad24 | <uuid> | (2000, 1400) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| card_xref.find | DATA_SOURCE | 6ae873d43695c563ea51ad25 | <uuid> | (2000, 1600) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| cards.find | DATA_SOURCE | 6ae873d53695c563ea51ad26 | <uuid> | (2000, 1800) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| cards.update | DATA_SOURCE | 6ae873d73695c563ea51ad27 | <uuid> | (2000, 2000) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| transactions.find | DATA_SOURCE | 6ae873d83695c563ea51ad28 | <uuid> | (2000, 2200) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| transactions.insert | DATA_SOURCE | 6ae873d93695c563ea51ad29 | <uuid> | (2000, 2400) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| job_requests.insert | DATA_SOURCE | 6ae873db3695c563ea51ad2a | <uuid> | (2000, 2600) | → Logic [SUCCESS] (seq:<uuid>), → Logic [FAIL] (seq:<uuid>) | responseKey: dbres, endpoint: <uuid> |
| Load op | SCRIPT | 6ae875d73695c563ea51ae24 | <uuid> | (1000, 0) | → Route (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): users.find, users.insert, users.update, users.delete
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): accounts.find, accounts.update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): customers.find, customers.update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): card_xref.find
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): cards.find, cards.update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): transactions.find, transactions.insert
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): job_requests.insert

## Scripts

### Logic (SCRIPT, id=6ae873bb3695c563ea51ad1a)

```javascript
/* CardDemo UI engine — SCRIPT node "Logic" of workflow ui_carddemo.
 * One replayable dispatcher for every online screen. The screen logic is written as straight-line
 * code calling db(); each db() call that has no recorded result suspends the script: the workflow
 * routes (FORK on input.route) to the matching FlowX Database node, stores its answer under
 * dbres, and loops back here. The logic is replayed from the top with the recorded results until
 * it returns, then the END node hands back ${result}: a patch of UI Flow state.
 * Input (startParams): { screen, action, data: <screen object>, session }.
 */
var RUN_TS = String((typeof additionalData !== 'undefined' && additionalData && additionalData.applicationConfiguration && additionalData.applicationConfiguration.RUN_TIMESTAMP) || '2022-07-18 10:00:00');
var TODAY = RUN_TS.substring(0, 10);
var NOW_TS = TODAY + ' ' + RUN_TS.substring(11, 19) + '.000000';

/* ---------------- replay machinery ---------------- */
var st = input.st ? JSON.parse(JSON.stringify(input.st)) : { results: [] };
if (st.pending) {
  var dr = input.dbres;
  st.results.push(dr && dr.data !== undefined && dr.data !== null ? dr.data : { __dberror: st.pending });
  st.pending = null;
}
var callIdx = 0;
function db(route, args) {
  if (callIdx < st.results.length) {
    var r = st.results[callIdx++];
    if (r && r.__dberror) throw new Error('data store operation ' + r.__dberror + ' failed');
    return r;
  }
  callIdx++;
  var op = { route: route, filter: {}, sort: { _id: 1 }, limit: 200, skip: 0, doc: {}, update: {} };
  for (var k in args) op[k] = args[k];
  st.pending = route;
  throw { __suspend: true, op: op };
}
function find(store, filter, sort, limit, skip) {
  var r = db(store + '.find', { filter: filter || {}, sort: sort || { _id: 1 }, limit: limit || 200, skip: skip || 0 });
  var out = [];
  if (r && r.length !== undefined) for (var i = 0; i < r.length; i++) out.push(clean(r[i]));
  return out;
}
function findOne(store, filter, sort) { var r = find(store, filter, sort, 1, 0); return r.length ? r[0] : null; }
function insert(store, doc) { return db(store + '.insert', { doc: doc }); }
function update(store, filter, set) {
  var r = db(store + '.update', { filter: filter, update: { '$set': set } });
  return r && r.matchedCount !== undefined ? Number(r.matchedCount) : 0;
}
function remove(store, filter) { return db(store + '.delete', { filter: filter }); }

/* ---------------- helpers ---------------- */
function s(v) { return v === null || v === undefined ? '' : String(v); }
function t(v) { return s(v).trim(); }
function up(v) { return t(v).toUpperCase(); }
function lpad(v, n, c) { v = s(v); while (v.length < n) v = (c || '0') + v; return v; }
function isNum(v) { return /^[0-9]+$/.test(v); }
function r2(x) { return Math.round(Number(x) * 100) / 100; }
function amtPlain(x) { return (x === null || x === undefined || x === '') ? '' : Number(x).toFixed(2); }
function money(x) {
  if (x === null || x === undefined || x === '') return '';
  var n = Number(x), p = Math.abs(n).toFixed(2).split('.');
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + '$' + p[0] + '.' + p[1];
}
function legacyAmt(x) { var n = Number(x || 0), p = Math.abs(n).toFixed(2).split('.'); return (n < 0 ? '-' : '+') + lpad(p[0], 8) + '.' + p[1]; }
function leap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function lastDay(y, m) { return [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
function validDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  var y = +d.substr(0, 4), m = +d.substr(5, 2), dd = +d.substr(8, 2);
  if (y < 1900 || y > 2099 || m < 1 || m > 12) return false;
  return dd >= 1 && dd <= lastDay(y, m);
}
function signedAmt(v) { return /^[-+]?\d{1,10}(\.\d{1,2})?$/.test(v); }
function incId(id) { var dg = s(id).replace(/\D/g, ''); return lpad(dg ? (BigInt(dg) + 1n).toString() : '1', 16); }
function clean(d) { var o = {}; if (!d) return o; for (var k in d) if (k !== '_id') o[k] = d[k]; return o; }
function canon(o) { var ks = Object.keys(o || {}).filter(function (k) { return k !== '_id'; }).sort(), r = {}; ks.forEach(function (k) { r[k] = o[k]; }); return JSON.stringify(r); }
function same(a, b) {
  if (typeof a === 'number' || typeof b === 'number') { if (s(a) === '' && s(b) === '') return true; return r2(a) === r2(b); }
  return t(a) === t(b);
}
function and(a, b) { return (!a || !Object.keys(a).length) ? b : { '$and': [a, b] }; }
function tsDate(ts) { var v = s(ts); return v.length >= 10 ? v.substr(5, 2) + '/' + v.substr(8, 2) + '/' + v.substr(2, 2) : ''; }
function acct11(n) { return s(n) === '' ? '' : lpad(s(n), 11); }
var NAME_RE = /^[A-Za-z ]+$/;
var US_STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI AA AE AP'.split(' ');
var TRAN_TYPES = { '01': 'Purchase', '02': 'Payment', '03': 'Credit', '04': 'Authorization', '05': 'Refund', '06': 'Reversal', '07': 'Adjustment' };
var TRAN_CATS = {
  '01-0001': 'Regular Sales Draft', '01-0002': 'Regular Cash Advance', '01-0003': 'Convenience Check Debit', '01-0004': 'ATM Cash Advance', '01-0005': 'Interest Amount',
  '02-0001': 'Cash payment', '02-0002': 'Electronic payment', '02-0003': 'Check payment',
  '03-0001': 'Credit to Account', '03-0002': 'Credit to Purchase balance', '03-0003': 'Credit to Cash balance',
  '04-0001': 'Zero dollar authorization', '04-0002': 'Online purchase authorization', '04-0003': 'Travel booking authorization',
  '05-0001': 'Refund credit', '06-0001': 'Fraud reversal', '06-0002': 'Non-fraud reversal', '07-0001': 'Sales draft credit adjustment'
};

/* ---------------- screen state ---------------- */
var KEY = { SIGNON: 'su', MAIN: 'mm', ADMIN: 'am', AV: 'av', AU: 'au', CL: 'cl', CV: 'cv', CU: 'cu', TL: 'tl', TV: 'tv', TA: 'ta', RP: 'rp', BP: 'bp', UL: 'ul', UA: 'ua', UU: 'uu', UD: 'ud', BYE: 'bye' };
var ADMIN_SCREENS = { ADMIN: 1, UL: 1, UA: 1, UU: 1, UD: 1 };
function obj(keys, extra) { var o = {}; keys.split(' ').forEach(function (k) { o[k] = ''; }); if (extra) for (var k in extra) o[k] = extra[k]; return o; }
function rows(n, cols) { var o = {}; for (var i = 1; i <= n; i++) { o['r' + i] = obj(cols); o['s' + i] = ''; } return o; }
function blank(scr) {
  var b;
  switch (scr) {
    case 'SIGNON': return obj('userId pwd');
    case 'MAIN': case 'ADMIN': return obj('option');
    case 'AV': return obj('acctId loaded status openDate expiryDate reissueDate creditLimit cashCreditLimit currBal cycCredit cycDebit groupId custId ssn dob fico firstName middleName lastName addr1 addr2 addr3 state country zip phone1 phone2 govtId eftId priHolder');
    case 'AU': return obj('acctId mode status openDate expiryDate reissueDate creditLimit cashCreditLimit currBal cycCredit cycDebit groupId custId firstName middleName lastName addr1 addr2 addr3 state country zip phone1 phone2 ssn1 ssn2 ssn3 dob govtId eftId priHolder fico changes origJson', { mode: 'search' });
    case 'CL': b = rows(7, 'acct card status'); return Object.assign(b, obj('acctFilter cardFilter firstKey lastKey more page'), { page: '1' });
    case 'CV': return obj('acctId cardNum name status expiry from');
    case 'CU': return obj('acctId cardNum mode name status expMonth expYear expiry from origJson', { mode: 'search' });
    case 'TL': b = rows(10, 'id date desc amt'); return Object.assign(b, obj('startId firstKey lastKey more page'), { page: '1' });
    case 'TV': return obj('tranId cardNum typeCd typeDesc catCd catDesc source desc amt origTs procTs merchantId merchantName merchantCity merchantZip from');
    case 'TA': return obj('acctId cardNum typeCd catCd source desc amt origDate procDate merchantId merchantName merchantCity merchantZip confirm');
    case 'RP': return obj('type startDate endDate confirm');
    case 'BP': return obj('acctId balance confirm');
    case 'UL': b = rows(10, 'id first last type'); return Object.assign(b, obj('startId firstKey lastKey more page'), { page: '1' });
    case 'UA': return obj('firstName lastName userId pwd userType');
    case 'UU': return obj('userId firstName lastName pwd userType loaded from');
    case 'UD': return obj('userId firstName lastName userType loaded from');
    default: return {};
  }
}
function merge(scr, d) { var b = blank(scr); if (d) for (var k in b) if (d[k] !== undefined && d[k] !== null) b[k] = (typeof b[k] === 'string' && typeof d[k] !== 'object') ? s(d[k]) : d[k]; return b; }
function with_(scr, d, vals) { var b = merge(scr, d); for (var k in vals) b[k] = vals[k]; return b; }
function emptySession() { return { userId: '', userType: '', firstName: '', lastName: '' }; }
function go(scr, o, msg, type, extra) {
  var p = { screen: scr, msg: msg || '', msgType: msg ? (type || 'error') : '' };
  p[KEY[scr]] = o || blank(scr);
  if (extra) for (var k in extra) p[k] = extra[k];
  return p;
}
function show(scr, msg, type) { return { screen: scr, msg: msg || '', msgType: msg ? (type || 'error') : '' }; }
function initAll() {
  var p = { screen: 'SIGNON', msg: '', msgType: '', session: emptySession(), runDate: TODAY };
  for (var k in KEY) p[KEY[k]] = blank(k);
  return p;
}
function menuOf(sess) { return sess && sess.userType === 'A' ? 'ADMIN' : 'MAIN'; }

/* ---------------- sign-on and menus ---------------- */
function signon(a, d) {
  if (a === 'exit') return go('BYE', {}, 'Thank you for using CardDemo application...', 'info', { session: emptySession() });
  var uid = up(d.userId), pwd = up(d.pwd), keep = { userId: s(d.userId), pwd: '' };
  if (!uid) return go('SIGNON', keep, 'Please enter User ID ...');
  if (!pwd) return go('SIGNON', keep, 'Please enter Password ...');
  var u = findOne('users', { usr_id: uid });
  if (!u) return go('SIGNON', keep, 'User not found. Try again ...');
  if (s(u.pwd) !== pwd) return go('SIGNON', keep, 'Wrong Password. Try again ...');
  var sess = { userId: s(u.usr_id), userType: s(u.usr_type), firstName: s(u.first_name), lastName: s(u.last_name) };
  return go(s(u.usr_type) === 'A' ? 'ADMIN' : 'MAIN', null, '', '', { session: sess, su: blank('SIGNON') });
}
var MAIN_OPTS = { 1: 'AV', 2: 'AU', 3: 'CL', 4: 'CV', 5: 'CU', 6: 'TL', 7: 'TV', 8: 'TA', 9: 'RP', 10: 'BP' };
var ADMIN_OPTS = { 1: 'UL', 2: 'UA', 3: 'UU', 4: 'UD' };
function menu(scr, a, d) {
  if (a === 'exit') return go('SIGNON', null, '', '', { session: emptySession() });
  var o = t(d.option), opts = scr === 'MAIN' ? MAIN_OPTS : ADMIN_OPTS;
  if (!/^\d{1,2}$/.test(o) || !opts[+o]) return go(scr, { option: s(d.option) }, 'Please enter a valid option number...');
  return open(opts[+o], scr);
}
function open(target, from) {
  if (target === 'CL') return clLoad(blank('CL'), 'first');
  if (target === 'TL') return tlLoad(blank('TL'), 'first');
  if (target === 'UL') return ulLoad(blank('UL'), 'first');
  var b = blank(target); if ('from' in b) b.from = from; return go(target, b, '');
}

/* ---------------- account view / update ---------------- */
function acctIdErr(v) { return (/^\d{11}$/.test(v) && +v !== 0) ? '' : 'Account number must be a non zero 11 digit number'; }
function readAccount(no) {
  var xr = findOne('card_xref', { acct_id: no }, { card_num: 1 });
  if (!xr) return { err: 'Did not find this account in account card xref file' };
  var ac = findOne('accounts', { acct_id: no });
  if (!ac) return { err: 'Did not find this account in account master file' };
  var cu = findOne('customers', { cust_id: xr.cust_id });
  if (!cu) return { err: 'Did not find associated customer in master file' };
  return { xref: xr, acct: ac, cust: cu };
}
function avScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  var id = t(d.acctId);
  if (a === 'update') {
    if (!acctIdErr(id)) return auFetch(id, 'AV');
    return go('AU', null, '');
  }
  var e = acctIdErr(id);
  if (e) return go('AV', with_('AV', {}, { acctId: s(d.acctId) }), e);
  var r = readAccount(+id);
  if (r.err) return go('AV', with_('AV', {}, { acctId: s(d.acctId) }), r.err);
  var ac = r.acct, cu = r.cust, ssn = lpad(s(cu.ssn), 9);
  return go('AV', {
    acctId: id, loaded: 'Y', status: s(ac.active_status), openDate: s(ac.open_date), expiryDate: s(ac.expiration_date), reissueDate: s(ac.reissue_date),
    creditLimit: money(ac.credit_limit), cashCreditLimit: money(ac.cash_credit_limit), currBal: money(ac.curr_bal), cycCredit: money(ac.curr_cyc_credit), cycDebit: money(ac.curr_cyc_debit),
    groupId: s(ac.group_id), custId: lpad(s(cu.cust_id), 9), ssn: s(cu.ssn) === '' ? '' : '***-**-' + ssn.substr(5, 4), dob: s(cu.dob), fico: s(cu.fico_credit_score),
    firstName: s(cu.first_name), middleName: s(cu.middle_name), lastName: s(cu.last_name), addr1: s(cu.addr_line_1), addr2: s(cu.addr_line_2), addr3: s(cu.addr_line_3),
    state: s(cu.addr_state_cd), country: s(cu.addr_country_cd), zip: s(cu.addr_zip), phone1: s(cu.phone_num_1), phone2: s(cu.phone_num_2),
    govtId: s(cu.govt_issued_id), eftId: s(cu.eft_account_id), priHolder: s(cu.pri_card_holder_ind)
  }, '');
}
function auFill(id, ac, cu) {
  var ssn = s(cu.ssn) === '' ? '' : lpad(s(cu.ssn), 9);
  return {
    acctId: id, mode: 'edit', custId: lpad(s(cu.cust_id), 9),
    status: s(ac.active_status), openDate: s(ac.open_date), expiryDate: s(ac.expiration_date), reissueDate: s(ac.reissue_date),
    creditLimit: amtPlain(ac.credit_limit), cashCreditLimit: amtPlain(ac.cash_credit_limit), currBal: amtPlain(ac.curr_bal), cycCredit: amtPlain(ac.curr_cyc_credit), cycDebit: amtPlain(ac.curr_cyc_debit),
    groupId: s(ac.group_id), firstName: s(cu.first_name), middleName: s(cu.middle_name), lastName: s(cu.last_name),
    addr1: s(cu.addr_line_1), addr2: s(cu.addr_line_2), addr3: s(cu.addr_line_3), state: s(cu.addr_state_cd), country: s(cu.addr_country_cd), zip: s(cu.addr_zip),
    phone1: s(cu.phone_num_1), phone2: s(cu.phone_num_2), ssn1: ssn.substr(0, 3), ssn2: ssn.substr(3, 2), ssn3: ssn.substr(5, 4),
    dob: s(cu.dob), govtId: s(cu.govt_issued_id), eftId: s(cu.eft_account_id), priHolder: s(cu.pri_card_holder_ind), fico: s(cu.fico_credit_score),
    changes: '', origJson: JSON.stringify({ acct: ac, cust: cu })
  };
}
function auFetch(id, from) {
  var e = acctIdErr(id);
  if (e) return go('AU', with_('AU', {}, { acctId: id }), e);
  var r = readAccount(+id);
  if (r.err) return go('AU', with_('AU', {}, { acctId: id }), r.err);
  return go('AU', auFill(id, r.acct, r.cust), '');
}
var AU_ACCT = [['status', 'active_status', 'Active Status'], ['openDate', 'open_date', 'Open Date'], ['expiryDate', 'expiration_date', 'Expiry Date'], ['reissueDate', 'reissue_date', 'Reissue Date'],
  ['creditLimit', 'credit_limit', 'Credit Limit'], ['cashCreditLimit', 'cash_credit_limit', 'Cash Credit Limit'], ['currBal', 'curr_bal', 'Current Balance'],
  ['cycCredit', 'curr_cyc_credit', 'Current Cycle Credit'], ['cycDebit', 'curr_cyc_debit', 'Current Cycle Debit'], ['groupId', 'group_id', 'Account Group']];
var AU_CUST = [['firstName', 'first_name', 'First Name'], ['middleName', 'middle_name', 'Middle Name'], ['lastName', 'last_name', 'Last Name'], ['addr1', 'addr_line_1', 'Address Line 1'],
  ['addr2', 'addr_line_2', 'Address Line 2'], ['addr3', 'addr_line_3', 'City'], ['state', 'addr_state_cd', 'State'], ['country', 'addr_country_cd', 'Country'], ['zip', 'addr_zip', 'Zip'],
  ['phone1', 'phone_num_1', 'Phone Number 1'], ['phone2', 'phone_num_2', 'Phone Number 2'], ['ssn', 'ssn', 'SSN'], ['dob', 'dob', 'Date of Birth'], ['govtId', 'govt_issued_id', 'Government Issued Id'],
  ['eftId', 'eft_account_id', 'EFT Account Id'], ['priHolder', 'pri_card_holder_ind', 'Primary Card Holder'], ['fico', 'fico_credit_score', 'FICO Score']];
function auValidate(d) {
  var A = {}, C = {}, v, i, f;
  v = up(d.status); if (v !== 'Y' && v !== 'N') return { err: 'Account Active Status must be Y or N' }; A.active_status = v;
  var dates = [['openDate', 'open_date', 'Open Date'], ['expiryDate', 'expiration_date', 'Expiry Date'], ['reissueDate', 'reissue_date', 'Reissue Date']];
  for (i = 0; i < dates.length; i++) { f = dates[i]; v = t(d[f[0]]); if (!v) return { err: f[2] + ' must be supplied' }; if (!validDate(v)) return { err: f[2] + ' - Not a valid date...' }; A[f[1]] = v; }
  var amts = [['creditLimit', 'credit_limit', 'Credit Limit'], ['cashCreditLimit', 'cash_credit_limit', 'Cash Credit Limit'], ['currBal', 'curr_bal', 'Current Balance'], ['cycCredit', 'curr_cyc_credit', 'Current Cycle Credit'], ['cycDebit', 'curr_cyc_debit', 'Current Cycle Debit']];
  for (i = 0; i < amts.length; i++) { f = amts[i]; v = t(d[f[0]]).replace(/[$,]/g, ''); if (!v) return { err: f[2] + ' must be supplied' }; if (!signedAmt(v)) return { err: f[2] + ' is not valid' }; A[f[1]] = r2(v); }
  A.group_id = t(d.groupId);
  v = t(d.firstName); if (!v) return { err: 'First Name must be supplied' }; if (!NAME_RE.test(v)) return { err: 'First Name can only contain alphabets and spaces' }; C.first_name = v;
  v = t(d.middleName); if (v && !NAME_RE.test(v)) return { err: 'Middle Name can only contain alphabets and spaces' }; C.middle_name = v;
  v = t(d.lastName); if (!v) return { err: 'Last Name must be supplied' }; if (!NAME_RE.test(v)) return { err: 'Last Name can only contain alphabets and spaces' }; C.last_name = v;
  v = t(d.addr1); if (!v) return { err: 'Address Line 1 must be supplied' }; C.addr_line_1 = v;
  C.addr_line_2 = t(d.addr2); C.addr_line_3 = t(d.addr3);
  v = up(d.state); if (!v) return { err: 'State must be supplied' }; if (US_STATES.indexOf(v) < 0) return { err: 'State: Not a valid US state code' }; C.addr_state_cd = v;
  v = up(d.country); if (!v) return { err: 'Country must be supplied' }; C.addr_country_cd = v;
  v = t(d.zip); if (!v) return { err: 'Zip must be supplied' }; if (!/^\d{5}(-?\d{4})?$/.test(v)) return { err: 'Zip code must be a 5 digit number' }; C.addr_zip = v;
  v = t(d.phone1); if (v && !/^\(\d{3}\)\d{3}-\d{4}$/.test(v)) return { err: 'Phone Number 1 must be in format (999)999-9999' }; C.phone_num_1 = v;
  v = t(d.phone2); if (v && !/^\(\d{3}\)\d{3}-\d{4}$/.test(v)) return { err: 'Phone Number 2 must be in format (999)999-9999' }; C.phone_num_2 = v;
  var p1 = t(d.ssn1), p2 = t(d.ssn2), p3 = t(d.ssn3);
  if (!/^\d{3}$/.test(p1) || !/^\d{2}$/.test(p2) || !/^\d{4}$/.test(p3)) return { err: 'SSN must be a 9 digit number (999-99-9999)' };
  if (p1 === '000' || p1 === '666' || +p1 >= 900) return { err: 'SSN: First 3 chars should not be 000, 666, or between 900 and 999' };
  if (p2 === '00') return { err: 'SSN: 4th and 5th chars should not be zero' };
  if (p3 === '0000') return { err: 'SSN: Last 4 chars should not be zero' };
  C.ssn = +(p1 + p2 + p3);
  v = t(d.dob); if (!validDate(v)) return { err: 'Date of Birth - Not a valid date...' }; if (v > TODAY) return { err: 'Date of Birth cannot be in the future' }; C.dob = v;
  C.govt_issued_id = t(d.govtId); C.eft_account_id = t(d.eftId);
  v = up(d.priHolder); if (v !== 'Y' && v !== 'N') return { err: 'Primary Card Holder must be Y or N' }; C.pri_card_holder_ind = v;
  v = t(d.fico); if (!/^\d{1,3}$/.test(v) || +v < 300 || +v > 850) return { err: 'FICO Score: should be between 300 and 850' }; C.fico_credit_score = +v;
  return { acct: A, cust: C };
}
function diff(orig, nv, defs) {
  var set = {}, lines = [];
  for (var i = 0; i < defs.length; i++) {
    var f = defs[i][1]; if (!(f in nv)) continue;
    if (!same(orig[f], nv[f])) { set[f] = nv[f]; lines.push(defs[i][2] + ': ' + s(orig[f]) + ' -> ' + s(nv[f])); }
  }
  return { set: set, lines: lines };
}
function auScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  var id = t(d.acctId);
  if (a === 'fetch' || d.mode === 'search' || !d.origJson) return auFetch(id, 'AU');
  if (a === 'cancel') return auFetch(id, 'AU');
  var orig = JSON.parse(d.origJson);
  var v = auValidate(d);
  if (v.err) return go('AU', with_('AU', d, { mode: 'edit' }), v.err);
  var da = diff(orig.acct, v.acct, AU_ACCT), dc = diff(orig.cust, v.cust, AU_CUST);
  var lines = da.lines.concat(dc.lines);
  if (!lines.length) return go('AU', with_('AU', d, { mode: 'edit', changes: '' }), 'No change detected with respect to values fetched.');
  if (a !== 'save' || d.mode !== 'confirm') return go('AU', with_('AU', d, { mode: 'confirm', changes: lines.join(' | ') }), 'Changes validated.Press F5 to save', 'info');
  var acNow = findOne('accounts', { acct_id: orig.acct.acct_id });
  if (!acNow) return go('AU', with_('AU', d, { mode: 'edit' }), 'Could not lock account record for update');
  var cuNow = findOne('customers', { cust_id: orig.cust.cust_id });
  if (!cuNow) return go('AU', with_('AU', d, { mode: 'edit' }), 'Could not lock customer record for update');
  if (canon(acNow) !== canon(orig.acct) || canon(cuNow) !== canon(orig.cust)) return go('AU', auFill(id, acNow, cuNow), 'Record changed by some one else. Please review');
  if (Object.keys(da.set).length && update('accounts', orig.acct, da.set) < 1) return go('AU', with_('AU', d, { mode: 'edit' }), 'Record changed by some one else. Please review');
  if (Object.keys(dc.set).length && update('customers', orig.cust, dc.set) < 1) return go('AU', with_('AU', d, { mode: 'edit' }), 'Update of record failed');
  var na = Object.assign({}, orig.acct, da.set), nc = Object.assign({}, orig.cust, dc.set);
  return go('AU', auFill(id, na, nc), 'Changes committed to database', 'info');
}

/* ---------------- lists (keyset paging) ---------------- */
function page(store, key, base, mode, d, size) {
  var f, sort = {}, docs, prev = mode === 'prev';
  sort[key] = prev ? -1 : 1;
  var cond = {};
  if (mode === 'next') cond[key] = { '$gt': d.lastKey };
  else if (prev) cond[key] = { '$lt': d.firstKey };
  else if (mode === 'gte' && d.startKey) cond[key] = { '$gte': d.startKey };
  f = Object.keys(cond).length ? and(base, cond) : base;
  docs = find(store, f, sort, prev ? size : size + 1, 0);
  if (prev) docs.reverse();
  return { docs: docs.slice(0, size), more: !prev && docs.length > size };
}
function fillRows(o, n, docs, mapper, key) {
  for (var i = 1; i <= n; i++) { var doc = docs[i - 1]; o['s' + i] = ''; o['r' + i] = doc ? mapper(doc) : mapper(null); }
  if (docs.length) { o.firstKey = s(docs[0][key]); o.lastKey = s(docs[docs.length - 1][key]); }
  return o;
}
function firstSel(d, n) { for (var i = 1; i <= n; i++) { var v = up(d['s' + i]); if (v) return { i: i, v: v }; } return null; }
function selCount(d, n) { var c = 0; for (var i = 1; i <= n; i++) if (t(d['s' + i])) c++; return c; }
/* After a row is acted on, hand the list back with its selection markers cleared, so returning to it does not repeat the action. */
function withList(res, scr, d, n) { var o = merge(scr, d); for (var i = 1; i <= n; i++) o['s' + i] = ''; res[KEY[scr]] = o; return res; }

/* transactions list */
function tlRow(x) { return x ? { id: s(x.tran_id), date: tsDate(x.orig_ts), desc: s(x.desc), amt: legacyAmt(x.amt) } : { id: '', date: '', desc: '', amt: '' }; }
function tlLoad(d, mode) {
  var o = merge('TL', d), pg = +o.page || 1;
  if (mode === 'next' && o.more !== 'Y') return go('TL', o, 'You are already at the bottom of the page...');
  if (mode === 'prev' && pg <= 1) return go('TL', o, 'You are already at the top of the page...');
  var start = t(o.startId);
  var r = page('transactions', 'tran_id', {}, mode === 'first' ? 'gte' : mode, { firstKey: o.firstKey, lastKey: o.lastKey, startKey: start ? lpad(start, 16) : '' }, 10);
  if (!r.docs.length) {
    if (mode === 'next') return go('TL', with_('TL', o, { more: '' }), 'You are already at the bottom of the page...');
    if (mode === 'prev') return go('TL', o, 'You are already at the top of the page...');
  }
  fillRows(o, 10, r.docs, tlRow, 'tran_id');
  o.page = s(mode === 'next' ? pg + 1 : mode === 'prev' ? pg - 1 : 1);
  if (mode !== 'prev') o.more = r.more ? 'Y' : ''; else o.more = 'Y';
  return go('TL', o, '');
}
function tlScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  if (a === 'next' || a === 'prev') return tlLoad(d, a);
  var sel = firstSel(d, 10);
  if (sel) {
    var row = d['r' + sel.i] || {};
    if (sel.v !== 'S') return go('TL', merge('TL', d), 'Invalid selection. Valid value is S');
    if (!t(row.id)) return go('TL', merge('TL', d), 'Invalid selection. Valid value is S');
    return withList(tvRead(t(row.id), 'TL'), 'TL', d, 10);
  }
  var sid = t(d.startId);
  if (sid && !isNum(sid)) return go('TL', merge('TL', d), 'Tran ID must be Numeric ...');
  return tlLoad(d, 'first');
}

/* transaction view */
function tvRead(id, from) {
  if (!id) return go('TV', with_('TV', {}, { from: from }), 'Tran ID can NOT be empty...');
  var key = isNum(id) && id.length < 16 ? lpad(id, 16) : id;
  var x = findOne('transactions', { tran_id: key });
  if (!x) return go('TV', with_('TV', {}, { tranId: id, from: from }), 'Transaction ID NOT found...');
  var ty = s(x.type_cd), ca = lpad(s(x.cat_cd), 4);
  return go('TV', {
    tranId: s(x.tran_id), cardNum: s(x.card_num), typeCd: ty, typeDesc: TRAN_TYPES[ty] || '', catCd: ca, catDesc: TRAN_CATS[ty + '-' + ca] || '',
    source: s(x.source), desc: s(x.desc), amt: legacyAmt(x.amt), origTs: s(x.orig_ts), procTs: s(x.proc_ts),
    merchantId: s(x.merchant_id), merchantName: s(x.merchant_name), merchantCity: s(x.merchant_city), merchantZip: s(x.merchant_zip), from: from
  }, '');
}
function tvScreen(a, d) {
  if (a === 'back') return d.from === 'TL' ? show('TL') : go('MAIN', null, '');
  if (a === 'clear') return go('TV', with_('TV', {}, { from: s(d.from) }), '');
  return tvRead(t(d.tranId), s(d.from));
}

/* transaction add */
function taKeys(d) {
  var acct = t(d.acctId), card = t(d.cardNum), xr;
  if (acct) {
    if (!isNum(acct)) return { err: 'Account ID must be Numeric...' };
    xr = findOne('card_xref', { acct_id: +acct }, { card_num: 1 });
    if (!xr) return { err: 'Account ID NOT found...' };
  } else if (card) {
    if (!isNum(card)) return { err: 'Card Number must be Numeric...' };
    xr = findOne('card_xref', { card_num: card });
    if (!xr) return { err: 'Card Number NOT found...' };
  } else return { err: 'Account or Card Number must be entered...' };
  return { acctId: acct11(xr.acct_id), cardNum: s(xr.card_num) };
}
function taScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  if (a === 'clear') return go('TA', null, '');
  var o = merge('TA', d);
  var k = taKeys(o);
  if (k.err) return go('TA', o, k.err);
  o.acctId = k.acctId; o.cardNum = k.cardNum;
  if (a === 'copy') {
    var lt = find('transactions', { card_num: k.cardNum }, { tran_id: -1 }, 1, 0)[0];
    if (!lt) return go('TA', o, 'No transactions found for this card to copy...');
    Object.assign(o, { typeCd: s(lt.type_cd), catCd: lpad(s(lt.cat_cd), 4), source: s(lt.source), desc: s(lt.desc), amt: legacyAmt(lt.amt),
      origDate: s(lt.orig_ts).substr(0, 10), procDate: s(lt.proc_ts).substr(0, 10), merchantId: s(lt.merchant_id), merchantName: s(lt.merchant_name),
      merchantCity: s(lt.merchant_city), merchantZip: s(lt.merchant_zip) });
    return go('TA', o, '');
  }
  var req = [['typeCd', 'Type CD'], ['catCd', 'Category CD'], ['source', 'Source'], ['desc', 'Description'], ['amt', 'Amount'], ['origDate', 'Orig Date'], ['procDate', 'Proc Date'],
    ['merchantId', 'Merchant ID'], ['merchantName', 'Merchant Name'], ['merchantCity', 'Merchant City'], ['merchantZip', 'Merchant Zip']];
  for (var i = 0; i < req.length; i++) if (!t(o[req[i][0]])) return go('TA', o, req[i][1] + ' can NOT be empty...');
  if (!/^\d{1,2}$/.test(t(o.typeCd))) return go('TA', o, 'Type CD must be Numeric...');
  if (!/^\d{1,4}$/.test(t(o.catCd))) return go('TA', o, 'Category CD must be Numeric...');
  if (!/^[-+]\d{8}\.\d{2}$/.test(t(o.amt))) return go('TA', o, 'Amount should be in format -99999999.99');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t(o.origDate))) return go('TA', o, 'Orig Date should be in format YYYY-MM-DD');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t(o.procDate))) return go('TA', o, 'Proc Date should be in format YYYY-MM-DD');
  if (!validDate(t(o.origDate))) return go('TA', o, 'Orig Date - Not a valid date...');
  if (!validDate(t(o.procDate))) return go('TA', o, 'Proc Date - Not a valid date...');
  if (!isNum(t(o.merchantId))) return go('TA', o, 'Merchant ID must be Numeric...');
  var c = up(o.confirm);
  if (c === '' || c === 'N') return go('TA', o, 'Confirm to add this transaction...');
  if (c !== 'Y') return go('TA', o, 'Invalid value. Valid values are (Y/N)...');
  var last = find('transactions', {}, { tran_id: -1 }, 1, 0)[0];
  var id = incId(last ? last.tran_id : '');
  insert('transactions', {
    tran_id: id, type_cd: lpad(t(o.typeCd), 2), cat_cd: +t(o.catCd), source: t(o.source), desc: t(o.desc), amt: r2(t(o.amt)),
    merchant_id: +t(o.merchantId), merchant_name: t(o.merchantName), merchant_city: t(o.merchantCity), merchant_zip: t(o.merchantZip),
    card_num: k.cardNum, orig_ts: t(o.origDate), proc_ts: t(o.procDate)
  });
  return go('TA', null, 'Transaction added successfully. Your Tran ID is ' + id + '.', 'info');
}

/* card list / view / update */
function clRow(x) { return x ? { acct: acct11(x.acct_id), card: s(x.card_num), status: s(x.active_status) } : { acct: '', card: '', status: '' }; }
function clBase(o) { var f = {}; if (t(o.acctFilter)) f.acct_id = +t(o.acctFilter); if (t(o.cardFilter)) f.card_num = t(o.cardFilter); return f; }
function clLoad(d, mode) {
  var o = merge('CL', d), pg = +o.page || 1;
  if (mode === 'next' && o.more !== 'Y') return go('CL', o, 'No more pages to display');
  if (mode === 'prev' && pg <= 1) return go('CL', o, 'No previous pages to display');
  var r = page('cards', 'card_num', clBase(o), mode === 'first' ? 'first' : mode, o, 7);
  if (!r.docs.length) {
    if (mode === 'next') return go('CL', with_('CL', o, { more: '' }), 'No more pages to display');
    if (mode === 'prev') return go('CL', o, 'No previous pages to display');
    fillRows(o, 7, [], clRow, 'card_num'); o.firstKey = ''; o.lastKey = ''; o.more = ''; o.page = '1';
    return go('CL', o, 'No records found for this search condition.');
  }
  fillRows(o, 7, r.docs, clRow, 'card_num');
  o.page = s(mode === 'next' ? pg + 1 : mode === 'prev' ? pg - 1 : 1);
  o.more = mode === 'prev' ? 'Y' : (r.more ? 'Y' : '');
  return go('CL', o, '');
}
function clScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  var o = merge('CL', d);
  var af = t(o.acctFilter), cf = t(o.cardFilter);
  if (af && !/^\d{11}$/.test(af)) return go('CL', o, 'Account number must be a 11 digit number');
  if (cf && !/^\d{16}$/.test(cf)) return go('CL', o, 'Card number if supplied must be a 16 digit number');
  if (a === 'next' || a === 'prev') return clLoad(o, a);
  if (selCount(o, 7) > 1) return go('CL', o, 'Please select only one record to view or update');
  var sel = firstSel(o, 7);
  if (sel) {
    var row = o['r' + sel.i] || {};
    if ((sel.v !== 'S' && sel.v !== 'U') || !t(row.card)) return go('CL', o, 'Invalid selection. Valid values are S and U');
    return withList(sel.v === 'S' ? cvRead(t(row.acct), t(row.card), 'CL') : cuFetch(t(row.acct), t(row.card), 'CL'), 'CL', o, 7);
  }
  return clLoad(o, 'first');
}
function cardKeyErr(acct, card) {
  if (!acct && !card) return 'No input received';
  if (!acct) return 'Account number not provided';
  if (!(/^\d{11}$/.test(acct) && +acct !== 0)) return 'Account number must be a non zero 11 digit number';
  if (card && !/^\d{16}$/.test(card)) return 'Card number if supplied must be a 16 digit number';
  return '';
}
function readCard(acct, card) { var f = { acct_id: +acct }; if (card) f.card_num = card; return findOne('cards', f, { card_num: 1 }); }
function expiryMY(dte) { var v = s(dte); return v.length >= 7 ? v.substr(5, 2) + '/' + v.substr(0, 4) : ''; }
function cvRead(acct, card, from) {
  var e = cardKeyErr(acct, card);
  if (e) return go('CV', with_('CV', {}, { acctId: acct, cardNum: card, from: from }), e);
  var c = readCard(acct, card);
  if (!c) return go('CV', with_('CV', {}, { acctId: acct, cardNum: card, from: from }), 'Did not find cards for this search condition');
  return go('CV', { acctId: acct11(c.acct_id), cardNum: s(c.card_num), name: s(c.embossed_name), status: s(c.active_status), expiry: expiryMY(c.expiration_date), from: from }, '');
}
function cvScreen(a, d) {
  if (a === 'back') return d.from === 'CL' ? show('CL') : go('MAIN', null, '');
  return cvRead(t(d.acctId), t(d.cardNum), s(d.from));
}
function cuFill(c, from) {
  var e = s(c.expiration_date);
  return { acctId: acct11(c.acct_id), cardNum: s(c.card_num), mode: 'edit', name: s(c.embossed_name), status: s(c.active_status),
    expMonth: e.substr(5, 2), expYear: e.substr(0, 4), expiry: expiryMY(e), from: from || '', origJson: JSON.stringify(c) };
}
function cuFetch(acct, card, from) {
  var e = cardKeyErr(acct, card);
  if (e) return go('CU', with_('CU', {}, { acctId: acct, cardNum: card, from: from }), e);
  var c = readCard(acct, card);
  if (!c) return go('CU', with_('CU', {}, { acctId: acct, cardNum: card, from: from }), 'Did not find cards for this search condition');
  return go('CU', cuFill(c, from), '');
}
function cuScreen(a, d) {
  if (a === 'back') return d.from === 'CL' ? show('CL') : go('MAIN', null, '');
  var o = merge('CU', d);
  if (a === 'fetch' || o.mode === 'search' || !o.origJson || a === 'cancel') return cuFetch(t(o.acctId), t(o.cardNum), o.from);
  var orig = JSON.parse(o.origJson);
  var name = t(o.name);
  if (!name) return go('CU', with_('CU', o, { mode: 'edit' }), 'Card name not provided');
  if (!NAME_RE.test(name)) return go('CU', with_('CU', o, { mode: 'edit' }), 'Card name can only contain alphabets and spaces');
  var stt = up(o.status); if (stt !== 'Y' && stt !== 'N') return go('CU', with_('CU', o, { mode: 'edit' }), 'Card Active Status must be Y or N');
  var mm = t(o.expMonth); if (!/^\d{1,2}$/.test(mm) || +mm < 1 || +mm > 12) return go('CU', with_('CU', o, { mode: 'edit' }), 'Card expiry month must be between 1 and 12');
  var yy = t(o.expYear); if (!/^\d{4}$/.test(yy) || +yy < 1950 || +yy > 2099) return go('CU', with_('CU', o, { mode: 'edit' }), 'Invalid card expiry year');
  var od = s(orig.expiration_date), day = od.length >= 10 ? od.substr(8, 2) : '01';
  var nv = { embossed_name: name, active_status: stt, expiration_date: yy + '-' + lpad(mm, 2) + '-' + day };
  var set = {};
  for (var k in nv) if (!same(orig[k], nv[k])) set[k] = nv[k];
  if (!Object.keys(set).length) return go('CU', with_('CU', o, { mode: 'edit' }), 'No change detected with respect to values fetched.');
  if (a !== 'save' || o.mode !== 'confirm') return go('CU', with_('CU', o, { mode: 'confirm' }), 'Changes validated. Press F5 to save', 'info');
  var now = findOne('cards', { card_num: orig.card_num });
  if (!now) return go('CU', with_('CU', o, { mode: 'edit' }), 'Could not lock record for update');
  if (canon(now) !== canon(orig)) return go('CU', cuFill(now, o.from), 'Record changed by some one else. Please review');
  if (update('cards', orig, set) < 1) return go('CU', with_('CU', o, { mode: 'edit' }), 'Record changed by some one else. Please review');
  return go('CU', cuFill(Object.assign({}, orig, set), o.from), 'Changes committed to database', 'info');
}

/* report request */
function rpScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  var o = merge('RP', d), ty = up(o.type), name, sd, ed;
  var y = +TODAY.substr(0, 4), m = +TODAY.substr(5, 2);
  if (ty === 'MONTHLY' || ty === 'M') { name = 'Monthly'; sd = TODAY.substr(0, 7) + '-01'; ed = TODAY.substr(0, 7) + '-' + lpad(lastDay(y, m), 2); }
  else if (ty === 'YEARLY' || ty === 'Y') { name = 'Yearly'; sd = y + '-01-01'; ed = y + '-12-31'; }
  else if (ty === 'CUSTOM' || ty === 'C') {
    name = 'Custom'; sd = t(o.startDate); ed = t(o.endDate);
    if (!sd) return go('RP', o, 'Start Date can NOT be empty...');
    if (!ed) return go('RP', o, 'End Date can NOT be empty...');
    if (!validDate(sd)) return go('RP', o, 'Start Date - Not a valid date...');
    if (!validDate(ed)) return go('RP', o, 'End Date - Not a valid date...');
    if (ed < sd) return go('RP', o, 'End Date can NOT be earlier than Start Date...');
  } else return go('RP', o, 'Select a report type to print report...');
  var c = up(o.confirm);
  if (c === '') return go('RP', o, 'Please confirm to print the ' + name + ' report...');
  if (c === 'N') return go('RP', null, '');
  if (c !== 'Y') return go('RP', o, 'Invalid value. Valid values are (Y/N)...');
  insert('job_requests', { start_date: sd, end_date: ed });
  return go('RP', null, name + ' report submitted for printing ...', 'info');
}

/* bill payment */
function bpScreen(a, d) {
  if (a === 'back') return go('MAIN', null, '');
  if (a === 'clear') return go('BP', null, '');
  var o = merge('BP', d), id = t(o.acctId);
  if (!id) return go('BP', o, 'Acct ID can NOT be empty...');
  if (!isNum(id)) return go('BP', with_('BP', o, { balance: '' }), 'Account ID NOT found...');
  var ac = findOne('accounts', { acct_id: +id });
  if (!ac) return go('BP', with_('BP', o, { balance: '' }), 'Account ID NOT found...');
  o.balance = money(ac.curr_bal);
  var bal = r2(ac.curr_bal);
  if (bal <= 0) return go('BP', o, 'You have nothing to pay...');
  var c = up(o.confirm);
  if (c === '') return go('BP', o, 'Confirm to make a bill payment...');
  if (c === 'N') return go('BP', null, '');
  if (c !== 'Y') return go('BP', o, 'Invalid value. Valid values are (Y/N)...');
  var xr = findOne('card_xref', { acct_id: +id }, { card_num: 1 });
  if (!xr) return go('BP', o, 'Account ID NOT found...');
  var last = find('transactions', {}, { tran_id: -1 }, 1, 0)[0];
  var tid = incId(last ? last.tran_id : '');
  insert('transactions', {
    tran_id: tid, type_cd: '02', cat_cd: 2, source: 'POS TERM', desc: 'BILL PAYMENT - ONLINE', amt: bal,
    merchant_id: 999999999, merchant_name: 'BILL PAYMENT', merchant_city: 'N/A', merchant_zip: 'N/A',
    card_num: s(xr.card_num), orig_ts: NOW_TS, proc_ts: NOW_TS
  });
  if (update('accounts', ac, { curr_bal: r2(bal - bal) }) < 1) return go('BP', o, 'Unable to update account balance...');
  return go('BP', with_('BP', {}, { acctId: id, balance: money(0) }), 'Payment successful. Your Transaction ID is ' + tid + '.', 'info');
}

/* user administration */
function ulRow(x) { return x ? { id: s(x.usr_id), first: s(x.first_name), last: s(x.last_name), type: s(x.usr_type) } : { id: '', first: '', last: '', type: '' }; }
function ulLoad(d, mode) {
  var o = merge('UL', d), pg = +o.page || 1;
  if (mode === 'next' && o.more !== 'Y') return go('UL', o, 'You are already at the bottom of the page...');
  if (mode === 'prev' && pg <= 1) return go('UL', o, 'You are already at the top of the page...');
  var r = page('users', 'usr_id', {}, mode === 'first' ? 'gte' : mode, { firstKey: o.firstKey, lastKey: o.lastKey, startKey: t(o.startId) }, 10);
  if (!r.docs.length) {
    if (mode === 'next') return go('UL', with_('UL', o, { more: '' }), 'You are already at the bottom of the page...');
    if (mode === 'prev') return go('UL', o, 'You are already at the top of the page...');
  }
  fillRows(o, 10, r.docs, ulRow, 'usr_id');
  o.page = s(mode === 'next' ? pg + 1 : mode === 'prev' ? pg - 1 : 1);
  o.more = mode === 'prev' ? 'Y' : (r.more ? 'Y' : '');
  return go('UL', o, '');
}
function ulScreen(a, d) {
  if (a === 'back') return go('ADMIN', null, '');
  if (a === 'next' || a === 'prev') return ulLoad(d, a);
  var sel = firstSel(d, 10);
  if (sel) {
    var row = d['r' + sel.i] || {};
    if ((sel.v !== 'U' && sel.v !== 'D') || !t(row.id)) return go('UL', merge('UL', d), 'Invalid selection. Valid values are U and D');
    return withList(sel.v === 'U' ? uuFetch(t(row.id), 'UL') : udFetch(t(row.id), 'UL'), 'UL', d, 10);
  }
  return ulLoad(d, 'first');
}
function uaScreen(a, d, sess) {
  if (a === 'back') return go('ADMIN', null, '');
  if (a === 'clear') return go('UA', null, '');
  var o = merge('UA', d);
  if (!t(o.firstName)) return go('UA', o, 'First Name can NOT be empty...');
  if (!t(o.lastName)) return go('UA', o, 'Last Name can NOT be empty...');
  if (!t(o.userId)) return go('UA', o, 'User ID can NOT be empty...');
  if (!t(o.pwd)) return go('UA', o, 'Password can NOT be empty...');
  if (!t(o.userType)) return go('UA', o, 'User Type can NOT be empty...');
  var ty = up(o.userType); if (ty !== 'A' && ty !== 'U') return go('UA', o, 'User Type must be A or U...');
  var uid = t(o.userId).substr(0, 8);
  if (findOne('users', { usr_id: uid })) return go('UA', o, 'User ID already exist...');
  insert('users', { usr_id: uid, first_name: t(o.firstName).substr(0, 20), last_name: t(o.lastName).substr(0, 20), pwd: t(o.pwd).substr(0, 8), usr_type: ty });
  return go('UA', null, 'User ' + uid + ' has been added ...', 'info');
}
function uuFetch(id, from) {
  if (!id) return go('UU', with_('UU', {}, { from: from }), 'User ID can NOT be empty...');
  var u = findOne('users', { usr_id: id });
  if (!u) return go('UU', with_('UU', {}, { userId: id, from: from }), 'User ID NOT found...');
  return go('UU', { userId: s(u.usr_id), firstName: s(u.first_name), lastName: s(u.last_name), pwd: s(u.pwd), userType: s(u.usr_type), loaded: 'Y', from: from || '' }, 'Press PF5 key to save your updates ...', 'info');
}
function uuScreen(a, d) {
  if (a === 'back') return d.from === 'UL' ? show('UL') : go('ADMIN', null, '');
  var o = merge('UU', d), id = t(o.userId);
  if (a !== 'save') return uuFetch(id, o.from);
  if (!id) return go('UU', o, 'User ID can NOT be empty...');
  if (!t(o.firstName)) return go('UU', o, 'First Name can NOT be empty...');
  if (!t(o.lastName)) return go('UU', o, 'Last Name can NOT be empty...');
  if (!t(o.pwd)) return go('UU', o, 'Password can NOT be empty...');
  if (!t(o.userType)) return go('UU', o, 'User Type can NOT be empty...');
  var ty = up(o.userType); if (ty !== 'A' && ty !== 'U') return go('UU', o, 'User Type must be A or U...');
  var u = findOne('users', { usr_id: id });
  if (!u) return go('UU', o, 'User ID NOT found...');
  var nv = { first_name: t(o.firstName).substr(0, 20), last_name: t(o.lastName).substr(0, 20), pwd: t(o.pwd).substr(0, 8), usr_type: ty }, set = {};
  for (var k in nv) if (!same(u[k], nv[k])) set[k] = nv[k];
  if (!Object.keys(set).length) return go('UU', o, 'Please modify to update ...');
  if (update('users', u, set) < 1) return go('UU', o, 'Unable to Update User...');
  return go('UU', with_('UU', o, { loaded: 'Y' }), 'User ' + id + ' has been updated ...', 'info');
}
function udFetch(id, from) {
  if (!id) return go('UD', with_('UD', {}, { from: from }), 'User ID can NOT be empty...');
  var u = findOne('users', { usr_id: id });
  if (!u) return go('UD', with_('UD', {}, { userId: id, from: from }), 'User ID NOT found...');
  return go('UD', { userId: s(u.usr_id), firstName: s(u.first_name), lastName: s(u.last_name), userType: s(u.usr_type), loaded: 'Y', from: from || '' }, 'Press PF5 key to delete this user ...', 'info');
}
function udScreen(a, d, sess) {
  if (a === 'back') return d.from === 'UL' ? show('UL') : go('ADMIN', null, '');
  var o = merge('UD', d), id = t(o.userId);
  if (a !== 'delete') return udFetch(id, o.from);
  if (!id) return go('UD', o, 'User ID can NOT be empty...');
  if (id === t(sess.userId)) return go('UD', o, 'You can NOT delete your own User ID...');
  var u = findOne('users', { usr_id: id });
  if (!u) return go('UD', o, 'User ID NOT found...');
  remove('users', { usr_id: id });
  return go('UD', with_('UD', {}, { from: o.from }), 'User ' + id + ' has been deleted ...', 'info');
}

/* ---------------- dispatch ---------------- */
function handle() {
  var scr = s(input.screen), a = s(input.action), d = input.data || {}, sess = input.session || {};
  if (scr === '' || scr === 'INIT' || a === 'init') return initAll();
  if (scr === 'BYE') return initAll();
  if (scr === 'SIGNON') return signon(a, d);
  if (!t(sess.userId)) { var p = initAll(); p.msg = 'Please sign on to use CardDemo ...'; p.msgType = 'error'; return p; }
  if (ADMIN_SCREENS[scr] && sess.userType !== 'A') return go('MAIN', null, 'No access - Admin Only option...');
  if (a === 'menu') return go(menuOf(sess), null, '');
  switch (scr) {
    case 'MAIN': case 'ADMIN': return menu(scr, a, d);
    case 'AV': return avScreen(a, d);
    case 'AU': return auScreen(a, d);
    case 'CL': return clScreen(a, d);
    case 'CV': return cvScreen(a, d);
    case 'CU': return cuScreen(a, d);
    case 'TL': return tlScreen(a, d);
    case 'TV': return tvScreen(a, d);
    case 'TA': return taScreen(a, d);
    case 'RP': return rpScreen(a, d);
    case 'BP': return bpScreen(a, d);
    case 'UL': return ulScreen(a, d);
    case 'UA': return uaScreen(a, d, sess);
    case 'UU': return uuScreen(a, d);
    case 'UD': return udScreen(a, d, sess);
  }
  return go(menuOf(sess), null, 'Unknown screen ' + scr);
}

try {
  var res = handle();
  output.result = res; output.route = 'done'; output.st = null; output.op = null; output.opJson = ''; output.dbres = null;
} catch (e) {
  /* Workflow state is deep-merged with each node's output, so the op object is handed over as a JSON string
     and rebuilt by the next node ("Load op") after op has been nulled here. */
  if (e && e.__suspend) { output.st = st; output.op = null; output.opJson = JSON.stringify(e.op); output.route = e.op.route; output.dbres = null; }
  else { output.result = { msg: 'Unable to process the request: ' + (e && e.message ? e.message : e), msgType: 'error' }; output.route = 'done'; output.st = null; output.op = null; output.opJson = ''; output.dbres = null; }
}

```

### Route (FORK, id=6ae873be3695c563ea51ad1b)
  0. [IF] input.route === 'users.find'  (id: <uuid>)
  1. [ELSE_IF] input.route === 'users.insert'  (id: <uuid>)
  2. [ELSE_IF] input.route === 'users.update'  (id: <uuid>)
  3. [ELSE_IF] input.route === 'users.delete'  (id: <uuid>)
  4. [ELSE_IF] input.route === 'accounts.find'  (id: <uuid>)
  5. [ELSE_IF] input.route === 'accounts.update'  (id: <uuid>)
  6. [ELSE_IF] input.route === 'customers.find'  (id: <uuid>)
  7. [ELSE_IF] input.route === 'customers.update'  (id: <uuid>)
  8. [ELSE_IF] input.route === 'card_xref.find'  (id: <uuid>)
  9. [ELSE_IF] input.route === 'cards.find'  (id: <uuid>)
  10. [ELSE_IF] input.route === 'cards.update'  (id: <uuid>)
  11. [ELSE_IF] input.route === 'transactions.find'  (id: <uuid>)
  12. [ELSE_IF] input.route === 'transactions.insert'  (id: <uuid>)
  13. [ELSE_IF] input.route === 'job_requests.insert'  (id: <uuid>)
  14. [ELSE] true  (id: <uuid>)

### Load op (SCRIPT, id=6ae875d73695c563ea51ae24)

```javascript
// Rebuild the pending data-store operation from its JSON form. Logic nulled `op` in the previous step,
// so this object replaces it instead of being deep-merged with the previous call's filter/sort.
output.op = input.opJson ? JSON.parse(input.opJson) : null;
```

## Data source bindings

### users.find (DATA_SOURCE, id=6ae873c93695c563ea51ad1d)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - sort [DB operation param] <uuid> ← `${op.sort}`
  - limit [DB operation param] <uuid> ← `${op.limit}`
  - skip [DB operation param] <uuid> ← `${op.skip}`

### users.insert (DATA_SOURCE, id=6ae873ca3695c563ea51ad1e)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - doc [DB operation param] <uuid> ← `${op.doc}`

### users.update (DATA_SOURCE, id=6ae873cc3695c563ea51ad1f)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - update [DB operation param] <uuid> ← `${op.update}`

### users.delete (DATA_SOURCE, id=6ae873cd3695c563ea51ad20)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** delete — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`

### accounts.find (DATA_SOURCE, id=6ae873ce3695c563ea51ad21)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - sort [DB operation param] <uuid> ← `${op.sort}`
  - limit [DB operation param] <uuid> ← `${op.limit}`
  - skip [DB operation param] <uuid> ← `${op.skip}`

### accounts.update (DATA_SOURCE, id=6ae873d03695c563ea51ad22)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - update [DB operation param] <uuid> ← `${op.update}`

### customers.find (DATA_SOURCE, id=6ae873d13695c563ea51ad23)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - sort [DB operation param] <uuid> ← `${op.sort}`
  - limit [DB operation param] <uuid> ← `${op.limit}`
  - skip [DB operation param] <uuid> ← `${op.skip}`

### customers.update (DATA_SOURCE, id=6ae873d23695c563ea51ad24)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - update [DB operation param] <uuid> ← `${op.update}`

### card_xref.find (DATA_SOURCE, id=6ae873d43695c563ea51ad25)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - sort [DB operation param] <uuid> ← `${op.sort}`
  - limit [DB operation param] <uuid> ← `${op.limit}`
  - skip [DB operation param] <uuid> ← `${op.skip}`

### cards.find (DATA_SOURCE, id=6ae873d53695c563ea51ad26)
- **system:** NOSQL_DB — cards (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - sort [DB operation param] <uuid> ← `${op.sort}`
  - limit [DB operation param] <uuid> ← `${op.limit}`
  - skip [DB operation param] <uuid> ← `${op.skip}`

### cards.update (DATA_SOURCE, id=6ae873d73695c563ea51ad27)
- **system:** NOSQL_DB — cards (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - update [DB operation param] <uuid> ← `${op.update}`

### transactions.find (DATA_SOURCE, id=6ae873d83695c563ea51ad28)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - filter [DB operation param] <uuid> ← `${op.filter}`
  - sort [DB operation param] <uuid> ← `${op.sort}`
  - limit [DB operation param] <uuid> ← `${op.limit}`
  - skip [DB operation param] <uuid> ← `${op.skip}`

### transactions.insert (DATA_SOURCE, id=6ae873d93695c563ea51ad29)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - doc [DB operation param] <uuid> ← `${op.doc}`

### job_requests.insert (DATA_SOURCE, id=6ae873db3695c563ea51ad2a)
- **system:** NOSQL_DB — job_requests (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** dbres
- **variables:**
  - doc [DB operation param] <uuid> ← `${op.doc}`

_(server: 498 ms, 9 API calls, 468 ms in API)_
