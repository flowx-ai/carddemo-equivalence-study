#!/usr/bin/env node
// Ledgerline ACCRUE runner for the FlowX workflow `accrue_interest_calculation`.
//
// The business logic lives in the workflow's three SCRIPT nodes; their source is kept verbatim in
// ../flowx/scripts/. This runner moves files in and out of that workflow:
//
//   node runner/accrue.mjs --in <inputDir> --out <outDir>
//       Executes the three node scripts locally, in order, with the FlowX SCRIPT-node contract
//       (`input` = accumulated workflow state, `output.<key>` merged back into it), and writes
//       accrue_systxn.json + accrue_ledgacc.json.
//   node runner/accrue.mjs --in <inputDir> --emit-input <file>
//       Writes the workflow's START input body, to run the workflow on FlowX (Designer "Run" /
//       MCP run_workflow).
//   node runner/accrue.mjs --from-result <file> --out <outDir>
//       Splits the END output of a FlowX run ({ systxn, ledgacc }) into the contract files.
//
// Every mode that writes outputs also copies assumptions.md and flags.json next to them.
// Options: --parm 2022071800  --date 2022-07-18  --ledgacc <file>  --balcat <file>
//          --cardlink <file>  --rategrp <file>

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SCRIPTS = ["01_load_inputs.js", "02_compute_interest.js", "03_post_interest.js"]
  .map((f) => path.join(ROOT, "flowx", "scripts", f));

function args(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    a[k] = v;
  }
  return a;
}

// ACCRUE receives the oracle's POSTDAY outputs as its account and category-balance inputs
// (CONTRACT.md "Step isolation"); fall back to the plain copybook files.
function pick(dir, override, candidates) {
  if (override) return override;
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readInputs(a) {
  const dir = a.in || ".";
  const files = {
    ledgaccFile: pick(dir, a.ledgacc, ["postday_ledgacc.json", "postday_ledgacc.txt", "ledgacc.dat"]),
    balcatFile: pick(dir, a.balcat, ["postday_balcat.json", "postday_balcat.txt", "balcat.dat"]),
    cardlinkFile: pick(dir, a.cardlink, ["cardlink.dat"]),
    rategrpFile: pick(dir, a.rategrp, ["rategrp.dat"]),
  };
  const body = {};
  for (const [k, p] of Object.entries(files)) {
    if (!p) throw new Error(`no input found for ${k} in ${dir}`);
    console.error(`${k}: ${p}`);
    body[k] = fs.readFileSync(p, "latin1");
  }
  body.parmDate = String(a.parm || "2022071800");
  body.businessDate = String(a.date || "2022-07-18");
  return body;
}

function runScripts(startInput) {
  const state = { ...startInput };
  for (const file of SCRIPTS) {
    const output = {};
    vm.runInNewContext(fs.readFileSync(file, "utf8"), { input: state, output }, { filename: file });
    Object.assign(state, output);
  }
  return state;
}

function writeOutputs(outDir, result) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "accrue_systxn.json"), JSON.stringify(result.systxn || [], null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "accrue_ledgacc.json"), JSON.stringify(result.ledgacc || [], null, 2) + "\n");
  for (const f of ["assumptions.md", "flags.json"]) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src) && path.resolve(outDir) !== ROOT) fs.copyFileSync(src, path.join(outDir, f));
  }
  console.error(`wrote ${(result.systxn || []).length} interest transactions, ${(result.ledgacc || []).length} accounts to ${outDir}`);
  if (result.summary && result.summary.warnings && result.summary.warnings.length) {
    for (const w of result.summary.warnings) console.error(`warning: ${w}`);
  }
}

const a = args(process.argv);
if (a["from-result"]) {
  const raw = JSON.parse(fs.readFileSync(a["from-result"], "utf8"));
  writeOutputs(a.out || "out", raw.output || raw);
} else if (a["emit-input"]) {
  fs.writeFileSync(a["emit-input"], JSON.stringify(readInputs(a)));
  console.error(`wrote FlowX input body to ${a["emit-input"]}`);
} else {
  writeOutputs(a.out || "out", runScripts(readInputs(a)));
}
