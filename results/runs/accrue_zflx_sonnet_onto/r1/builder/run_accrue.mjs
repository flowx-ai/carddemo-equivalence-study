#!/usr/bin/env node
// Runner for the FlowX workflow accrue_interest_calculation (ACCRUE step).
//
//   node run_accrue.mjs <inputDir> <outputDir> [--interest-run-date 2022071800]
//
// Reads the CONTRACT.md inputs from <inputDir>, then either
//   * default: executes the three SCRIPT nodes exactly as deployed (flowx/0*.js are the deployed
//     sources) with the FlowX script contract (input.* / output.*), START -> Parse -> Accrue -> Format -> END(${result});
//   * --emit-flowx-input: only writes <outputDir>/flowx_input.json, the START body to run the workflow
//     on the platform (run_workflow / Designer "Run"); save its END output as <outputDir>/flowx_result.json
//     and re-run with --from-flowx-result to split it into the contract files.
// Writes <outputDir>/accrue_systxn.json, accrue_ledgacc.json and run_log.json.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--interest-run-date'));
const [inputDir, outputDir] = positional;
if (!inputDir || !outputDir) {
  console.error('usage: node run_accrue.mjs <inputDir> <outputDir> [--interest-run-date 2022071800] [--emit-flowx-input | --from-flowx-result]');
  process.exit(2);
}
mkdirSync(outputDir, { recursive: true });

function firstExisting(...names) {
  for (const n of names) { const p = join(inputDir, n); if (existsSync(p)) return readFileSync(p, 'latin1'); }
  throw new Error(`none of ${names.join(', ')} found in ${inputDir}`);
}

function writeOutputs(result) {
  writeFileSync(join(outputDir, 'accrue_systxn.json'), JSON.stringify(result.accrue_systxn, null, 2));
  writeFileSync(join(outputDir, 'accrue_ledgacc.json'), JSON.stringify(result.accrue_ledgacc, null, 2));
  writeFileSync(join(outputDir, 'run_log.json'), JSON.stringify(result.runLog, null, 2));
  for (const f of ['assumptions.md', 'flags.json']) copyFileSync(join(here, f), join(outputDir, f));
  console.log(`accrue_systxn: ${result.accrue_systxn.length} transactions, accrue_ledgacc: ${result.accrue_ledgacc.length} accounts`);
  console.log(JSON.stringify(result.runLog));
}

if (flag('--from-flowx-result')) {
  writeOutputs(JSON.parse(readFileSync(join(outputDir, 'flowx_result.json'), 'utf8')));
  process.exit(0);
}

// START input slice: ledgaccDat, balcatDat, cardlinkDat, rategrpDat, interestRunDate
const start = {
  // Step isolation: ACCRUE takes POSTDAY's account and category-balance outputs
  ledgaccDat: firstExisting('ledgacc.dat', 'postday_ledgacc.json'),
  balcatDat: firstExisting('balcat.dat', 'postday_balcat.json'),
  cardlinkDat: firstExisting('cardlink.dat'),
  rategrpDat: firstExisting('rategrp.dat'),
  interestRunDate: opt('--interest-run-date', '2022071800'),
};

if (flag('--emit-flowx-input')) {
  writeFileSync(join(outputDir, 'flowx_input.json'), JSON.stringify(start));
  console.log(`wrote ${join(outputDir, 'flowx_input.json')}`);
  process.exit(0);
}

// Local execution of the deployed SCRIPT nodes: each node sees the accumulated data as `input`
// and contributes `output` keys, like the workflow token.
let state = { ...start };
for (const file of ['01_parse_inputs.js', '02_accrue_interest.js', '03_format_outputs.js']) {
  const src = readFileSync(join(here, 'flowx', file), 'utf8');
  const output = {};
  new Function('input', 'output', src)(state, output);
  state = { ...state, ...output };
}
writeOutputs(state.result);
