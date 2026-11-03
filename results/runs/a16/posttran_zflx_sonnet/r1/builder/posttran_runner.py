#!/usr/bin/env python3
"""Runner for the FlowX POSTTRAN step (workflow `posttran_daily_transaction_posting`).

The posting logic lives in FlowX; this script only moves files in and out of it.

  1. prepare: read the run's input files and write the workflow input body
       python3 -I posttran_runner.py prepare <input_dir> > posttran_input.json
  2. run the workflow `posttran_daily_transaction_posting` with that body
       (zflx MCP `run_workflow { workflowResourceId, inputBody }`, or Run in the Designer)
     and save its END node output (or the whole run/node JSON) to posttran_result.json
  3. emit: write the CONTRACT.md output files
       python3 -I posttran_runner.py emit posttran_result.json [<out_dir>]
"""
import argparse
import json
import os
import sys

# workflow input key -> CONTRACT.md input file
INPUTS = {
    "dailytran": "dailytran.dat",
    "acctdata": "acctdata.dat",
    "cardxref": "cardxref.dat",
    "tcatbal": "tcatbal.dat",
}
OPTIONAL_INPUTS = {"tcatbal"}

# workflow output key -> CONTRACT.md output file
OUTPUTS = {
    "posttran_transact": "posttran_transact.json",
    "posttran_dalyrejs": "posttran_dalyrejs.json",
    "posttran_acctdata": "posttran_acctdata.json",
    "posttran_tcatbal": "posttran_tcatbal.json",
}
SUMMARY_FILE = "posttran_run_summary.json"


def prepare(args):
    body = {}
    for key, name in INPUTS.items():
        path = os.path.join(args.input_dir, name)
        if not os.path.exists(path):
            if key in OPTIONAL_INPUTS:
                continue
            sys.exit(f"missing input file: {path}")
        # latin-1 maps every byte to one char, so fixed-width offsets are preserved
        with open(path, encoding="latin-1", newline="") as f:
            body[key] = f.read()
    if args.business_date:
        body["businessDate"] = args.business_date
    if args.batch_id:
        body["batchId"] = args.batch_id
    if args.processed_timestamp:
        body["processedTimestamp"] = args.processed_timestamp
    json.dump(body, sys.stdout)


def find_outputs(obj):
    """Locate the dict holding the workflow outputs anywhere inside a saved run/node response."""
    if isinstance(obj, dict):
        if "posttran_transact" in obj:
            return obj
        # prefer a node's "output" over its "input"
        for k in ("output", "endOutput", "result"):
            if k in obj:
                found = find_outputs(obj[k])
                if found is not None:
                    return found
        for v in obj.values():
            found = find_outputs(v)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = find_outputs(v)
            if found is not None:
                return found
    return None


def emit(args):
    with open(args.result, encoding="utf-8") as f:
        result = json.load(f)
    outputs = find_outputs(result)
    if outputs is None:
        sys.exit("no posttran_* outputs found in the result file")
    out_dir = args.out_dir or os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out_dir, exist_ok=True)
    for key, name in OUTPUTS.items():
        value = outputs.get(key)
        if value is None:
            sys.exit(f"output {key} missing from the result")
        records = json.loads(value) if isinstance(value, str) else value
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
            json.dump(records, f, indent=1, ensure_ascii=False)
        print(f"{name}: {len(records)} records")
    summary = outputs.get("runSummary")
    if summary is not None:
        with open(os.path.join(out_dir, SUMMARY_FILE), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=1)
        print(f"run status: {summary.get('status')} (return code {summary.get('returnCode')})")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("prepare", help="build the workflow input body from the run's input files")
    p.add_argument("input_dir")
    p.add_argument("--business-date", default="2022-07-18")
    p.add_argument("--batch-id", default="POSTTRAN-20220718")
    p.add_argument("--processed-timestamp", help="pin proc_ts (default: wall clock at run time)")
    p.set_defaults(func=prepare)

    e = sub.add_parser("emit", help="write the contract output files from a saved workflow result")
    e.add_argument("result")
    e.add_argument("out_dir", nargs="?")
    e.set_defaults(func=emit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
