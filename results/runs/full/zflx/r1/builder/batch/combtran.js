// COMBTRAN (DFSORT + IDCAMS REPRO) — wiki process combine transactions
function main() {
  var A = req('transact.dat'), B = req('systran.dat');
  if (missing.length) { abend('combtran'); return; }
  var all = A.concat(B).map(parseTran);
  all.sort(function (p, q) { return p.tran_id < q.tran_id ? -1 : p.tran_id > q.tran_id ? 1 : 0; });
  var dups = [];
  for (var i = 1; i < all.length; i++) if (all[i].tran_id === all[i - 1].tran_id) dups.push(all[i].tran_id);
  var log = ['RECORDS READ FROM TRANSACT BACKUP : ' + A.length, 'RECORDS READ FROM SYSTRAN         : ' + B.length];
  if (dups.length) {
    log.push('DUPLICATE TRANSACTION ID(S): ' + dups.join(', '));
    log.push('REPRO FAILED - DUPLICATE KEY');
    output.combtran_rc = '12';
    output.combtran_sysout = log;
    return;
  }
  log.push('RECORDS WRITTEN TO TRANSACT       : ' + all.length);
  output.combtran_transact = all.map(tranOut);
  output.combtran_sysout = log;
}
main();
