// ui_carddemo "step" SCRIPT: one dispatcher for every online screen.
// In : input.type (action), input.f (screen form state), input.sess (session),
//      on loop passes also input.phase / input.carry / input.db.results (from db_exec).
// Out: output.ops (DB batch for db_exec; [] when done), output.phase, output.carry, output.view (keys merged into UI state).
var RT = String(additionalData.applicationConfiguration.RUN_TIMESTAMP || "2022-07-18 10:00:00");
var T = S(input.type);
var F = input.f || {};
var SE = input.sess || {};
var PH = input.phase ? String(input.phase) : "";
var DBR = (PH && input.db && input.db.results) ? input.db.results : null;
var CA = input.carry || {};
var V = { err: "", msg: "" };
var OPS = [], NEXT = "", CARRY = {};

// ---------- helpers ----------
function S(v) { return (v === undefined || v === null) ? "" : String(v); }
function TR(v) { return S(v).replace(/^\s+|\s+$/g, ""); }
function UP(v) { return TR(v).toUpperCase(); }
function q(k, p) { OPS.push({ k: k, p: p }); }
function cont(ph, carry) { NEXT = ph; CARRY = carry || {}; }
function dres(i) { return (DBR && i < DBR.length) ? DBR[i] : null; }
function okr(i) { var x = dres(i); return !!(x && x.ok); }
function rows(i) {
  var x = dres(i); if (!x || !x.ok || x.data === null || x.data === undefined) return null;
  var d = x.data, out = []; for (var j = 0; j < d.length; j++) out.push(d[j]); return out;
}
function nv(v) { if (v === undefined || v === null) return null; var t = typeof v; if (t === "number" || t === "boolean" || t === "string") return v; return String(v); }
function cp(o, fl) { var r = {}; for (var i = 0; i < fl.length; i++) r[fl[i]] = nv(o[fl[i]]); return r; }
function pad(v, w) { var s = S(v); while (s.length < w) s = "0" + s; return s; }
function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function fix2(v) { return num(v).toFixed(2); }
function money(v) {
  var n = num(v), neg = n < 0, p = Math.abs(n).toFixed(2).split("."), i = p[0], o = "";
  while (i.length > 3) { o = "," + i.substring(i.length - 3) + o; i = i.substring(0, i.length - 3); }
  return (neg ? "-" : "") + "$" + i + o + "." + p[1];
}
function signed(v) { return fix2(v); }
function isDigits(s, n) { return new RegExp("^[0-9]{" + n + "}$").test(s); }
function isDate(s) {
  var m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s); if (!m) return false;
  var y = +m[1], mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1) return false;
  var dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= dim;
}
function lastDay(y, mo) { return [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]; }
function acctOk(s) { return isDigits(s, 11) && parseInt(s, 10) !== 0; }
function sess(over) {
  var r = { uid: S(SE.uid), utype: S(SE.utype), fname: S(SE.fname), lname: S(SE.lname), acct: S(SE.acct), card: S(SE.card) };
  if (over) for (var k in over) r[k] = over[k];
  return r;
}
function go(screen) { V.screen = screen; }

var USERF = ["usr_id", "first_name", "last_name", "pwd", "usr_type"];
var ACCTF = ["acct_id", "active_status", "curr_bal", "credit_limit", "cash_credit_limit", "open_date", "expiration_date", "reissue_date", "curr_cyc_credit", "curr_cyc_debit", "addr_zip", "group_id"];
var CUSTF = ["cust_id", "first_name", "middle_name", "last_name", "addr_line_1", "addr_line_2", "addr_line_3", "addr_state_cd", "addr_country_cd", "addr_zip",
  "phone_num_1", "phone_num_2", "ssn", "govt_issued_id", "dob", "eft_account_id", "pri_card_holder_ind", "fico_credit_score"];
var CARDF = ["card_num", "acct_id", "cvv_cd", "embossed_name", "expiration_date", "active_status"];
var TRANF = ["tran_id", "type_cd", "cat_cd", "source", "desc", "amt", "merchant_id", "merchant_name", "merchant_city", "merchant_zip", "card_num", "orig_ts", "proc_ts"];

var MENU = ["Account View", "Account Update", "Credit Card List", "Credit Card View", "Credit Card Update", "Transaction List", "Transaction View",
  "Transaction Add", "Transaction Reports", "Bill Payment", "Pending Authorization View"];
var ADMIN = ["User List (Security)", "User Add (Security)", "User Update (Security)", "User Delete (Security)", "Transaction Type List/Update", "Transaction Type Maintenance"];
var PENDING_AUTH_ENABLED = false, TRAN_TYPE_MAINT_ENABLED = false; // OptionalModuleToggles (modules not part of this build)

// ---------- blank screen states ----------
function blankAv() { return { acct: "" }; }
function blankAvd() { return { show: "" }; }
function blankAuE() {
  return { status: "", open: "", exp: "", reiss: "", climit: "", cashlim: "", bal: "", cycc: "", cycd: "", group: "", cid: "",
    fname: "", mname: "", lname: "", a1: "", a2: "", a3: "", state: "", country: "", zip: "", ph1a: "", ph1b: "", ph1c: "", ph2a: "", ph2b: "", ph2c: "",
    ssn1: "", ssn2: "", ssn3: "", dob: "", govt: "", eft: "", pri: "", fico: "" };
}
function blankCl() { var r = { acct: "", card: "", first: "", last: "", page: 0 }; for (var i = 0; i < 7; i++) { r["s" + i] = ""; r["r" + i] = { show: "", acct: "", card: "", act: "" }; } return r; }
function blankTl() { var r = { tid: "", first: "", last: "", page: 0 }; for (var i = 0; i < 10; i++) { r["s" + i] = ""; r["r" + i] = { show: "", tid: "", date: "", desc: "", amt: "" }; } return r; }
function blankUl() { var r = { uid: "", first: "", last: "", page: 0 }; for (var i = 0; i < 10; i++) { r["s" + i] = ""; r["r" + i] = { show: "", uid: "", fname: "", lname: "", utype: "" }; } return r; }
function blankTa() { return { acct: "", card: "", type: "", cat: "", src: "", desc: "", amt: "", od: "", pd: "", mid: "", mname: "", mcity: "", mzip: "", conf: "" }; }
function blankRp() { return { type: "", sd: "", ed: "", conf: "" }; }
function blankBp() { return { acct: "", bal: "", conf: "" }; }
function blankUa() { return { fname: "", lname: "", uid: "", pwd: "", utype: "" }; }
function blankUu() { return { uid: "", fname: "", lname: "", pwd: "", utype: "", loaded: "", from: "ADMIN" }; }
function blankUd() { return { uid: "", fname: "", lname: "", utype: "", loaded: "", from: "ADMIN" }; }

// =====================================================================
// SIGN-ON
// =====================================================================
function signon() {
  var uid = UP(F.uid), pwd = UP(F.pwd);
  V.so = { uid: uid, pwd: "" };
  if (!uid) { V.err = "Please enter User ID ..."; return; }
  if (!pwd) { V.err = "Please enter Password ..."; return; }
  q("users.find", { filter: { usr_id: uid }, limit: 1 });
  cont("so1");
}
function signon1() {
  var uid = UP(F.uid), pwd = UP(F.pwd), r = rows(0);
  V.so = { uid: uid, pwd: "" };
  if (r === null) { V.err = "Unable to verify the User ..."; return; }
  if (r.length === 0) { V.err = "User not found. Try again ..."; return; }
  var u = r[0];
  if (S(u.pwd) !== pwd) { V.err = "Wrong Password. Try again ..."; return; }
  var t = S(u.usr_type);
  V.sess = { uid: S(u.usr_id), utype: t, fname: S(u.first_name), lname: S(u.last_name), acct: "", card: "" };
  V.so = { uid: "", pwd: "" };
  V.mn = { opt: "" }; V.am = { opt: "" };
  go(t === "A" ? "ADMIN" : "MENU");
}

