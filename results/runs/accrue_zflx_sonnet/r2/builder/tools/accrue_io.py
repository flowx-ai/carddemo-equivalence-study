#!/usr/bin/env python3
"""Offline I/O helper for the FlowX workflow `accrue_interest_calculation`.

  pack   <input_dir> [--run-date 2022071800] [--run-timestamp TS]  > input_body.json
  unpack <workflow_output.json> <output_dir>

`pack` builds the workflow input body from the run's input files. For the account and
category-balance inputs it prefers the oracle's POSTDAY outputs (CONTRACT "Step isolation"):
postday_<name>.json, then postday_<name>.txt, then <name>.dat.
`unpack` takes the workflow's END output (the JSON shown by run_workflow / get_workflow_run)
and writes accrue_systxn.json and accrue_ledgacc.json.

Standard library only; no network access.
"""
import argparse
import json
import pathlib
import sys

CANDIDATES = {
    "ledgacc": ["postday_ledgacc.json", "postday_ledgacc.txt", "ledgacc.dat"],
    "balcat": ["postday_balcat.json", "postday_balcat.txt", "balcat.dat"],
    "rategrp": ["rategrp.dat"],
    "cardlink": ["cardlink.dat"],
}
REQUIRED = {"ledgacc", "balcat", "rategrp"}


def pack(args):
    src = pathlib.Path(args.input_dir)
    body = {"interestRunDate": args.run_date}
    if args.run_timestamp:
        body["runTimestamp"] = args.run_timestamp
    for key, names in CANDIDATES.items():
        for name in names:
            path = src / name
            if path.is_file():
                body[key] = path.read_text(encoding="latin-1")
                print(f"{key}: {path}", file=sys.stderr)
                break
        else:
            if key in REQUIRED:
                sys.exit(f"missing input for {key}: none of {names} in {src}")
            body[key] = ""
    json.dump(body, sys.stdout)


def unpack(args):
    result = json.loads(pathlib.Path(args.workflow_output).read_text(encoding="utf-8"))
    out = pathlib.Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for key in ("accrue_systxn", "accrue_ledgacc"):
        if key not in result:
            sys.exit(f"workflow output has no '{key}'")
        (out / f"{key}.json").write_text(json.dumps(result[key], indent=2) + "\n", encoding="utf-8")
    for warning in result.get("runSummary", {}).get("warnings", []):
        print("warning:", warning, file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("pack")
    p.add_argument("input_dir")
    p.add_argument("--run-date", default="2022071800")
    p.add_argument("--run-timestamp")
    p.set_defaults(func=pack)
    u = sub.add_parser("unpack")
    u.add_argument("workflow_output")
    u.add_argument("output_dir")
    u.set_defaults(func=unpack)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
