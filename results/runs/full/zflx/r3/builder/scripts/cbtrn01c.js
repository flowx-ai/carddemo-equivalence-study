// CBTRN01C - daily transaction check (validates card -> xref -> account, writes nothing but the log)
var sysout = ["START OF EXECUTION OF PROGRAM CBTRN01C"];
var rc = openAll([["dailytran", "ERROR OPENING DAILY TRANSACTION FILE"], ["cardxref", "ERROR OPENING CROSS REF FILE"],
  ["acctdata", "ERROR OPENING ACCOUNT FILE"]], sysout);
if (!rc) {
  var xrefMap = {}, xl = lines(getIn("cardxref"));
  for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.card_num in xrefMap)) xrefMap[x.card_num] = x; }
  var acctMap = {}, al = lines(getIn("acctdata"));
  for (var i = 0; i < al.length; i++) { var a = parseAcct(al[i]); if (!(a.acct_id in acctMap)) acctMap[a.acct_id] = a; }
  var dl = lines(getIn("dailytran"));
  for (var i = 0; i < dl.length; i++) {
    var t = parseTran(dl[i]);
    sysout.push(rs(t.raw));
    var x = xrefMap[t.card_num];
    if (x) {
      sysout.push("SUCCESSFUL READ OF XREF");
      sysout.push("CARD NUMBER: " + pad(x.card_num, 16));
      sysout.push("ACCOUNT ID : " + lpad(x.acct_id, 11));
      sysout.push("CUSTOMER ID: " + lpad(x.cust_id, 9));
      if (acctMap[x.acct_id]) sysout.push("SUCCESSFUL READ OF ACCOUNT FILE");
      else { sysout.push("INVALID ACCOUNT NUMBER FOUND"); sysout.push("ACCOUNT " + lpad(x.acct_id, 11) + " NOT FOUND"); }
    } else {
      sysout.push("INVALID CARD NUMBER FOR XREF");
      sysout.push("CARD NUMBER " + pad(t.card_num, 16) + " COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-" + pad(t.tran_id, 16));
    }
  }
  sysout.push("END OF EXECUTION OF PROGRAM CBTRN01C");
}
finish("dailycheck", sysout, rc);
