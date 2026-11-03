// statement-generation (P-17) / CREASTMT — node "Build Run Summary"
// Status handed back to end-of-day-batch-chain (Call Activity OUTPUT: status, processedCount).
var sts = input.statementData || [];
output.statementCount = sts.length;
output.processedCount = sts.length;
output.status = input.runStatus === 'OK' ? 'COMPLETED' : 'FAILED';
// the per-statement detail is not part of the contract; drop it from the returned state
output.statementData = null;
