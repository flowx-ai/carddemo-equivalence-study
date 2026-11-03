// Local runner: node run_local.js <inputDir> <outputDir> [parmDate] [businessDate]
// Runs the same core as the FlowX SCRIPT node and writes accrue_systxn.json / accrue_ledgacc.json.
var fs = require('fs'), path = require('path');
var core = require('./accrue_core.js');
var inDir = process.argv[2], outDir = process.argv[3] || '.';
function rd(n) { var p = path.join(inDir, n); return fs.existsSync(p) ? fs.readFileSync(p, 'latin1') : ''; }
var res = core.ledgerlineAccrue(
  { ledgacc: rd('ledgacc.dat'), cardlink: rd('cardlink.dat'), balcat: rd('balcat.dat'), rategrp: rd('rategrp.dat') },
  { parmDate: process.argv[4] || '2022071800', businessDate: process.argv[5] || '2022-07-18' });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'accrue_systxn.json'), JSON.stringify(res.accrue_systxn, null, 1));
fs.writeFileSync(path.join(outDir, 'accrue_ledgacc.json'), JSON.stringify(res.accrue_ledgacc, null, 1));
console.log('systxn=' + res.accrue_systxn.length + ' ledgacc=' + res.accrue_ledgacc.length);
