// Node "Build Run Summary" — batch-operator summary of the run (process flow: Build Run Summary).

var info = JSON.parse(String(input.buildInfoJson));
info.status = info.skippedCards.length > 0 || info.parseWarnings.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'OK';
info.textLines = input.creastmt_statements ? String(input.creastmt_statements).split('\n').length : 0;
info.htmlLines = input.creastmt_statements_html ? String(input.creastmt_statements_html).split('\n').length : 0;

output.runSummary = JSON.stringify(info);
output.statementDataJson = null;
output.buildInfoJson = null;