// =====================================================================
// MENUS
// =====================================================================
function menu() {
  var o = TR(F.opt);
  V.mn = { opt: o };
  if (!/^[0-9]{1,2}$/.test(o) || +o < 1 || +o > MENU.length) { V.err = "Please enter a valid option number..."; return; }
  var n = +o;
  if (n === 11 && !PENDING_AUTH_ENABLED) { V.err = "This option " + MENU[10] + " is not installed..."; return; }
  V.mn = { opt: "" };
  var a = S(SE.acct), c = S(SE.card);
  if (n === 1) { V.av = { acct: a }; V.avd = blankAvd(); go("ACCTVIEW"); }
  else if (n === 2) { V.au = { acct: a, step: "SEARCH", e: blankAuE(), o: { a: {}, c: {} }, rv: "" }; go("ACCTUPD"); }
  else if (n === 3) { clSearch(blankCl(), "first"); }
  else if (n === 4) { V.cv = { acct: a, card: c, from: "MENU" }; V.cvd = { show: "" }; go("CARDVIEW"); }
  else if (n === 5) { V.cu = { acct: a, card: c, step: "SEARCH", name: "", active: "", mon: "", yr: "", o: {}, from: "MENU" }; go("CARDUPD"); }
  else if (n === 6) { tlSearch(blankTl(), "first"); }
  else if (n === 7) { V.tv = { tid: "", from: "MENU" }; V.tvd = { show: "" }; go("TRANVIEW"); }
  else if (n === 8) { V.ta = blankTa(); go("TRANADD"); }
  else if (n === 9) { V.rp = blankRp(); go("REPORT"); }
  else if (n === 10) { V.bp = blankBp(); go("BILLPAY"); }
}
function adminMenu() {
  var o = TR(F.opt);
  V.am = { opt: o };
  if (S(SE.utype) !== "A") { V.err = "No access - Admin Only option..."; return; }
  if (!/^[0-9]{1,2}$/.test(o) || +o < 1 || +o > ADMIN.length) { V.err = "Please enter a valid option number..."; return; }
  var n = +o;
  if (n >= 5 && !TRAN_TYPE_MAINT_ENABLED) { V.err = "This option " + ADMIN[n - 1] + " is not installed..."; return; }
  V.am = { opt: "" };
  if (n === 1) ulSearch(blankUl(), "first");
  else if (n === 2) { V.ua = blankUa(); go("USERADD"); }
  else if (n === 3) { V.uu = blankUu(); go("USERUPD"); }
  else if (n === 4) { V.ud = blankUd(); go("USERDEL"); }
}
function needAdmin() { if (S(SE.utype) !== "A") { V.err = "No access - Admin Only option..."; go(SE.uid ? "MENU" : "SIGNON"); return false; } return true; }

// =====================================================================
// ACCOUNT VIEW / ACCOUNT UPDATE (shared fetch: xref -> account -> customer)
// =====================================================================
function acctFetch(acctStr, mode) {
  var n = parseInt(acctStr, 10);
  q("card_xref.find", { filter: { acct_id: n }, sort: { card_num: 1 }, limit: 1 });
  q("accounts.find", { filter: { acct_id: n }, limit: 1 });
  cont("af1", { mode: mode, acct: acctStr });
}
function acctFetch1() {
  var mode = S(CA.mode), acctStr = S(CA.acct), xr = rows(0), ac = rows(1);
  var fail = function (m) { V.err = m; if (mode === "view") { V.avd = blankAvd(); } else { auState(acctStr, "SEARCH", blankAuE(), { a: {}, c: {} }, ""); } };
  if (xr === null || ac === null) return fail("Unable to read account data...");
  if (xr.length === 0) return fail("Did not find this account in account card xref file");
  if (ac.length === 0) return fail("Did not find this account in account master file");
  var custId = num(xr[0].cust_id);
  q("customers.find", { filter: { cust_id: custId }, limit: 1 });
  cont("af2", { mode: mode, acct: acctStr, a: cp(ac[0], ACCTF), card: S(xr[0].card_num) });
}
function acctFetch2() {
  var mode = S(CA.mode), acctStr = S(CA.acct), cu = rows(0), a = cp(CA.a, ACCTF);
  if (cu === null || cu.length === 0) {
    V.err = "Did not find associated customer in master file";
    if (mode === "view") V.avd = blankAvd(); else auState(acctStr, "SEARCH", blankAuE(), { a: {}, c: {} }, "");
    return;
  }
  var c = cp(cu[0], CUSTF);
  V.sess = sess({ acct: acctStr, card: S(CA.card) });
  if (mode === "view") { V.av = { acct: acctStr }; V.avd = acctDisplay(a, c); }
  else auState(acctStr, "EDIT", toEdit(a, c), { a: a, c: c }, "");
}
function ssnStr(v) { var s = S(v); return s === "" ? "" : pad(s, 9); }
function acctDisplay(a, c) {
  var ssn = ssnStr(c.ssn);
  return {
    show: "Y",
    acct: "Account Number: " + pad(a.acct_id, 11), status: "Active Y/N: " + S(a.active_status),
    open: "Opened: " + S(a.open_date), exp: "Expiry: " + S(a.expiration_date), reiss: "Reissue: " + S(a.reissue_date),
    climit: "Credit Limit: " + money(a.credit_limit), cashlim: "Cash credit Limit: " + money(a.cash_credit_limit),
    bal: "Current Balance: " + money(a.curr_bal), cycc: "Current Cycle Credit: " + money(a.curr_cyc_credit),
    cycd: "Current Cycle Debit: " + money(a.curr_cyc_debit), group: "Account Group: " + S(a.group_id),
    cid: "Customer id: " + pad(c.cust_id, 9), ssn: "SSN: " + (ssn ? "***-**-" + ssn.substring(5) : ""),
    dob: "Date of birth: " + S(c.dob), fico: "FICO Score: " + S(c.fico_credit_score),
    fname: "First Name: " + S(c.first_name), mname: "Middle Name: " + S(c.middle_name), lname: "Last Name: " + S(c.last_name),
    a1: "Address: " + S(c.addr_line_1), a2: "Address line 2: " + S(c.addr_line_2), a3: "City: " + S(c.addr_line_3),
    state: "State: " + S(c.addr_state_cd), zip: "Zip: " + S(c.addr_zip), country: "Country: " + S(c.addr_country_cd),
    ph1: "Phone 1: " + S(c.phone_num_1), ph2: "Phone 2: " + S(c.phone_num_2),
    govt: "Government Issued Id Ref: " + S(c.govt_issued_id), eft: "EFT Account Id: " + S(c.eft_account_id),
    pri: "Primary Card Holder Y/N: " + S(c.pri_card_holder_ind)
  };
}
function acctView() {
  var acct = TR(F.acct);
  V.av = { acct: acct }; V.avd = blankAvd();
  if (!acctOk(acct)) { V.err = "Account number must be a non zero 11 digit number"; return; }
  acctFetch(acct, "view");
}

// ---- account update ----
function phParts(p) { var d = S(p).replace(/[^0-9]/g, ""); if (d.length === 10) return [d.substring(0, 3), d.substring(3, 6), d.substring(6)]; return [d.substring(0, 3), d.substring(3, 6), d.substring(6)]; }
function toEdit(a, c) {
  var s = ssnStr(c.ssn), p1 = phParts(c.phone_num_1), p2 = phParts(c.phone_num_2);
  return { status: S(a.active_status), open: S(a.open_date), exp: S(a.expiration_date), reiss: S(a.reissue_date),
    climit: a.credit_limit === null ? "" : fix2(a.credit_limit), cashlim: a.cash_credit_limit === null ? "" : fix2(a.cash_credit_limit),
    bal: a.curr_bal === null ? "" : fix2(a.curr_bal), cycc: a.curr_cyc_credit === null ? "" : fix2(a.curr_cyc_credit),
    cycd: a.curr_cyc_debit === null ? "" : fix2(a.curr_cyc_debit), group: S(a.group_id), cid: pad(c.cust_id, 9),
    fname: S(c.first_name), mname: S(c.middle_name), lname: S(c.last_name), a1: S(c.addr_line_1), a2: S(c.addr_line_2), a3: S(c.addr_line_3),
    state: S(c.addr_state_cd), country: S(c.addr_country_cd), zip: S(c.addr_zip),
    ph1a: p1[0], ph1b: p1[1], ph1c: p1[2], ph2a: p2[0], ph2b: p2[1], ph2c: p2[2],
    ssn1: s.substring(0, 3), ssn2: s.substring(3, 5), ssn3: s.substring(5), dob: S(c.dob), govt: S(c.govt_issued_id),
    eft: S(c.eft_account_id), pri: S(c.pri_card_holder_ind), fico: S(c.fico_credit_score) };
}
var AUK = ["status", "open", "exp", "reiss", "climit", "cashlim", "bal", "cycc", "cycd", "group", "cid", "fname", "mname", "lname", "a1", "a2", "a3", "state",
  "country", "zip", "ph1a", "ph1b", "ph1c", "ph2a", "ph2b", "ph2c", "ssn1", "ssn2", "ssn3", "dob", "govt", "eft", "pri", "fico"];
function readE(src) { var r = {}; src = src || {}; for (var i = 0; i < AUK.length; i++) r[AUK[i]] = TR(src[AUK[i]]); return r; }
function readO(src) { src = src || {}; return { a: cp(src.a || {}, ACCTF), c: cp(src.c || {}, CUSTF) }; }
function auState(acct, step, e, o, rv) { V.au = { acct: acct, step: step, e: e, o: o, rv: rv }; }
function auGet() {
  var acct = TR(F.acct);
  auState(acct, "SEARCH", blankAuE(), { a: {}, c: {} }, "");
  if (!acctOk(acct)) { V.err = "Account number must be a non zero 11 digit number"; return; }
  acctFetch(acct, "update");
}
var US_STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI AA AE AP".split(" ");
var AMT_RE = /^[-+]?[0-9]{1,10}(\.[0-9]{1,2})?$/;
var NAME_RE = /^[A-Za-z ]*$/;
// field labels, in legacy edit order; [key, label, kind]
var AU_FIELDS = [["status", "Account Status"], ["open", "Open Date"], ["climit", "Credit Limit"], ["exp", "Expiry Date"], ["cashlim", "Cash Credit Limit"],
  ["reiss", "Reissue Date"], ["bal", "Current Balance"], ["cycc", "Current Cycle Credit"], ["cycd", "Current Cycle Debit"], ["group", "Account Group"],
  ["ssn", "SSN"], ["dob", "Date of Birth"], ["fico", "FICO Score"], ["fname", "First Name"], ["mname", "Middle Name"], ["lname", "Last Name"],
  ["a1", "Address Line 1"], ["a2", "Address Line 2"], ["a3", "City"], ["state", "State"], ["zip", "Zip"], ["country", "Country"],
  ["ph1", "Phone 1"], ["ph2", "Phone 2"], ["govt", "Government Issued Id"], ["eft", "EFT Account Id"], ["pri", "Primary Card Holder"]];
