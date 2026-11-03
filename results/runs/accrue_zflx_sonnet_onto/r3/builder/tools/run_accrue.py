"""Glue between the CONTRACT.md files and the FlowX workflow `accrue_interest_calculation`.

  build-input   --input-dir DIR [--parm 2022071800] [--batch-id ID] [--out run_input.json]
      Packs the ACCRUE inputs into the workflow's INPUT slice (ledgacc, balcat, rategrp, cardlink,
      interestRunDate). Step isolation: when the oracle's POSTDAY outputs are present
      (postday_ledgacc.json / postday_balcat.json, or their .txt fixed-width dumps) they are used as the
      account and category-balance inputs instead of ledgacc.dat / balcat.dat.

  write-outputs --run-output FILE [--output-dir DIR]
      Takes the workflow's END output (JSON, as returned by a run) and writes accrue_systxn.json and
      accrue_ledgacc.json in the contract format.

Run the workflow in between with the FlowX MCP `run_workflow` (inputBody = run_input.json) or from the
Designer. Usage: python3 -I tools/run_accrue.py <command> ...
"""
import argparse
import json
import os
import sys


def first_existing(d, names):
    for n in names:
        p = os.path.join(d, n)
        if os.path.isfile(p):
            return p
    raise SystemExit("none of %s found in %s" % (", ".join(names), d))


def read(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()


def build_input(args):
    d = args.input_dir
    body = {
        "ledgacc": read(first_existing(d, ["postday_ledgacc.json", "postday_ledgacc.txt", "ledgacc.dat"])),
        "balcat": read(first_existing(d, ["postday_balcat.json", "postday_balcat.txt", "balcat.dat"])),
        "rategrp": read(first_existing(d, ["rategrp.dat"])),
        "cardlink": read(first_existing(d, ["cardlink.dat"])),
        "interestRunDate": args.parm,
    }
    if args.batch_id:
        body["batchId"] = args.batch_id
    text = json.dumps(body)
    if args.out:
        with open(args.out, "w") as f:
            f.write(text)
    else:
        sys.stdout.write(text)


def find_key(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            r = find_key(v, key)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_key(v, key)
            if r is not None:
                return r
    return None


def write_outputs(args):
    run = json.loads(read(args.run_output))
    systxn = find_key(run, "accrueSystxn") or []
    ledgacc = find_key(run, "accrueLedgacc") or []
    for a in ledgacc:
        a["acct_id"] = int(a["acct_id"])
    for t in systxn:
        t["cat_cd"] = int(t["cat_cd"])
        t["merchant_id"] = int(t["merchant_id"])
    os.makedirs(args.output_dir, exist_ok=True)
    for name, rows in (("accrue_systxn.json", systxn), ("accrue_ledgacc.json", ledgacc)):
        with open(os.path.join(args.output_dir, name), "w") as f:
            json.dump(rows, f, indent=1)
    summary = find_key(run, "runSummary")
    if summary:
        print(summary)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build-input")
    b.add_argument("--input-dir", required=True)
    b.add_argument("--parm", default="2022071800")
    b.add_argument("--batch-id")
    b.add_argument("--out")
    w = sub.add_parser("write-outputs")
    w.add_argument("--run-output", required=True)
    w.add_argument("--output-dir", default=".", help="default: current directory, next to assumptions.md")
    args = ap.parse_args()
    build_input(args) if args.cmd == "build-input" else write_outputs(args)


if __name__ == "__main__":
    main()
