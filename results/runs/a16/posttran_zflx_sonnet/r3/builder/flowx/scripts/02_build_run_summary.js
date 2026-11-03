// "Build Run Summary" (end-of-job DISPLAY of CBTRN02C). BR-07: WARNING / RC 4 when any reject exists.
var c = input.counts;
var rejected = c ? c.rejected : 0;
output.runSummary = {
  batchId: input.batchId ? String(input.batchId) : null,
  businessDate: input.businessDate ? String(input.businessDate) : null,
  transactionsProcessed: c ? c.read : 0,
  transactionsPosted: c ? c.posted : 0,
  transactionsRejected: rejected,
  duplicatesSkipped: c ? c.skippedDuplicates : 0,
  status: rejected > 0 ? 'WARNING' : 'COMPLETED',
  returnCode: rejected > 0 ? 4 : 0
};
// Drop the raw feed/master images from the run state once posted.
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;
