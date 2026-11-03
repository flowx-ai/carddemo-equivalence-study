// INTCALC (CBACT04C) - interest calculation
var parm = input.parm ? String(input.parm) : (RT.substring(0, 4) + RT.substring(5, 7) + RT.substring(8, 10) + "00");
var ts = db2ts(RT);
var accts = lines(getIn("acctdata")).map(parseAcct), acctMap = {};
for (var i = 0; i < accts.length; i++) acctMap[accts[i].acct_id] = accts[i];
var xrefByAcct = {}, xl = lines(getIn("cardxref"));
for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.acct_id in xrefByAcct)) xrefByAcct[x.acct_id] = x; }
var disc = {}, dl = lines(getIn("discgrp"));
for (var i = 0; i < dl.length; i++) { var l = pad(dl[i], 50); var k = rs(l.substr(0, 10)) + "|" + rs(l.substr(10, 2)) + "|" + num(l.substr(12, 4)); if (!(k in disc)) disc[k] = zoned(l.substr(16, 6)); }
var tl = lines(getIn("tcatbal"));
var systran = [], suffix = 0, lastAcct = null, total = 0, sysout = ["START OF EXECUTION OF PROGRAM CBACT04C"];
function updateAccount(id, tot) { var a = acctMap[id]; if (!a) return; a.bal += tot; a.cred = 0; a.deb = 0; }
for (var i = 0; i < tl.length; i++) {
  var l = pad(tl[i], 50);
  var acctId = num(l.substr(0, 11)), type = rs(l.substr(11, 2)), cat = num(l.substr(13, 4)), bal = zoned(l.substr(17, 11));
  sysout.push(l);
  if (acctId !== lastAcct) {
    if (lastAcct !== null) updateAccount(lastAcct, total);
    total = 0; lastAcct = acctId;
    if (!acctMap[acctId]) sysout.push("ACCOUNT NOT FOUND: " + lpad(acctId, 11));
  }
  var a = acctMap[acctId]; if (!a) continue;
  var grp = a.group_id, rate = disc[grp + "|" + type + "|" + cat];
  if (rate === undefined) rate = disc["DEFAULT|" + type + "|" + cat];
  if (rate === undefined) rate = 0;
  if (rate !== 0) {
    var prod = bal * rate, mag = Math.floor(Math.abs(prod) / 120000), interest = prod < 0 ? -mag : mag; // (bal x rate)/1200, truncated to cents
    total += interest; suffix++;
    var xr = xrefByAcct[acctId];
    systran.push({ tran_id: parm + lpad(suffix, 6), type_cd: "01", cat_cd: 5, source: "System", desc: "Int. for a/c " + lpad(acctId, 11),
      amt: amt(interest), merchant_id: 0, merchant_name: "", merchant_city: "", merchant_zip: "", card_num: xr ? xr.card_num : "", orig_ts: ts, proc_ts: ts });
  }
}
if (lastAcct !== null) updateAccount(lastAcct, total);
sysout.push("END OF EXECUTION OF PROGRAM CBACT04C");
output.intcalc_systran = systran;
output.intcalc_acctdata = accts.map(acctOut);
output.intcalc_sysout = sysout;
