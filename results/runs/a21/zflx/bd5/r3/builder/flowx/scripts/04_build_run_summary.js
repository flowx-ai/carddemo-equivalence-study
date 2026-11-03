// CREASTMT / statement-generation (P-17) - node "Build run summary".
// Reports what the run produced and drops the intermediate StatementData.
var stats = JSON.parse(input.buildStats);
output.statementCount = stats.statements;
output.runSummary = 'statements=' + stats.statements
  + ' transactionLines=' + stats.statementLines
  + ' xrefRecords=' + stats.xrefRecords
  + ' transactionRecords=' + stats.transactionRecords
  + ' accountRecords=' + stats.accountRecords
  + ' customerRecords=' + stats.customerRecords
  + ' skippedCards=' + stats.skippedCards.length
  + (stats.skippedCards.length ? ' [' + stats.skippedCards.join('; ') + ']' : '');
output.statementDataJson = null;