function eVal(e, k) {
  if (k === "ssn") return e.ssn1 + "-" + e.ssn2 + "-" + e.ssn3;
  if (k === "ph1") return e.ph1a || e.ph1b || e.ph1c ? "(" + e.ph1a + ")" + e.ph1b + "-" + e.ph1c : "";
  if (k === "ph2") return e.ph2a || e.ph2b || e.ph2c ? "(" + e.ph2a + ")" + e.ph2b + "-" + e.ph2c : "";
  return e[k];
}
function auValidate(e) {
  var i, k;
  if (!/^[YN]$/.test(e.status.toUpperCase())) return "Account Active Status must be Y or N";
  var amts = [["climit", "Credit Limit"], ["cashlim", "Cash Credit Limit"], ["bal", "Current Balance"], ["cycc", "Current Cycle Credit"], ["cycd", "Current Cycle Debit"]];
  var dates = [["open", "Open Date"], ["exp", "Expiry Date"], ["reiss", "Reissue Date"]];
  // legacy order: status, open date, credit limit, expiry, cash limit, reissue, balance, cycle credit, cycle debit
  var order = [["d", 0], ["a", 0], ["d", 1], ["a", 1], ["d", 2], ["a", 2], ["a", 3], ["a", 4]];
  for (i = 0; i < order.length; i++) {
    if (order[i][0] === "d") { var d = dates[order[i][1]]; if (!e[d[0]]) return d[1] + " must be supplied"; if (!isDate(e[d[0]])) return d[1] + " - Not a valid date..."; }
    else { var a = amts[order[i][1]]; if (!e[a[0]]) return a[1] + " must be supplied"; if (!AMT_RE.test(e[a[0]])) return a[1] + " is not valid"; }
  }
  if (!/^[0-9]{3}$/.test(e.ssn1)) return "SSN: First 3 chars must be a 3 digit number";
  if (e.ssn1 === "000" || e.ssn1 === "666" || +e.ssn1 >= 900) return "SSN: First 3 chars: should not be 000, 666, or between 900 and 999";
  if (!/^[0-9]{2}$/.test(e.ssn2) || e.ssn2 === "00") return "SSN 4th & 5th chars must be a non zero 2 digit number";
  if (!/^[0-9]{4}$/.test(e.ssn3) || e.ssn3 === "0000") return "SSN Last 4 chars must be a non zero 4 digit number";
  if (!e.dob) return "Date of Birth must be supplied";
  if (!isDate(e.dob)) return "Date of Birth - Not a valid date...";
  if (!/^[0-9]{3}$/.test(e.fico)) return "FICO Score must be supplied as a 3 digit number";
  if (+e.fico < 300 || +e.fico > 850) return "FICO Score: should be between 300 and 850";
  if (!e.fname) return "First Name must be supplied";
  if (!NAME_RE.test(e.fname)) return "First Name: Name can only contain alphabets and spaces";
  if (!NAME_RE.test(e.mname)) return "Middle Name: Name can only contain alphabets and spaces";
  if (!e.lname) return "Last Name must be supplied";
  if (!NAME_RE.test(e.lname)) return "Last Name: Name can only contain alphabets and spaces";
  if (!e.a1) return "Address Line 1 must be supplied";
  if (!e.state) return "State must be supplied";
  if (US_STATES.indexOf(e.state.toUpperCase()) < 0) return "State: Not a valid US state code";
  if (!e.zip) return "Zip must be supplied";
  if (!/^[0-9]{5}$/.test(e.zip)) return "Zip: must be a 5 digit number";
  if (!e.a3) return "City must be supplied";
  if (!e.country) return "Country must be supplied";
  var ph = [["ph1", "Phone Number 1"], ["ph2", "Phone Number 2"]];
  for (i = 0; i < 2; i++) {
    k = ph[i][0]; var pa = e[k + "a"], pb = e[k + "b"], pc = e[k + "c"];
    if (!pa && !pb && !pc) continue;
    if (!/^[0-9]{3}$/.test(pa)) return ph[i][1] + ": Area code must be a 3 digit number";
    if (!/^[0-9]{3}$/.test(pb)) return ph[i][1] + ": Prefix code must be a 3 digit number";
    if (!/^[0-9]{4}$/.test(pc)) return ph[i][1] + ": Line number must be a 4 digit number";
  }
  if (e.eft && !/^[0-9]+$/.test(e.eft)) return "EFT Account Id must be a number";
  if (!/^[YN]$/.test(e.pri.toUpperCase())) return "Primary Card Holder must be Y or N";
  return "";
}
function auChanges(e, oe) {
  var ch = [];
  for (var i = 0; i < AU_FIELDS.length; i++) {
    var k = AU_FIELDS[i][0], nvl = eVal(e, k), ovl = eVal(oe, k);
    if (k === "status" || k === "pri" || k === "state") { nvl = nvl.toUpperCase(); ovl = ovl.toUpperCase(); }
    if (["climit", "cashlim", "bal", "cycc", "cycd"].indexOf(k) >= 0) { nvl = fix2(nvl); ovl = ovl === "" ? "" : fix2(ovl); }
    if (nvl !== ovl) ch.push([k, AU_FIELDS[i][1], ovl, nvl]);
  }
  return ch;
}
function mdCell(s) { return S(s).replace(/\|/g, "/"); }
function auReview(ch) {
  var t = "| Attribute | Current | New |\n|---|---|---|\n";
  for (var i = 0; i < ch.length; i++) t += "| " + mdCell(ch[i][1]) + " | " + mdCell(ch[i][2]) + " | " + mdCell(ch[i][3]) + " |\n";
  return t;
}
function auVal() {
  var acct = TR(F.acct), e = readE(F.e), o = readO(F.o);
  auState(acct, "EDIT", e, o, "");
  var m = auValidate(e); if (m) { V.err = m; return; }
  var ch = auChanges(e, toEdit(o.a, o.c));
  if (ch.length === 0) { V.err = "No change detected with respect to values fetched."; return; }
  auState(acct, "CONFIRM", e, o, auReview(ch));
  V.msg = "Changes validated.Press F5 to save";
}
function auCancel() { var o = readO(F.o); auState(TR(F.acct), "EDIT", toEdit(o.a, o.c), o, ""); }
function auSave() {
  var acct = TR(F.acct), e = readE(F.e), o = readO(F.o);
  auState(acct, "CONFIRM", e, o, S(F.rv));
  var m = auValidate(e); if (m) { auState(acct, "EDIT", e, o, ""); V.err = m; return; }
  q("accounts.find", { filter: { acct_id: num(o.a.acct_id) }, limit: 1 });
  q("customers.find", { filter: { cust_id: num(o.c.cust_id) }, limit: 1 });
  cont("aus1");
}
function same(x, y, fl) { for (var i = 0; i < fl.length; i++) if (S(nv(x[fl[i]])) !== S(nv(y[fl[i]]))) return false; return true; }
function auSave1() {
  var acct = TR(F.acct), e = readE(F.e), o = readO(F.o), ra = rows(0), rc = rows(1);
  if (ra === null || ra.length === 0) { auState(acct, "EDIT", e, o, ""); V.err = "Could not lock account record for update"; return; }
  if (rc === null || rc.length === 0) { auState(acct, "EDIT", e, o, ""); V.err = "Could not lock customer record for update"; return; }
  var ca = cp(ra[0], ACCTF), cc = cp(rc[0], CUSTF);
  if (!same(ca, o.a, ACCTF) || !same(cc, o.c, CUSTF)) {
    auState(acct, "EDIT", toEdit(ca, cc), { a: ca, c: cc }, "");
    V.err = "Record changed by some one else. Please review"; return;
  }
  var ch = auChanges(e, toEdit(o.a, o.c)), sa = {}, sc = {}, na = 0, nc = 0;
  for (var i = 0; i < ch.length; i++) {
    var k = ch[i][0], v = ch[i][3];
    if (k === "status") { sa.active_status = v; na++; }
    else if (k === "open") { sa.open_date = v; na++; } else if (k === "exp") { sa.expiration_date = v; na++; } else if (k === "reiss") { sa.reissue_date = v; na++; }
    else if (k === "climit") { sa.credit_limit = Math.round(num(v) * 100) / 100; na++; } else if (k === "cashlim") { sa.cash_credit_limit = Math.round(num(v) * 100) / 100; na++; }
    else if (k === "bal") { sa.curr_bal = Math.round(num(v) * 100) / 100; na++; } else if (k === "cycc") { sa.curr_cyc_credit = Math.round(num(v) * 100) / 100; na++; }
    else if (k === "cycd") { sa.curr_cyc_debit = Math.round(num(v) * 100) / 100; na++; } else if (k === "group") { sa.group_id = v; na++; }
    else if (k === "ssn") { sc.ssn = parseInt(e.ssn1 + e.ssn2 + e.ssn3, 10); nc++; } else if (k === "dob") { sc.dob = v; nc++; }
    else if (k === "fico") { sc.fico_credit_score = parseInt(v, 10); nc++; } else if (k === "fname") { sc.first_name = v; nc++; }
    else if (k === "mname") { sc.middle_name = v; nc++; } else if (k === "lname") { sc.last_name = v; nc++; }
    else if (k === "a1") { sc.addr_line_1 = v; nc++; } else if (k === "a2") { sc.addr_line_2 = v; nc++; } else if (k === "a3") { sc.addr_line_3 = v; nc++; }
    else if (k === "state") { sc.addr_state_cd = v; nc++; } else if (k === "zip") { sc.addr_zip = v; nc++; } else if (k === "country") { sc.addr_country_cd = v; nc++; }
    else if (k === "ph1") { sc.phone_num_1 = v; nc++; } else if (k === "ph2") { sc.phone_num_2 = v; nc++; } else if (k === "govt") { sc.govt_issued_id = v; nc++; }
    else if (k === "eft") { sc.eft_account_id = v; nc++; } else if (k === "pri") { sc.pri_card_holder_ind = v; nc++; }
  }
  if (na === 0 && nc === 0) { auState(acct, "EDIT", e, o, ""); V.err = "No change detected with respect to values fetched."; return; }
  if (na) q("accounts.update", { filter: { acct_id: num(o.a.acct_id) }, update: { "$set": sa } });
  if (nc) q("customers.update", { filter: { cust_id: num(o.c.cust_id) }, update: { "$set": sc } });
  var na2 = cp(o.a, ACCTF), nc2 = cp(o.c, CUSTF), kk;
  for (kk in sa) na2[kk] = sa[kk];
  for (kk in sc) nc2[kk] = sc[kk];
  cont("aus2", { a: na2, c: nc2, n: OPS.length });
}
function auSave2() {
  var acct = TR(F.acct), n = num(CA.n), all = true;
  for (var i = 0; i < n; i++) if (!okr(i)) all = false;
  var a = cp(CA.a, ACCTF), c = cp(CA.c, CUSTF);
  if (!all) { var o = readO(F.o); auState(acct, "EDIT", readE(F.e), o, ""); V.err = "Update of record failed"; return; }
  auState(acct, "EDIT", toEdit(a, c), { a: a, c: c }, "");
  V.msg = "Changes committed to database";
}

