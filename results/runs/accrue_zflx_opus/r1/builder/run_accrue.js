#!/usr/bin/env node
// Runs the ACCRUE step offline with the exact node scripts deployed in the FlowX workflow
// "accrue_interest" (flowx/0*.js), emulating the SCRIPT-node contract: `input` is the
// accumulated workflow state, keys written to `output` are merged into it.
//
// usage: node run_accrue.js <inputDir> [outDir] [businessDate] [accrueParam]
//   defaults: outDir=./out, businessDate=2022-07-18, accrueParam=2022071800
// writes: <outDir>/accrue_systxn.json, <outDir>/accrue_ledgacc.json, <outDir>/accrue_warnings.json
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const inDir = process.argv[2];
if (!inDir) { console.error('usage: node run_accrue.js <inputDir> [outDir] [businessDate] [accrueParam]'); process.exit(2); }
const outDir = process.argv[3] || path.join(__dirname, 'out');
const businessDate = process.argv[4] || '2022-07-18';
const accrueParam = process.argv[5] || '2022071800';

function readFirst(names) {
  for (const n of names) {
    const p = path.join(inDir, n);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'latin1');
  }
  return null;
}

// --- Fallback for a POSTDAY output delivered as JSON: rebuild the fixed-width records. ---
function cents(v) {
  const s = String(v).trim();
  const neg = s.startsWith('-');
  const [i, f = ''] = s.replace(/^[+-]/, '').split('.');
  return (neg ? -1 : 1) * (parseInt(i || '0', 10) * 100 + parseInt((f + '00').slice(0, 2), 10));
}
function zonedOut(c, width) {
  const neg = c < 0;
  const digits = String(Math.abs(c)).padStart(width, '0').slice(-width);
  const last = parseInt(digits[width - 1], 10);
  const sign = neg ? '}JKLMNOPQR'[last] : '{ABCDEFGHI'[last];
  return digits.slice(0, width - 1) + sign;
}
const str = (v, n) => String(v == null ? '' : v).padEnd(n, ' ').slice(0, n);
const num = (v, n) => String(v == null ? 0 : v).padStart(n, '0').slice(-n);
function ledgaccFromJson(rows) {
  return rows.map(r => num(r.acct_id, 11) + str(r.active_status, 1) + zonedOut(cents(r.curr_bal), 12) +
    zonedOut(cents(r.credit_limit), 12) + zonedOut(cents(r.cash_credit_limit), 12) + str(r.open_date, 10) +
    str(r.expiration_date, 10) + str(r.reissue_date, 10) + zonedOut(cents(r.curr_cyc_credit), 12) +
    zonedOut(cents(r.curr_cyc_debit), 12) + str(r.addr_zip, 10) + str(r.group_id, 10)).join('\n');
}
function balcatFromJson(rows) {
  return rows.map(r => num(r.acct_id, 11) + str(r.type_cd, 2) + num(r.cat_cd, 4) + zonedOut(cents(r.bal), 11)).join('\n');
}
function jsonInput(name, convert) {
  const p = path.join(inDir, name);
  return fs.existsSync(p) ? convert(JSON.parse(fs.readFileSync(p, 'utf8'))) : null;
}

const state = {
  businessDate,
  accrueParam,
  ledgaccText: readFirst(['ledgacc.dat', 'postday_ledgacc.txt']) ?? jsonInput('postday_ledgacc.json', ledgaccFromJson),
  balcatText: readFirst(['balcat.dat', 'postday_balcat.txt']) ?? jsonInput('postday_balcat.json', balcatFromJson),
  rategrpText: readFirst(['rategrp.dat']),
  cardlinkText: readFirst(['cardlink.dat']),
  txncatgText: readFirst(['txncatg.dat'])
};
for (const k of ['ledgaccText', 'balcatText', 'rategrpText', 'cardlinkText']) {
  if (state[k] == null) { console.error(`missing input for ${k} in ${inDir}`); process.exit(1); }
}

const scripts = ['01_load_accounts.js', '02_compute_interest.js', '03_post_interest.js'];
for (const s of scripts) {
  const code = fs.readFileSync(path.join(__dirname, 'flowx', s), 'utf8');
  const output = {};
  vm.runInNewContext(code, { input: Object.assign({}, state), output, BigInt, JSON, Math, String });
  Object.assign(state, output);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'accrue_systxn.json'), JSON.stringify(JSON.parse(state.systxnJson), null, 1) + '\n');
fs.writeFileSync(path.join(outDir, 'accrue_ledgacc.json'), JSON.stringify(JSON.parse(state.ledgaccJson), null, 1) + '\n');
fs.writeFileSync(path.join(outDir, 'accrue_warnings.json'), JSON.stringify(JSON.parse(state.warningsJson), null, 1) + '\n');
console.log(state.summary);
