#!/usr/bin/env node
// Local runner for the Ledgerline ACCRUE step.
// Executes the exact SCRIPT-node code deployed in the FlowX workflow `ledgerline_accrue_interest`
// (flowx/scripts/0*.js, run in node order with the same input/output contract) against the input
// files of CONTRACT.md, and writes accrue_systxn.json + accrue_ledgacc.json.
//
// usage: node run_accrue.js <inputDir> [outDir=./output] [parm=2022071800] [businessDate=2022-07-18]
'use strict';
const fs = require('fs');
const path = require('path');

const [inDir, outDir = path.join(__dirname, 'output'), parmDate = '2022071800', businessDate = '2022-07-18'] = process.argv.slice(2);
if (!inDir) {
  console.error('usage: node run_accrue.js <inputDir> [outDir] [parm] [businessDate]');
  process.exit(2);
}

// Step isolation (CONTRACT.md): the account and category-balance inputs are POSTDAY's outputs when
// present (JSON, or the oracle's fixed-width .txt dump); otherwise the raw .dat files.
function pick(names) {
  for (const n of names) {
    const p = path.join(inDir, n);
    if (fs.existsSync(p)) return { name: n, text: fs.readFileSync(p, 'latin1') };
  }
  throw new Error('none of ' + names.join(', ') + ' found in ' + inDir);
}
const files = {
  ledgacc: pick(['postday_ledgacc.json', 'postday_ledgacc.txt', 'ledgacc.dat']),
  balcat: pick(['postday_balcat.json', 'postday_balcat.txt', 'balcat.dat']),
  rategrp: pick(['rategrp.dat']),
  cardlink: pick(['cardlink.dat'])
};

const scriptsDir = path.join(__dirname, 'flowx', 'scripts');
const nodes = fs.readdirSync(scriptsDir).filter((f) => /^\d\d_.*\.js$/.test(f)).sort();

// Workflow state: START input slice, then each SCRIPT node's output merged in, as FlowX does.
const state = { parmDate, businessDate };
for (const k of Object.keys(files)) state[k] = files[k].text;
for (const f of nodes) {
  const output = {};
  new Function('input', 'output', fs.readFileSync(path.join(scriptsDir, f), 'utf8'))(state, output);
  Object.assign(state, output);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'accrue_systxn.json'), state.accrue_systxn_json + '\n');
fs.writeFileSync(path.join(outDir, 'accrue_ledgacc.json'), state.accrue_ledgacc_json + '\n');

console.log('inputs: ' + Object.keys(files).map((k) => k + '=' + files[k].name).join(', '));
console.log('summary: ' + state.summary_json);
if (state.computeIssues && state.computeIssues.length) console.log('compute issues:\n  ' + state.computeIssues.join('\n  '));
console.log('wrote ' + path.join(outDir, 'accrue_systxn.json') + ' and accrue_ledgacc.json');