// =====================================================================
// CARD LIST (7 per page, ordered by card number)
// =====================================================================
function clRead(src) {
  var r = blankCl(); src = src || {};
  r.acct = TR(src.acct); r.card = TR(src.card); r.first = S(src.first); r.last = S(src.last); r.page = num(src.page);
  for (var i = 0; i < 7; i++) {
    r["s" + i] = UP(src["s" + i]); var x = src["r" + i] || {};
    r["r" + i] = { show: S(x.show), acct: S(x.acct), card: S(x.card), act: S(x.act) };
  }
  return r;
}
function clFilter(cl) { var f = {}; if (cl.acct) f.acct_id = parseInt(cl.acct, 10); if (cl.card) f.card_num = cl.card; return f; }
function clCheck(cl) {
  if (cl.acct && !isDigits(cl.acct, 11)) return "Account number must be a 11 digit number";
  if (cl.card && !isDigits(cl.card, 16)) return "Card number if supplied must be a 16 digit number";
  return "";
}
function clSearch(cl, dir) {
  go("CARDLIST");
  var m = clCheck(cl); if (m) { V.cl = cl; V.err = m; return; }
  var f = clFilter(cl);
  if (dir === "next") { f.card_num = cl.card ? cl.card : null; if (!cl.card) f.card_num = { "$gt": cl.last }; else f.card_num = cl.card; }
  if (dir === "prev") { if (!cl.card) f.card_num = { "$lt": cl.first }; }
  if (dir === "next" && cl.card) { V.cl = cl; V.err = "You are already at the bottom of the page..."; return; }
  if (dir === "prev" && (cl.card || cl.page <= 1)) { V.cl = cl; V.err = "You are already at the top of the page..."; return; }
  q("cards.find", { filter: f, sort: { card_num: dir === "prev" ? -1 : 1 }, limit: 7 });
  cont("cl1", { dir: dir, acct: cl.acct, card: cl.card, page: cl.page });
}
function clSearch1() {
  var dir = S(CA.dir), r = rows(0), cl = clRead(F);
  if (dir === "first") { cl = blankCl(); cl.acct = S(CA.acct); cl.card = S(CA.card); }
  if (r === null) { V.cl = cl; V.err = "Unable to lookup card data..."; go("CARDLIST"); return; }
  go("CARDLIST");
  if (r.length === 0) {
    if (dir === "first") { V.cl = cl; V.err = "Did not find cards for this search condition"; return; }
    V.cl = cl; V.err = dir === "next" ? "You are already at the bottom of the page..." : "You are already at the top of the page..."; return;
  }
  if (dir === "prev") r.reverse();
  var o = blankCl(); o.acct = S(CA.acct); o.card = S(CA.card);
  for (var i = 0; i < r.length; i++) o["r" + i] = { show: "Y", acct: pad(r[i].acct_id, 11), card: S(r[i].card_num), act: S(r[i].active_status) };
  o.first = S(r[0].card_num); o.last = S(r[r.length - 1].card_num);
  o.page = dir === "first" ? 1 : dir === "next" ? num(CA.page) + 1 : Math.max(1, num(CA.page) - 1);
  V.cl = o;
}
function clEnter() {
  var cl = clRead(F), sel = [];
  var m = clCheck(cl); if (m) { V.cl = cl; V.err = m; go("CARDLIST"); return; }
  for (var i = 0; i < 7; i++) if (cl["s" + i] && cl["r" + i].show === "Y") sel.push(i);
  if (sel.length > 1) { V.cl = cl; V.err = "PLEASE SELECT ONLY ONE RECORD TO VIEW OR UPDATE"; go("CARDLIST"); return; }
  if (sel.length === 1) {
    var code = cl["s" + sel[0]], row = cl["r" + sel[0]];
    if (code !== "S" && code !== "U") { V.cl = cl; V.err = "Invalid selection. Valid values are S and U"; go("CARDLIST"); return; }
    cl["s" + sel[0]] = ""; V.cl = cl;
    cardFetch(row.acct, row.card, code === "S" ? "view" : "update", "CARDLIST");
    return;
  }
  clSearch(cl, "first");
}

