// CBEXPORT - customer data export: C (customers), A (accounts), X (xref), T (transactions), D (cards)
var sysout = ["CBEXPORT: Starting Customer Data Export"], recs = [];
var rc = openAll([["custdata", "CBEXPORT: Error opening customer file"], ["acctdata", "CBEXPORT: Error opening account file"],
  ["cardxref", "CBEXPORT: Error opening cross reference file"], ["transact", "CBEXPORT: Error opening transaction file"],
  ["carddata", "CBEXPORT: Error opening card file"]], sysout);
if (!rc) {
  var stamp = RT.substring(0, 19) + ".00", seq = 0, counts = { C: 0, A: 0, X: 0, T: 0, D: 0 };
  function emit(type, fields) {
    seq++; counts[type]++;
    var r = { rec_type: type, seq: seq, branch_id: "0001", region_code: "NORTH" };
    for (var k in fields) r[k] = fields[k];
    r.timestamp = stamp; recs.push(r);
  }
  sysout.push("CBEXPORT: Export Date: " + RT.substring(0, 10));
  sysout.push("CBEXPORT: Export Time: " + RT.substring(11, 19));
  lines(getIn("custdata")).forEach(function (l) { var c = strip(parseCust(l)); c.ssn = null; emit("C", c); }); // BR-04: SSN excluded
  sysout.push("CBEXPORT: Customers exported: " + counts.C);
  lines(getIn("acctdata")).forEach(function (l) { emit("A", acctOut(parseAcct(l))); });
  sysout.push("CBEXPORT: Accounts exported: " + counts.A);
  lines(getIn("cardxref")).forEach(function (l) { emit("X", strip(parseXref(l))); });
  sysout.push("CBEXPORT: Cross-references exported: " + counts.X);
  lines(getIn("transact")).forEach(function (l) { emit("T", tranOut(parseTran(l))); });
  sysout.push("CBEXPORT: Transactions exported: " + counts.T);
  lines(getIn("carddata")).forEach(function (l) { emit("D", strip(parseCard(l))); });
  sysout.push("CBEXPORT: Cards exported: " + counts.D);
  sysout.push("CBEXPORT: Export completed");
  sysout.push("CBEXPORT: Total Records Exported: " + seq);
}
R.export = recs;
finish("export", sysout, rc);
