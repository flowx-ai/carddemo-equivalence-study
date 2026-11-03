// FlowX SCRIPT node "Build Run Summary" (end-of-job DISPLAY + RETURN-CODE in CBTRN02C)
// Also assembles the workflow result returned by the END node.
var read = Number(input.readCount || 0);
var postedN = Number(input.postedCount || 0);
var rejectedN = Number(input.rejectedCount || 0);
var dupN = Number(input.duplicateCount || 0);
var summary = {
  batchId: input.batchId == null ? null : String(input.batchId),
  businessDate: input.businessDate == null ? null : String(input.businessDate),
  transactionsProcessed: read,
  transactionsPosted: postedN,
  transactionsRejected: rejectedN,
  duplicatesSkipped: dupN,
  countsReconcile: read === postedN + rejectedN + dupN,
  status: rejectedN > 0 ? 'WARNING' : 'COMPLETED',   // BR-07
  returnCode: rejectedN > 0 ? 4 : 0
};
output.runSummary = summary;
output.result = {
  runSummary: summary,
  parseWarnings: input.parseWarnings,
  posttran_transact: input.posttran_transact,
  posttran_dalyrejs: input.posttran_dalyrejs,
  posttran_acctdata: input.posttran_acctdata,
  posttran_tcatbal: input.posttran_tcatbal
};