// =====================================================================
// CARD VIEW / CARD UPDATE
// =====================================================================
function cardKeys(acct, card) {
  if (!acct && !card) return "No input received";
  if (!acct) return "Account number not provided";
  if (!acctOk(acct)) return "Account number must be a non zero 11 digit number";
  if (!card) return "Card number not provided";
  if (!isDigits(card, 16)) return "Card number if supplied must be a 16 digit number";
  return "";
}
function cardFetch(acct, card, mode, from) {
  q("cards.find", { filter: { card_num: card, acct_id: parseInt(acct, 10) }, limit: 1 });
  cont("cf1", { acct: acct, card: card, mode: mode, from: from });
}
function expParts(d) { var s = S(d); return { y: s.substring(0, 4), m: s.substring(5, 7), d: s.substring(8, 10) }; }
function cuState(acct, card, step, name, active, mon, yr, o, from) { V.cu = { acct: acct, card: card, step: step, name: name, active: active, mon: mon, yr: yr, o: o, from: from }; }
function cardFetch1() {
  var acct = S(CA.acct), card = S(CA.card), mode = S(CA.mode), from = S(CA.from) || "MENU", r = rows(0);
  go(mode === "view" ? "CARDVIEW" : "CARDUPD");
  var fail = function (m) {
    V.err = m;
    if (mode === "view") { V.cv = { acct: acct, card: card, from: from }; V.cvd = { show: "" }; }
    else cuState(acct, card, "SEARCH", "", "", "", "", {}, from);
  };
  if (r === null) return fail("Error reading Card Data File");
  if (r.length === 0) return fail("Did not find cards for this search condition");
  var c = cp(r[0], CARDF), ep = expParts(c.expiration_date);
  V.sess = sess({ acct: acct, card: card });
  if (mode === "view") {
    V.cv = { acct: acct, card: card, from: from };
    V.cvd = { show: "Y", name: "Name on card: " + S(c.embossed_name), active: "Card Active Y/N: " + S(c.active_status), exp: "Expiry Date: " + ep.m + "/" + ep.y };
  } else {
    c.cvv_cd = null; // never sent to the screen
    cuState(acct, card, "EDIT", S(c.embossed_name), S(c.active_status), ep.m, ep.y, c, from);
  }
}
function cardView() {
  var acct = TR(F.acct), card = TR(F.card), from = S(F.from) || "MENU";
  V.cv = { acct: acct, card: card, from: from }; V.cvd = { show: "" }; go("CARDVIEW");
  var m = cardKeys(acct, card); if (m) { V.err = m; return; }
  cardFetch(acct, card, "view", from);
}
function cuGet() {
  var acct = TR(F.acct), card = TR(F.card), from = S(F.from) || "MENU";
  cuState(acct, card, "SEARCH", "", "", "", "", {}, from); go("CARDUPD");
  var m = cardKeys(acct, card); if (m) { V.err = m; return; }
  cardFetch(acct, card, "update", from);
}
function cuRead() {
  return { acct: TR(F.acct), card: TR(F.card), name: TR(F.name), active: UP(F.active), mon: TR(F.mon), yr: TR(F.yr), o: cp(F.o || {}, CARDF), from: S(F.from) || "MENU" };
}
function cuCheck(c) {
  if (!c.name) return "Card name not provided";
  if (!NAME_RE.test(c.name)) return "Card name can only contain alphabets and spaces";
  if (c.active !== "Y" && c.active !== "N") return "Card Active Status must be Y or N";
  if (!/^[0-9]{1,2}$/.test(c.mon) || +c.mon < 1 || +c.mon > 12) return "Card expiry month must be between 1 and 12";
  if (!/^[0-9]{4}$/.test(c.yr) || +c.yr < 1950 || +c.yr > 2099) return "Invalid card expiry year";
  return "";
}
function cuNewExp(c) { var ep = expParts(c.o.expiration_date); return c.yr + "-" + pad(+c.mon, 2) + "-" + (ep.d || "01"); }
function cuChanged(c) { return c.name !== S(c.o.embossed_name) || c.active !== S(c.o.active_status) || cuNewExp(c) !== S(c.o.expiration_date); }
function cuVal() {
  var c = cuRead(); go("CARDUPD");
  cuState(c.acct, c.card, "EDIT", c.name, c.active, c.mon, c.yr, c.o, c.from);
  var m = cuCheck(c); if (m) { V.err = m; return; }
  if (!cuChanged(c)) { V.err = "No change detected with respect to values fetched."; return; }
  cuState(c.acct, c.card, "CONFIRM", c.name, c.active, pad(+c.mon, 2), c.yr, c.o, c.from);
  V.msg = "Changes validated. Press F5 to save";
}
function cuCancel() { var c = cuRead(), ep = expParts(c.o.expiration_date); go("CARDUPD"); cuState(c.acct, c.card, "EDIT", S(c.o.embossed_name), S(c.o.active_status), ep.m, ep.y, c.o, c.from); }
function cuSave() {
  var c = cuRead(); go("CARDUPD");
  cuState(c.acct, c.card, "CONFIRM", c.name, c.active, c.mon, c.yr, c.o, c.from);
  var m = cuCheck(c); if (m) { V.err = m; cuState(c.acct, c.card, "EDIT", c.name, c.active, c.mon, c.yr, c.o, c.from); return; }
  q("cards.find", { filter: { card_num: c.card }, limit: 1 });
  cont("cus1");
}
function cuSave1() {
  var c = cuRead(), r = rows(0); go("CARDUPD");
  if (r === null || r.length === 0) { cuState(c.acct, c.card, "EDIT", c.name, c.active, c.mon, c.yr, c.o, c.from); V.err = "Could not lock record for update"; return; }
  var cur = cp(r[0], CARDF); cur.cvv_cd = null;
  var chk = ["card_num", "acct_id", "embossed_name", "expiration_date", "active_status"];
  if (!same(cur, c.o, chk)) {
    var ep = expParts(cur.expiration_date);
    cuState(c.acct, c.card, "EDIT", S(cur.embossed_name), S(cur.active_status), ep.m, ep.y, cur, c.from);
    V.err = "Record changed by some one else. Please review"; return;
  }
  var ne = cuNewExp(c);
  q("cards.update", { filter: { card_num: c.card }, update: { "$set": { embossed_name: c.name, active_status: c.active, expiration_date: ne } } });
  var no = cp(c.o, CARDF); no.embossed_name = c.name; no.active_status = c.active; no.expiration_date = ne;
  cont("cus2", { o: no });
}
function cuSave2() {
  var c = cuRead(); go("CARDUPD");
  if (!okr(0)) { cuState(c.acct, c.card, "EDIT", c.name, c.active, c.mon, c.yr, c.o, c.from); V.err = "Update of record failed"; return; }
  var no = cp(CA.o, CARDF), ep = expParts(no.expiration_date);
  cuState(c.acct, c.card, "EDIT", S(no.embossed_name), S(no.active_status), ep.m, ep.y, no, c.from);
  V.msg = "Changes committed to database";
}

// =====================================================================
// TRANSACTION LIST (10 per page, ascending tran_id) / VIEW
// =====================================================================
function tlRead(src) {
  var r = blankTl(); src = src || {};
  r.tid = TR(src.tid); r.first = S(src.first); r.last = S(src.last); r.page = num(src.page);
  for (var i = 0; i < 10; i++) {
    r["s" + i] = UP(src["s" + i]); var x = src["r" + i] || {};
    r["r" + i] = { show: S(x.show), tid: S(x.tid), date: S(x.date), desc: S(x.desc), amt: S(x.amt) };
  }
  return r;
}
function mmddyy(ts) { var s = S(ts); return s.length >= 10 ? s.substring(5, 7) + "/" + s.substring(8, 10) + "/" + s.substring(2, 4) : s; }
function tlSearch(tl, dir) {
  go("TRANLIST");
  if (tl.tid && !/^[0-9]+$/.test(tl.tid)) { V.tl = tl; V.err = "Tran ID must be Numeric ..."; return; }
  var f = {};
  if (dir === "first") { if (tl.tid) f.tran_id = { "$gte": pad(tl.tid, 16) }; }
  else if (dir === "next") f.tran_id = { "$gt": tl.last };
  else { if (tl.page <= 1) { V.tl = tl; V.err = "You are already at the top of the page..."; return; } f.tran_id = { "$lt": tl.first }; }
  q("transactions.find", { filter: f, sort: { tran_id: dir === "prev" ? -1 : 1 }, limit: 10 });
  cont("tl1", { dir: dir, tid: tl.tid, page: tl.page });
}
function tlSearch1() {
  var dir = S(CA.dir), r = rows(0), tl = tlRead(F); go("TRANLIST");
  if (dir === "first") { tl = blankTl(); tl.tid = S(CA.tid); }
  if (r === null) { V.tl = tl; V.err = "Unable to lookup transaction..."; return; }
  if (r.length === 0) {
    V.tl = tl;
    V.err = dir === "prev" ? "You are already at the top of the page..." : "You are already at the bottom of the page...";
    return;
  }
  if (dir === "prev") r.reverse();
  var o = blankTl(); o.tid = S(CA.tid);
  for (var i = 0; i < r.length; i++) o["r" + i] = { show: "Y", tid: S(r[i].tran_id), date: mmddyy(r[i].orig_ts), desc: S(r[i].desc), amt: signed(r[i].amt) };
  o.first = S(r[0].tran_id); o.last = S(r[r.length - 1].tran_id);
  o.page = dir === "first" ? 1 : dir === "next" ? num(CA.page) + 1 : Math.max(1, num(CA.page) - 1);
  V.tl = o;
}
function tlEnter() {
  var tl = tlRead(F), sel = -1;
  for (var i = 0; i < 10; i++) if (tl["s" + i] && tl["r" + i].show === "Y") { sel = i; break; }
  if (sel >= 0) {
    if (tl["s" + sel] !== "S") { V.tl = tl; V.err = "Invalid selection. Valid value is S"; go("TRANLIST"); return; }
    var tid = tl["r" + sel].tid; tl["s" + sel] = ""; V.tl = tl;
    V.tv = { tid: tid, from: "TRANLIST" }; tranFetch(tid, "TRANLIST"); return;
  }
  tlSearch(tl, "first");
}
function tranFetch(tid, from) {
  q("transactions.find", { filter: { tran_id: tid }, limit: 1 });
  cont("tv1", { tid: tid, from: from });
}
function tranView() {
  var tid = TR(F.tid), from = S(F.from) || "MENU"; go("TRANVIEW");
  V.tv = { tid: tid, from: from }; V.tvd = { show: "" };
  if (!tid) { V.err = "Tran ID can NOT be empty..."; return; }
  if (/^[0-9]+$/.test(tid) && tid.length < 16) tid = pad(tid, 16);
  V.tv.tid = tid;
  tranFetch(tid, from);
}
function tranFetch1() {
  var tid = S(CA.tid), from = S(CA.from) || "MENU", r = rows(0); go("TRANVIEW");
  V.tv = { tid: tid, from: from };
  if (r === null) { V.tvd = { show: "" }; V.err = "Unable to lookup Transaction..."; return; }
  if (r.length === 0) { V.tvd = { show: "" }; V.err = "Transaction ID NOT found..."; return; }
  var t = cp(r[0], TRANF);
  V.tvd = { show: "Y", tid: "Transaction ID: " + S(t.tran_id), card: "Card Number: " + S(t.card_num), type: "Type CD: " + S(t.type_cd),
    cat: "Category CD: " + pad(t.cat_cd, 4), src: "Source: " + S(t.source), desc: "Description: " + S(t.desc), amt: "Amount: " + signed(t.amt),
    od: "Orig Date: " + S(t.orig_ts).substring(0, 10), pd: "Proc Date: " + S(t.proc_ts).substring(0, 10), mid: "Merchant ID: " + pad(t.merchant_id, 9),
    mname: "Merchant Name: " + S(t.merchant_name), mcity: "Merchant City: " + S(t.merchant_city), mzip: "Merchant Zip: " + S(t.merchant_zip) };
}

