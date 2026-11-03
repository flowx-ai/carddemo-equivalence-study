#!/usr/bin/env node
// Local runner for the FlowX workflow "intcalc_batch".
// Executes the SAME three SCRIPT-node sources (flowx/scripts/*.js, identical to what is configured
// on the workflow nodes) in sequence with a FlowX-like input/output shim, then writes the
// contract outputs. Usage:
//   node run_intcalc.js <input_dir> <output_dir> [parmDate=2022071800] [runTimestamp]
// The input dir must hold acctdata.dat, tcatbal.dat, cardxref.dat, discgrp.dat.
'use strict';
const fs = require('fs');
const path = require('path');

const [inDir, outDir, parmDate = '2022071800', runTimestamp] = process.argv.slice(2);
if (!inDir || !outDir) {
  console.error('usage: node run_intcalc.js <input_dir> <output_dir> [parmDate] [runTimestamp]');
  process.exit(2);
}

function readIn(name) {
  const p = path.join(inDir, name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'latin1') : '';
}

let state = {
  acctdata: readIn('acctdata.dat'),
  tcatbal: readIn('tcatbal.dat'),
  cardxref: readIn('cardxref.dat'),
  discgrp: readIn('discgrp.dat'),
  parmDate: parmDate,
  runTimestamp: runTimestamp || null
};

const nodes = ['01_load_inputs.js', '02_compute_interest.js', '03_post_interest.js'];
for (const n of nodes) {
  const code = fs.readFileSync(path.join(__dirname, 'flowx', 'scripts', n), 'utf8');
  const output = {};
  new Function('input', 'output', code)(state, output);
  state = Object.assign({}, state, output); // workflow state accumulates node outputs
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'intcalc_systran.json'), JSON.stringify(state.intcalc_systran, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'intcalc_acctdata.json'), JSON.stringify(state.intcalc_acctdata, null, 2) + '\n');
for (const f of ['assumptions.md', 'flags.json']) {
  fs.copyFileSync(path.join(__dirname, f), path.join(outDir, f));
}
console.log(`wrote ${state.intcalc_systran.length} interest transactions, ${state.intcalc_acctdata.length} accounts to ${outDir}`);
