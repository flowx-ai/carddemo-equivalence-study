#!/usr/bin/env python3
"""Driver for the FlowX workflow `accrue_interest` (Ledgerline ACCRUE step).

The calculation runs in FlowX (workflow accrue_interest, SCRIPT node "Accrue interest").
This script only moves files in and out:

  prepare <input_dir> [--parm 2022071800] [--out run_input.json]
      Reads ledgacc / balcat / cardlink / rategrp from <input_dir> and writes the workflow's
      input body. ledgacc and balcat are taken from, in order of preference:
        ledgacc.dat | postday_ledgacc.json | postday_ledgacc.txt
        balcat.dat  | postday_balcat.json  | postday_balcat.txt
      (the step-isolation rule hands ACCRUE the oracle's POSTDAY outputs; see assumptions.md A2).

  finish <run_output.json> [--out-dir .]
      Takes the END-node output of the run ({"systxn": "...", "ledgaccOut": "...", ...})
      and writes accrue_systxn.json and accrue_ledgacc.json.

Run the workflow in between with the input body (Designer "Run", or the zflx MCP run_workflow tool).
"""
import argparse
import json
import os
import sys


def _read(path):
    with open(path, "r", encoding="latin-1") as f:
        return f.read()


def _first(input_dir, names):
    for n in names:
        p = os.path.join(input_dir, n)
        if os.path.exists(p):
            return p
    raise SystemExit("none of %s found in %s" % (", ".join(names), input_dir))


def prepare(args):
    d = args.input_dir
    body = {
        "ledgacc": _read(_first(d, ["ledgacc.dat", "postday_ledgacc.json", "postday_ledgacc.txt"])),
        "balcat": _read(_first(d, ["balcat.dat", "postday_balcat.json", "postday_balcat.txt"])),
        "cardlink": _read(_first(d, ["cardlink.dat"])),
        "rategrp": _read(_first(d, ["rategrp.dat"])),
        "parmDate": args.parm,
    }
    if args.timestamp:
        body["runTimestamp"] = args.timestamp
    if args.no_last_account_update:
        body["updateLastAccount"] = False
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(body, f)
    print("wrote %s" % args.out)


def finish(args):
    with open(args.run_output, "r", encoding="utf-8") as f:
        out = json.load(f)
    if "output" in out and isinstance(out["output"], dict):
        out = out["output"]
    os.makedirs(args.out_dir, exist_ok=True)
    for key, name in (("systxn", "accrue_systxn.json"), ("ledgaccOut", "accrue_ledgacc.json")):
        rows = out[key]
        if isinstance(rows, str):
            rows = json.loads(rows)
        with open(os.path.join(args.out_dir, name), "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=1)
        print("wrote %s (%d records)" % (name, len(rows)))
    if out.get("summary"):
        print(out["summary"])


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prepare")
    p.add_argument("input_dir")
    p.add_argument("--parm", default="2022071800")
    p.add_argument("--timestamp", default="", help="fixed TXN-ORIG-TS/PROC-TS (default: run time)")
    p.add_argument("--no-last-account-update", action="store_true", help="see assumptions.md A13")
    p.add_argument("--out", default="run_input.json")
    p.set_defaults(fn=prepare)
    f = sub.add_parser("finish")
    f.add_argument("run_output")
    f.add_argument("--out-dir", default=".")
    f.set_defaults(fn=finish)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
