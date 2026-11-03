// POSTTRAN (CBTRN02C) - daily transaction posting
var procTs = db2ts(RT);
var accts = lines(getIn("acctdata")).map(parseAcct), acctMap = {};
for (var i = 0; i < accts.length; i++) acctMap[accts[i].acct_id] = accts[i];
var xrefMap = {}, xl = lines(getIn("cardxref"));
for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.card_num in xrefMap)) xrefMap[x.card_num] = x; }
var tcat = [], tcatMap = {}, tl = lines(getIn("tcatbal"));
for (var i = 0; i < tl.length; i++) {
  var l = pad(tl[i], 50); var r = { acct_id: num(l.substr(0, 11)), type_cd: rs(l.substr(11, 2)), cat_cd: num(l.substr(13, 4)), bal: zoned(l.substr(17, 11)) };
  var k = r.acct_id + "|" + r.type_cd + "|" + r.cat_cd; if (!(k in tcatMap)) { tcatMap[k] = r; tcat.push(r); }
}
var daily = lines(getIn("dailytran")).map(parseTran);
var posted = [], rejects = [], sysout = ["START OF EXECUTION OF PROGRAM CBTRN02C"];
for (var i = 0; i < daily.length; i++) {
  var t = daily[i], reason = 0, rdesc = "", x = xrefMap[t.card_num], a = null;
  if (!x) { reason = 100; rdesc = "INVALID CARD NUMBER FOUND"; }
  else {
    a = acctMap[x.acct_id];
    if (!a) { reason = 101; rdesc = "ACCOUNT RECORD NOT FOUND"; }
    else {
      var temp = a.cred - a.deb + t.amtc;
      if (!(a.lim >= temp)) { reason = 102; rdesc = "OVERLIMIT TRANSACTION"; }
      if (!(a.expiration_date >= t.orig_ts.substring(0, 10))) { reason = 103; rdesc = "TRANSACTION RECEIVED AFTER ACCT EXPIRATION"; }
    }
  }
  if (reason === 0) {
    var p = tranOut(t); p.proc_ts = procTs; posted.push(p);
    var k = x.acct_id + "|" + t.type_cd + "|" + t.cat_cd;
    if (k in tcatMap) tcatMap[k].bal += t.amtc;
    else { var nr = { acct_id: x.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, bal: t.amtc }; tcatMap[k] = nr; tcat.push(nr); }
    a.bal += t.amtc;
    if (t.amtc >= 0) a.cred += t.amtc; else a.deb += t.amtc;
  } else {
    var rj = tranOut(t); rj.reason = reason; rj.reason_desc = rdesc; rejects.push(rj);
  }
}
sysout.push("TRANSACTIONS PROCESSED :" + lpad(daily.length, 9));
sysout.push("TRANSACTIONS REJECTED  :" + lpad(rejects.length, 9));
sysout.push("END OF EXECUTION OF PROGRAM CBTRN02C");
output.posttran_transact = posted;
output.posttran_dalyrejs = rejects;
output.posttran_acctdata = accts.map(acctOut);
output.posttran_tcatbal = tcat.map(function (r) { return { acct_id: r.acct_id, type_cd: r.type_cd, cat_cd: r.cat_cd, bal: amt(r.bal) }; });
output.posttran_sysout = sysout;
output.posttran_rc = rejects.length > 0 ? 4 : 0;
output.status = rejects.length > 0 ? "WARNING" : "COMPLETED";
