#!/usr/bin/env node
// Runs the ACCRUE step (FlowX workflow accrue_interest_calculation) over a directory of batch input files.
//
//   node run_accrue.mjs --in <inputDir> [--out output] [--parm 2022071800] [--ts <DB2 timestamp>]
//       Executes flowx/accrue_script.js — the exact SCRIPT-node body deployed in FlowX — and writes
//       accrue_systxn.json and accrue_ledgacc.json (CONTRACT.md) plus accrue_summary.json.
//   node run_accrue.mjs --in <inputDir> --emit-request
//       Writes <out>/flowx_request.json: the inputBody for running the workflow in FlowX
//       (Designer "Run" or the MCP run_workflow tool).
//   node run_accrue.mjs --flowx-result <endOutput.json> [--out output]
//       Converts the workflow's END output (accrueSystxnJson / accrueLedgaccJson) into the contract files.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, [])
);
const outDir = path.resolve(args.out || path.join(here, 'output'));
fs.mkdirSync(outDir, { recursive: true });

function writeOutputs(systxn, ledgacc, summary) {
  fs.writeFileSync(path.join(outDir, 'accrue_systxn.json'), JSON.stringify(systxn, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'accrue_ledgacc.json'), JSON.stringify(ledgacc, null, 2) + '\n');
  if (summary) fs.writeFileSync(path.join(outDir, 'accrue_summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`wrote ${systxn.length} interest transactions, ${ledgacc.length} accounts -> ${outDir}`);
  if (summary && summary.warnings && summary.warnings.length) console.warn(summary.warnings.join('\n'));
}

if (args['flowx-result']) {
  const end = JSON.parse(fs.readFileSync(args['flowx-result'], 'utf8'));
  writeOutputs(JSON.parse(end.accrueSystxnJson), JSON.parse(end.accrueLedgaccJson),
    end.accrueSummaryJson ? JSON.parse(end.accrueSummaryJson) : null);
  process.exit(0);
}

if (!args.in) {
  console.error('usage: node run_accrue.mjs --in <inputDir> [--out dir] [--parm 2022071800] [--ts ts] [--emit-request]');
  process.exit(2);
}
const inDir = path.resolve(args.in);

// Step isolation: ACCRUE takes POSTDAY's account and category-balance outputs. Accept the raw files or the
// oracle's POSTDAY dumps (JSON, or fixed-width .txt in the same copybook layout).
function readFirst(names, required) {
  for (const n of names) {
    const p = path.join(inDir, n);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'latin1');
  }
  if (required) throw new Error(`none of ${names.join(', ')} found in ${inDir}`);
  return '';
}

const request = {
  interestRunDate: String(args.parm || '2022071800'),
  processTs: typeof args.ts === 'string' ? args.ts : '',
  ledgaccFile: readFirst(['postday_ledgacc.json', 'postday_ledgacc.txt', 'ledgacc.dat'], true),
  balcatFile: readFirst(['postday_balcat.json', 'postday_balcat.txt', 'balcat.dat'], true),
  rategrpFile: readFirst(['rategrp.dat'], true),
  cardlinkFile: readFirst(['cardlink.dat'], false)
};

if (args['emit-request']) {
  fs.writeFileSync(path.join(outDir, 'flowx_request.json'), JSON.stringify(request) + '\n');
  console.log(`wrote ${path.join(outDir, 'flowx_request.json')}`);
  process.exit(0);
}

const script = fs.readFileSync(path.join(here, 'flowx', 'accrue_script.js'), 'utf8');
const sandbox = { input: request, output: {} };
vm.runInNewContext(script, sandbox, { filename: 'accrue_script.js' });
writeOutputs(JSON.parse(sandbox.output.accrueSystxnJson), JSON.parse(sandbox.output.accrueLedgaccJson),
  JSON.parse(sandbox.output.accrueSummaryJson));
