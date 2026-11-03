// ---- helpers shared by the seven added steps (appended after batch_common.js) ----
// openAll: legacy programs OPEN every file first and abend (U999) when one cannot be opened.
// files: [[inputBaseName, "LEGACY OPEN ERROR TEXT"], ...]; returns null when all present, else the abend sysout lines.
function openAll(files, sysout) {
  for (var i = 0; i < files.length; i++) {
    if (getIn(files[i][0]) === null) {
      sysout.push(files[i][1]);
      sysout.push("FILE STATUS IS: NNNN0035");
      sysout.push("ABENDING PROGRAM");
      return 999;
    }
  }
  return 0;
}
var R = {};
function finish(step, sysout, rc) {
  R[step + "_sysout"] = sysout;
  if (rc) R[step + "_rc"] = rc;
  output.result = R;
}
// ---- end added helpers ----