// =====================================================================
// TRANSACTION ADD
// =====================================================================
var TA_K = ["acct", "card", "type", "cat", "src", "desc", "amt", "od", "pd", "mid", "mname", "mcity", "mzip", "conf"];
function taRead() { var r = {}, s = F || {}; for (var i = 0; i < TA_K.length; i++) r[TA_K[i]] = TR(s[TA_K[i]]); return r; }
function taKeys(t) {
  if (t.acct) { if (!/^[0-9]+$/.test(t.acct)) return "Account ID must be Numeric..."; return ""; }
  if (t.card) { if (!/^[0-9]+$/.test(t.card)) return "Card Number must be Numeric..."; return ""; }
  return "Account or Card Number must be entered...";
}
function taData(t) {
  var req = [["type", "Type CD"], ["cat", "Category CD"], ["src", "Source"], ["desc", "Description"], ["amt", "Amount"], ["od", "Orig Date"], ["pd", "Proc Date"],
    ["mid", "Merchant ID"], ["mname", "Merchant Name"], ["mcity", "Merchant City"], ["mzip", "Merchant Zip"]];
  for (var i = 0; i < req.length; i++) if (!t[req[i][0]]) return req[i][1] + " can NOT be empty...";
  if (!/^[0-9]+$/.test(t.type)) return "Type CD must be Numeric...";
  if (!/^[0-9]+$/.test(t.cat)) return "Category CD must be Numeric...";
  if (!/^[-+][0-9]{8}\.[0-9]{2}$/.test(t.amt)) return "Amount should be in format -99999999.99";
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.od)) return "Orig Date should be in format YYYY-MM-DD";
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.pd)) return "Proc Date should be in format YYYY-MM-DD";
  if (!/^[0-9]+$/.test(t.mid)) return "Merchant ID must be Numeric...";
  if (!isDate(t.od)) return "Orig Date - Not a valid date...";
  if (!isDate(t.pd)) return "Proc Date - Not a valid date...";
  return "";
}
function taXref(t, next) {
  if (t.acct) q("card_xref.find", { filter: { acct_id: parseInt(t.acct, 10) }, sort: { card_num: 1 }, limit: 1 });
  else q("card_xref.find", { filter: { card_num: t.card }, limit: 1 });
  cont(next);
}
function taXref1(t) { // returns error text or "" and fills t.acct / t.card from the xref
  var r = rows(0);
  if (r === null) return "Unable to lookup Card Xref...";
  if (r.length === 0) return t.acct ? "Account ID NOT found..." : "Card Number NOT found...";
  t.acct = pad(r[0].acct_id, 11); t.card = S(r[0].card_num);
  return "";
}
function taAdd() {
  var t = taRead(); go("TRANADD"); V.ta = t;
  var m = taKeys(t); if (m) { V.err = m; return; }
  taXref(t, "ta1");
}
function taAdd1() {
  var t = taRead(); go("TRANADD"); V.ta = t;
  var m = taXref1(t); if (m) { V.err = m; return; }
  m = taData(t); if (m) { V.err = m; return; }
  var cf = t.conf.toUpperCase();
  if (cf === "Y") {
    q("transactions.find", { filter: {}, sort: { tran_id: -1 }, limit: 1 });
    cont("ta2", { acct: t.acct, card: t.card }); return;
  }
  if (cf === "" || cf === "N") { V.err = "Confirm to add this transaction..."; return; }
  V.err = "Invalid value. Valid values are (Y/N)...";
}
function taAdd2() {
  var t = taRead(); t.acct = S(CA.acct); t.card = S(CA.card); go("TRANADD"); V.ta = t;
  var r = rows(0); if (r === null) { V.err = "Unable to Add Transaction..."; return; }
  var last = r.length ? parseInt(S(r[0].tran_id), 10) : 0, id = pad((isNaN(last) ? 0 : last) + 1, 16);
  var doc = { tran_id: id, type_cd: pad(t.type, 2), cat_cd: parseInt(t.cat, 10), source: t.src, desc: t.desc, amt: Math.round(parseFloat(t.amt) * 100) / 100,
    merchant_id: parseInt(t.mid, 10), merchant_name: t.mname, merchant_city: t.mcity, merchant_zip: t.mzip, card_num: t.card,
    orig_ts: t.od + " 00:00:00.000000", proc_ts: t.pd + " 00:00:00.000000" };
  q("transactions.insert", { doc: doc });
  cont("ta3", { id: id });
}
function taAdd3() {
  go("TRANADD");
  if (!okr(0)) { V.ta = taRead(); V.err = "Unable to Add Transaction..."; return; }
  V.ta = blankTa();
  V.msg = "Transaction added successfully. Your Tran ID is " + S(CA.id) + ".";
}
function taCopy() {
  var t = taRead(); go("TRANADD"); V.ta = t;
  var m = taKeys(t); if (m) { V.err = m; return; }
  taXref(t, "tc1");
}
function taCopy1() {
  var t = taRead(); go("TRANADD"); V.ta = t;
  var m = taXref1(t); if (m) { V.err = m; return; }
  q("transactions.find", { filter: { card_num: t.card }, sort: { tran_id: -1 }, limit: 1 });
  cont("tc2", { acct: t.acct, card: t.card });
}
function amtField(v) { var n = num(v), a = Math.abs(n).toFixed(2); while (a.length < 11) a = "0" + a; return (n < 0 ? "-" : "+") + a; }
function taCopy2() {
  var t = taRead(); t.acct = S(CA.acct); t.card = S(CA.card); go("TRANADD");
  var r = rows(0);
  if (r === null || r.length === 0) { V.ta = t; V.err = "No previous transaction found for this card..."; return; }
  var x = cp(r[0], TRANF);
  t.type = S(x.type_cd); t.cat = pad(x.cat_cd, 4); t.src = S(x.source); t.desc = S(x.desc); t.amt = amtField(x.amt);
  t.od = S(x.orig_ts).substring(0, 10); t.pd = S(x.proc_ts).substring(0, 10); t.mid = pad(x.merchant_id, 9);
  t.mname = S(x.merchant_name); t.mcity = S(x.merchant_city); t.mzip = S(x.merchant_zip); t.conf = "";
  V.ta = t;
}

// =====================================================================
// REPORT REQUEST
// =====================================================================
function report() {
  var p = { type: UP(F.type), sd: TR(F.sd), ed: TR(F.ed), conf: UP(F.conf) }; go("REPORT"); V.rp = p;
  var name = p.type === "MONTHLY" ? "Monthly" : p.type === "YEARLY" ? "Yearly" : p.type === "CUSTOM" ? "Custom" : "";
  if (!name) { V.err = "Select a report type to print report..."; return; }
  var y = +RT.substring(0, 4), mo = +RT.substring(5, 7), sd, ed;
  if (name === "Monthly") { sd = RT.substring(0, 8) + "01"; ed = RT.substring(0, 8) + pad(lastDay(y, mo), 2); }
  else if (name === "Yearly") { sd = y + "-01-01"; ed = y + "-12-31"; }
  else {
    if (!p.sd) { V.err = "Start Date can NOT be empty..."; return; }
    if (!p.ed) { V.err = "End Date can NOT be empty..."; return; }
    if (!isDate(p.sd)) { V.err = "Start Date - Not a valid date..."; return; }
    if (!isDate(p.ed)) { V.err = "End Date - Not a valid date..."; return; }
    if (p.ed < p.sd) { V.err = "Start Date should not be later than End Date..."; return; }
    sd = p.sd; ed = p.ed;
  }
  if (p.conf === "") { V.err = "Please confirm to print the " + name + " report..."; return; }
  if (p.conf === "N") { V.rp = blankRp(); return; }
  if (p.conf !== "Y") { V.err = "Invalid value. Valid values are (Y/N)..."; return; }
  q("job_requests.insert", { doc: { start_date: sd, end_date: ed } });
  cont("rp1", { name: name });
}
function report1() {
  go("REPORT");
  if (!okr(0)) { V.rp = { type: UP(F.type), sd: TR(F.sd), ed: TR(F.ed), conf: UP(F.conf) }; V.err = "Unable to submit the report request..."; return; }
  V.rp = blankRp();
  V.msg = S(CA.name) + " report submitted for printing ...";
}

