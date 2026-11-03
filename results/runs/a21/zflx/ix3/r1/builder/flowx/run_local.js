// Local harness: runs the three workflow SCRIPT nodes in order, the way the FlowX workflow chains
// them (each node sees the accumulated state as `input`, writes `output`).
// usage: node run_local.js <inputDir> <outDir> [startDate] [endDate]
const fs = require('fs');
const path = require('path');

const [inDir, outDir, startDate = '2022-07-01', endDate = '2022-07-31'] = process.argv.slice(2);
const read = (f) => fs.readFileSync(path.join(inDir, f), 'utf8');

let state = {
  transact: read('transact.dat'),
  cardxref: read('cardxref.dat'),
  trantype: read('trantype.dat'),
  trancatg: read('trancatg.dat'),
  startDate, endDate,
};

for (const f of ['01_select_transactions.js', '02_enrich_lines.js', '03_build_report.js']) {
  const src = fs.readFileSync(path.join(__dirname, 'scripts', f), 'utf8');
  const input = JSON.parse(JSON.stringify(state));
  const output = {};
  new Function('input', 'output', src)(input, output);
  state = { ...state, ...output };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'tranrept_report.txt'), state.tranrept_report.join('\n') + '\n');
console.log(JSON.stringify({ lineCount: state.lineCount, grandTotal: state.grandTotal,
  referenceErrors: state.referenceErrors, stats: state.selectionStats }, null, 1));
