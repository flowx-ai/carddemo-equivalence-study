#!/usr/bin/env node
// Runner for the FlowX workflow posttran_daily_transaction_posting (POSTTRAN / CBTRN02C).
//
//   node run_posttran.js prepare <inputDir> <inputBody.json>   build the FlowX START input body
//   node run_posttran.js extract <runResult.json> <outDir>      write the CONTRACT.md files from a
//                                                                FlowX END payload (run_workflow output)
//   node run_posttran.js local   <inputDir> <outDir>            execute the two deployed SCRIPT nodes
//                                                                (flowx/scripts/*.js, verbatim) here
//
// Inputs read from <inputDir>: dailytran.dat, acctdata.dat, cardxref.dat, tcatbal.dat.
// Outputs: posttran_transact.json, posttran_dalyrejs.json, posttran_acctdata.json, posttran_tcatbal.json
// (plus posttran_run_summary.json, not part of the contract).

const fs = require('fs');
const path = require('path');

const BUSINESS_DATE = '2022-07-18';
const OUTPUTS = ['posttran_transact', 'posttran_dalyrejs', 'posttran_acctdata', 'posttran_tcatbal'];

function readInput(dir, name, required) {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) {
    if (required) throw new Error('missing input ' + p);
    return '';
  }
  return fs.readFileSync(p, 'latin1');
}

function inputBody(dir) {
  return {
    businessDate: BUSINESS_DATE,
    batchId: 'POSTTRAN-' + BUSINESS_DATE,
    dailytran: readInput(dir, 'dailytran.dat', true),
    acctdata: readInput(dir, 'acctdata.dat', true),
    cardxref: readInput(dir, 'cardxref.dat', true),
    tcatbal: readInput(dir, 'tcatbal.dat', false)
  };
}

function writeOutputs(result, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of OUTPUTS) {
    if (!Array.isArray(result[name])) throw new Error('result has no array ' + name);
    fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(result[name], null, 2) + '\n');
  }
  if (result.runSummary) {
    fs.writeFileSync(path.join(outDir, 'posttran_run_summary.json'), JSON.stringify(result.runSummary, null, 2) + '\n');
  }
  const s = result.runSummary || {};
  console.log(`posted ${result.posttran_transact.length}, rejected ${result.posttran_dalyrejs.length}` +
    (s.status ? `, status ${s.status} (RC ${s.returnCode})` : '') + ` -> ${outDir}`);
}

function runScript(file, input) {
  const code = fs.readFileSync(path.join(__dirname, 'flowx', 'scripts', file), 'utf8');
  const output = {};
  new Function('input', 'output', code)(input, output);
  return output;
}

function local(dir) {
  // Same node sequence as the workflow: START -> Validate and post -> Build run summary -> END.
  const state = inputBody(dir);
  Object.assign(state, runScript('01_validate_and_post.js', state));
  Object.assign(state, runScript('02_build_run_summary.js', state));
  return state;
}

const [mode, a, b] = process.argv.slice(2);
if (mode === 'prepare' && a && b) {
  fs.writeFileSync(b, JSON.stringify(inputBody(a)));
  console.log('FlowX input body written to ' + b);
} else if (mode === 'extract' && a && b) {
  let result = JSON.parse(fs.readFileSync(a, 'utf8'));
  if (result.output && !result.posttran_transact) result = result.output;
  writeOutputs(result, b);
} else if (mode === 'local' && a && b) {
  writeOutputs(local(a), b);
} else {
  console.error('usage: node run_posttran.js prepare|extract|local <in> <out>');
  process.exit(2);
}