// =====================================================================
// BILL PAYMENT
// =====================================================================
function billPay() {
  var b = { acct: TR(F.acct), bal: "", conf: UP(F.conf) }; go("BILLPAY"); V.bp = b;
  if (!b.acct) { V.err = "Acct ID can NOT be empty..."; return; }
  if (!/^[0-9]+$/.test(b.acct)) { V.err = "Account ID NOT found..."; return; }
  q("accounts.find", { filter: { acct_id: parseInt(b.acct, 10) }, limit: 1 });
  q("card_xref.find", { filter: { acct_id: parseInt(b.acct, 10) }, sort: { card_num: 1 }, limit: 1 });
  cont("bp1");
}
function billPay1() {
  var b = { acct: TR(F.acct), bal: "", conf: UP(F.conf) }; go("BILLPAY"); V.bp = b;
  var ra = rows(0), rx = rows(1);
  if (ra === null || rx === null) { V.err = "Unable to lookup Account..."; return; }
  if (ra.length === 0 || rx.length === 0) { V.err = "Account ID NOT found..."; return; }
  var a = cp(ra[0], ACCTF), bal = num(a.curr_bal);
  b.bal = money(bal);
  if (bal <= 0) { b.conf = ""; V.err = "You have nothing to pay..."; return; }
  if (b.conf === "") { V.err = "Confirm to make a bill payment..."; return; }
  if (b.conf === "N") { V.bp = blankBp(); return; }
  if (b.conf !== "Y") { V.err = "Invalid value. Valid values are (Y/N)..."; return; }
  q("transactions.find", { filter: {}, sort: { tran_id: -1 }, limit: 1 });
  cont("bp2", { a: a, card: S(rx[0].card_num) });
}
function billPay2() {
  var b = { acct: TR(F.acct), bal: "", conf: UP(F.conf) }; go("BILLPAY"); V.bp = b;
  var a = cp(CA.a, ACCTF), bal = num(a.curr_bal), r = rows(0);
  b.bal = money(bal);
  if (r === null) { V.err = "Unable to Add Bill pay Transaction..."; return; }
  var last = r.length ? parseInt(S(r[0].tran_id), 10) : 0, id = pad((isNaN(last) ? 0 : last) + 1, 16), ts = RT + ".000000";
  q("transactions.insert", { doc: { tran_id: id, type_cd: "02", cat_cd: 2, source: "POS TERM", desc: "BILL PAYMENT - ONLINE", amt: Math.round(bal * 100) / 100,
    merchant_id: 999999999, merchant_name: "BILL PAYMENT", merchant_city: "N/A", merchant_zip: "N/A", card_num: S(CA.card), orig_ts: ts, proc_ts: ts } });
  q("accounts.update", { filter: { acct_id: num(a.acct_id) }, update: { "$set": { curr_bal: Math.round((bal - Math.round(bal * 100) / 100) * 100) / 100 } } });
  cont("bp3", { id: id, a: a });
}
function billPay3() {
  go("BILLPAY");
  if (!okr(0) || !okr(1)) { V.bp = { acct: TR(F.acct), bal: money(num(CA.a ? CA.a.curr_bal : 0)), conf: "" }; V.err = "Unable to Add Bill pay Transaction..."; return; }
  V.bp = { acct: TR(F.acct), bal: money(0), conf: "" };
  V.msg = "Payment successful. Your Transaction ID is " + S(CA.id) + ".";
}

// =====================================================================
// USER ADMINISTRATION (admin only)
// =====================================================================
function ulRead(src) {
  var r = blankUl(); src = src || {};
  r.uid = UP(src.uid); r.first = S(src.first); r.last = S(src.last); r.page = num(src.page);
  for (var i = 0; i < 10; i++) {
    r["s" + i] = UP(src["s" + i]); var x = src["r" + i] || {};
    r["r" + i] = { show: S(x.show), uid: S(x.uid), fname: S(x.fname), lname: S(x.lname), utype: S(x.utype) };
  }
  return r;
}
function ulSearch(ul, dir) {
  go("USERLIST");
  var f = {};
  if (dir === "first") { if (ul.uid) f.usr_id = { "$gte": ul.uid }; }
  else if (dir === "next") f.usr_id = { "$gt": ul.last };
  else { if (ul.page <= 1) { V.ul = ul; V.err = "You are already at the top of the page..."; return; } f.usr_id = { "$lt": ul.first }; }
  q("users.find", { filter: f, sort: { usr_id: dir === "prev" ? -1 : 1 }, limit: 10 });
  cont("ul1", { dir: dir, uid: ul.uid, page: ul.page });
}
function ulSearch1() {
  var dir = S(CA.dir), r = rows(0), ul = ulRead(F); go("USERLIST");
  if (dir === "first") { ul = blankUl(); ul.uid = S(CA.uid); }
  if (r === null) { V.ul = ul; V.err = "Unable to lookup User..."; return; }
  if (r.length === 0) {
    V.ul = ul;
    V.err = dir === "prev" ? "You are already at the top of the page..." : "You are already at the bottom of the page...";
    return;
  }
  if (dir === "prev") r.reverse();
  var o = blankUl(); o.uid = S(CA.uid);
  for (var i = 0; i < r.length; i++) o["r" + i] = { show: "Y", uid: S(r[i].usr_id), fname: S(r[i].first_name), lname: S(r[i].last_name), utype: S(r[i].usr_type) };
  o.first = S(r[0].usr_id); o.last = S(r[r.length - 1].usr_id);
  o.page = dir === "first" ? 1 : dir === "next" ? num(CA.page) + 1 : Math.max(1, num(CA.page) - 1);
  V.ul = o;
}
function ulEnter() {
  var ul = ulRead(F), sel = -1;
  for (var i = 0; i < 10; i++) if (ul["s" + i] && ul["r" + i].show === "Y") { sel = i; break; }
  if (sel >= 0) {
    var code = ul["s" + sel];
    if (code !== "U" && code !== "D") { V.ul = ul; V.err = "Invalid selection. Valid values are U and D"; go("USERLIST"); return; }
    var uid = ul["r" + sel].uid; ul["s" + sel] = ""; V.ul = ul;
    userFetch(uid, code === "U" ? "upd" : "del", "USERLIST"); return;
  }
  ulSearch(ul, "first");
}
function userFetch(uid, mode, from) { q("users.find", { filter: { usr_id: uid }, limit: 1 }); cont("uf1", { uid: uid, mode: mode, from: from }); }
function userFetch1() {
  var uid = S(CA.uid), mode = S(CA.mode), from = S(CA.from) || "ADMIN", r = rows(0);
  go(mode === "upd" ? "USERUPD" : "USERDEL");
  var blank = mode === "upd" ? { uid: uid, fname: "", lname: "", pwd: "", utype: "", loaded: "", from: from } : { uid: uid, fname: "", lname: "", utype: "", loaded: "", from: from };
  if (r === null) { if (mode === "upd") V.uu = blank; else V.ud = blank; V.err = "Unable to lookup User..."; return; }
  if (r.length === 0) { if (mode === "upd") V.uu = blank; else V.ud = blank; V.err = "User ID NOT found..."; return; }
  var u = r[0];
  if (mode === "upd") { V.uu = { uid: uid, fname: S(u.first_name), lname: S(u.last_name), pwd: "", utype: S(u.usr_type), loaded: "Y", from: from }; }
  else { V.ud = { uid: uid, fname: S(u.first_name), lname: S(u.last_name), utype: S(u.usr_type), loaded: "Y", from: from }; V.msg = "Press F5 to confirm deletion"; }
}
function uaAdd() {
  var u = { fname: TR(F.fname), lname: TR(F.lname), uid: UP(F.uid), pwd: UP(F.pwd), utype: UP(F.utype) }; go("USERADD");
  V.ua = { fname: u.fname, lname: u.lname, uid: u.uid, pwd: "", utype: u.utype };
  if (!u.fname) { V.err = "First Name can NOT be empty..."; return; }
  if (!u.lname) { V.err = "Last Name can NOT be empty..."; return; }
  if (!u.uid) { V.err = "User ID can NOT be empty..."; return; }
  if (!u.pwd) { V.err = "Password can NOT be empty..."; return; }
  if (!u.utype) { V.err = "User Type can NOT be empty..."; return; }
  if (u.utype !== "A" && u.utype !== "U") { V.err = "User Type must be A or U..."; return; }
  V.ua.pwd = u.pwd;
  q("users.find", { filter: { usr_id: u.uid.substring(0, 8) }, limit: 1 });
  cont("ua1");
}
function uaAdd1() {
  var u = { fname: TR(F.fname).substring(0, 20), lname: TR(F.lname).substring(0, 20), uid: UP(F.uid).substring(0, 8), pwd: UP(F.pwd).substring(0, 8), utype: UP(F.utype) };
  go("USERADD"); V.ua = { fname: u.fname, lname: u.lname, uid: u.uid, pwd: "", utype: u.utype };
  var r = rows(0); if (r === null) { V.err = "Unable to Add User..."; return; }
  if (r.length > 0) { V.err = "User ID already exist..."; return; }
  q("users.insert", { doc: { usr_id: u.uid, first_name: u.fname, last_name: u.lname, pwd: u.pwd, usr_type: u.utype } });
  cont("ua2", { uid: u.uid });
}
function uaAdd2() {
  go("USERADD");
  if (!okr(0)) { V.ua = { fname: TR(F.fname), lname: TR(F.lname), uid: UP(F.uid), pwd: "", utype: UP(F.utype) }; V.err = "Unable to Add User..."; return; }
  V.ua = blankUa(); V.msg = "User " + S(CA.uid) + " has been added ...";
}
function uuGet() {
  var uid = UP(F.uid), from = S(F.from) || "ADMIN"; go("USERUPD");
  V.uu = { uid: uid, fname: "", lname: "", pwd: "", utype: "", loaded: "", from: from };
  if (!uid) { V.err = "User ID can NOT be empty..."; return; }
  userFetch(uid, "upd", from);
}
function uuSave() {
  var u = { uid: UP(F.uid), fname: TR(F.fname).substring(0, 20), lname: TR(F.lname).substring(0, 20), pwd: UP(F.pwd).substring(0, 8), utype: UP(F.utype), from: S(F.from) || "ADMIN" };
  go("USERUPD"); V.uu = { uid: u.uid, fname: u.fname, lname: u.lname, pwd: "", utype: u.utype, loaded: "Y", from: u.from };
  if (!u.uid) { V.err = "User ID can NOT be empty..."; return; }
  if (!u.fname) { V.err = "First Name can NOT be empty..."; return; }
  if (!u.lname) { V.err = "Last Name can NOT be empty..."; return; }
  if (!u.utype) { V.err = "User Type can NOT be empty..."; return; }
  if (u.utype !== "A" && u.utype !== "U") { V.err = "User Type must be A or U..."; return; }
  q("users.find", { filter: { usr_id: u.uid }, limit: 1 });
  cont("uu1");
}
function uuSave1() {
  var u = { uid: UP(F.uid), fname: TR(F.fname).substring(0, 20), lname: TR(F.lname).substring(0, 20), pwd: UP(F.pwd).substring(0, 8), utype: UP(F.utype), from: S(F.from) || "ADMIN" };
  go("USERUPD"); V.uu = { uid: u.uid, fname: u.fname, lname: u.lname, pwd: "", utype: u.utype, loaded: "Y", from: u.from };
  var r = rows(0); if (r === null) { V.err = "Unable to Update User..."; return; }
  if (r.length === 0) { V.err = "User ID NOT found..."; return; }
  var cur = r[0], set = {}, n = 0;
  if (u.fname !== S(cur.first_name)) { set.first_name = u.fname; n++; }
  if (u.lname !== S(cur.last_name)) { set.last_name = u.lname; n++; }
  if (u.pwd && u.pwd !== S(cur.pwd)) { set.pwd = u.pwd; n++; }
  if (u.utype !== S(cur.usr_type)) { set.usr_type = u.utype; n++; }
  if (n === 0) { V.err = "Please modify to update ..."; return; }
  q("users.update", { filter: { usr_id: u.uid }, update: { "$set": set } });
  cont("uu2");
}
function uuSave2() {
  go("USERUPD");
  V.uu = { uid: UP(F.uid), fname: TR(F.fname), lname: TR(F.lname), pwd: "", utype: UP(F.utype), loaded: "Y", from: S(F.from) || "ADMIN" };
  if (!okr(0)) { V.err = "Unable to Update User..."; return; }
  V.msg = "User " + UP(F.uid) + " has been updated ...";
}
function udGet() {
  var uid = UP(F.uid), from = S(F.from) || "ADMIN"; go("USERDEL");
  V.ud = { uid: uid, fname: "", lname: "", utype: "", loaded: "", from: from };
  if (!uid) { V.err = "User ID can NOT be empty..."; return; }
  userFetch(uid, "del", from);
}
function udDel() {
  var uid = UP(F.uid), from = S(F.from) || "ADMIN"; go("USERDEL");
  V.ud = { uid: uid, fname: TR(F.fname), lname: TR(F.lname), utype: TR(F.utype), loaded: S(F.loaded), from: from };
  if (!uid) { V.err = "User ID can NOT be empty..."; return; }
  q("users.find", { filter: { usr_id: uid }, limit: 1 });
  cont("ud1");
}
function udDel1() {
  var uid = UP(F.uid), from = S(F.from) || "ADMIN"; go("USERDEL");
  V.ud = { uid: uid, fname: TR(F.fname), lname: TR(F.lname), utype: TR(F.utype), loaded: S(F.loaded), from: from };
  var r = rows(0); if (r === null) { V.err = "Unable to lookup User..."; return; }
  if (r.length === 0) { V.err = "User ID NOT found..."; return; }
  q("users.delete", { filter: { usr_id: uid } });
  cont("ud2");
}
function udDel2() {
  go("USERDEL");
  if (!okr(0)) { V.ud = { uid: UP(F.uid), fname: TR(F.fname), lname: TR(F.lname), utype: TR(F.utype), loaded: "Y", from: S(F.from) || "ADMIN" }; V.err = "Unable to Update User..."; return; }
  V.ud = blankUd(); V.msg = "User " + UP(F.uid) + " has been deleted ...";
}

