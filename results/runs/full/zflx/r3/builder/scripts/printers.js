// CBACT02C / CBACT03C / CBCUS01C - file print steps. STEP is set per workflow:
// var P = { prog: "CBACT02C", step: "cardprint", input: "carddata", err: "ERROR OPENING CARDFILE", width: 150 };
var sysout = ["START OF EXECUTION OF PROGRAM " + P.prog];
var rc = openAll([[P.input, P.err]], sysout);
if (!rc) {
  var ll = lines(getIn(P.input));
  for (var i = 0; i < ll.length; i++) sysout.push(rs(pad(ll[i], P.width)));
  sysout.push("END OF EXECUTION OF PROGRAM " + P.prog);
}
finish(P.step, sysout, rc);
