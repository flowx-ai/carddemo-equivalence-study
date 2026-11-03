#!/usr/bin/env node
// Local runner for the ACCRUE step. Executes the same logic as the FlowX workflow
// "accrue_interest_calculation" (flowx/accrue_core.js is the SCRIPT node body) on the
// legacy fixed-width inputs and writes the CONTRACT.md outputs.
//
// Usage: node run_accrue.js <inputDir> [outputDir] [--parm 2022071800] [--ts "YYYY-MM-DD-HH.MM.SS.cc0000"]
//   inputDir  holds ledgacc.dat, cardlink.dat, balcat.dat, rategrp.dat (oracle POSTDAY outputs)
//   outputDir defaults to this directory; receives accrue_systxn.json, accrue_ledgacc.json,
//             plus assumptions.md and flags.json
'use strict';
const fs = require('fs');
const path = require('path');
const { accrueInterest } = require('./flowx/accrue_core.js');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const parm = opt('--parm') || '2022071800';
const ts = opt('--ts');
const [inputDir, outputDir = __dirname] = args;
if (!inputDir) { console.error('usage: node run_accrue.js <inputDir> [outputDir] [--parm P] [--ts T]'); process.exit(2); }

const read = (name) => {
  const p = path.join(inputDir, name);
  if (!fs.existsSync(p)) { console.error(`missing input ${p}`); process.exit(2); }
  return fs.readFileSync(p, 'latin1');
};

const result = accrueInterest(
  { ledgacc: read('ledgacc.dat'), cardlink: read('cardlink.dat'), balcat: read('balcat.dat'), rategrp: read('rategrp.dat') },
  { interestRunDate: parm, runTimestamp: ts });

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'accrue_systxn.json'), JSON.stringify(result.transactions, null, 1) + '\n');
fs.writeFileSync(path.join(outputDir, 'accrue_ledgacc.json'), JSON.stringify(result.accounts, null, 1) + '\n');
for (const f of ['assumptions.md', 'flags.json']) {
  const src = path.join(__dirname, f), dst = path.join(outputDir, f);
  if (path.resolve(src) !== path.resolve(dst) && fs.existsSync(src)) fs.copyFileSync(src, dst);
}
console.log(JSON.stringify(result.summary));
result.warnings.forEach((w) => console.error('WARN ' + w));