// =====================================================================
// BACK navigation (returns to a list and refreshes it, or to a menu)
// =====================================================================
function back() {
  var to = S(F.to) || (S(SE.utype) === "A" ? "ADMIN" : "MENU");
  if (to === "CARDLIST") { var cl = clRead(F.cl); clSearch(cl, "first"); return; }
  if (to === "TRANLIST") { var tl = tlRead(F.tl); tlSearch(tl, "first"); return; }
  if (to === "USERLIST") { var ul = ulRead(F.ul); ulSearch(ul, "first"); return; }
  go(to);
}

// =====================================================================
// dispatch
// =====================================================================
var CONT = { so1: signon1, af1: acctFetch1, af2: acctFetch2, aus1: auSave1, aus2: auSave2, cl1: clSearch1, cf1: cardFetch1, cus1: cuSave1, cus2: cuSave2,
  tl1: tlSearch1, tv1: tranFetch1, ta1: taAdd1, ta2: taAdd2, ta3: taAdd3, tc1: taCopy1, tc2: taCopy2, rp1: report1, bp1: billPay1, bp2: billPay2, bp3: billPay3,
  ul1: ulSearch1, uf1: userFetch1, ua1: uaAdd1, ua2: uaAdd2, uu1: uuSave1, uu2: uuSave2, ud1: udDel1, ud2: udDel2 };
var ACT = { signon: signon, menu: menu, admin: adminMenu, acctview: acctView, auget: auGet, auval: auVal, aucancel: auCancel, ausave: auSave,
  clenter: clEnter, clnext: function () { clSearch(clRead(F), "next"); }, clprev: function () { clSearch(clRead(F), "prev"); },
  cardview: cardView, cuget: cuGet, cuval: cuVal, cucancel: cuCancel, cusave: cuSave,
  tlenter: tlEnter, tlnext: function () { tlSearch(tlRead(F), "next"); }, tlprev: function () { tlSearch(tlRead(F), "prev"); },
  tranview: tranView, taadd: taAdd, tacopy: taCopy, report: report, billpay: billPay,
  ulenter: ulEnter, ulnext: function () { ulSearch(ulRead(F), "next"); }, ulprev: function () { ulSearch(ulRead(F), "prev"); },
  uaadd: uaAdd, uuget: uuGet, uusave: uuSave, udget: udGet, uddel: udDel, back: back };
var ADMIN_ONLY = { admin: 1, ulenter: 1, ulnext: 1, ulprev: 1, uaadd: 1, uuget: 1, uusave: 1, udget: 1, uddel: 1 };

if (PH) {
  if (CONT[PH]) CONT[PH](); else { V.err = "Unexpected state " + PH; }
} else if (T !== "signon" && !S(SE.uid)) {
  go("SIGNON"); V.err = "Please sign on to continue ...";
} else if (ADMIN_ONLY[T] && !needAdmin()) {
  // refused
} else if (ACT[T]) {
  ACT[T]();
} else {
  V.err = "Invalid action " + T;
}
if (OPS.length === 0) { // a row that was opened from a list: clear its selection code in the list state
  var si;
  if (T === "clenter" && !V.cl) { var c0 = clRead(F); for (si = 0; si < 7; si++) c0["s" + si] = ""; V.cl = c0; }
  if (T === "tlenter" && !V.tl) { var t0 = tlRead(F); for (si = 0; si < 10; si++) t0["s" + si] = ""; V.tl = t0; }
  if (T === "ulenter" && !V.ul) { var u0 = ulRead(F); for (si = 0; si < 10; si++) u0["s" + si] = ""; V.ul = u0; }
}
output.ops = OPS;
output.phase = NEXT;
output.carry = CARRY;
if (OPS.length === 0) output.view = V;
