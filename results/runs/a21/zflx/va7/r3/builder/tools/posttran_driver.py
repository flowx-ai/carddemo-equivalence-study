#!/usr/bin/env python3
"""Local glue for the FlowX workflow `posttran_daily_transaction_posting`.

The posting logic runs in FlowX. This script only moves files across the boundary:

  prepare <input_dir> <input_body.json> [--business-date 2022-07-18] [--batch-id ID]
      Reads dailytran.dat, acctdata.dat, cardxref.dat, tcatbal.dat (CONTRACT.md inputs) and writes the
      workflow START input body. Pass that body to the workflow (zFLX `run_workflow`, or the Designer's
      Run with input).

  unpack <run_result.json> <output_dir>
      Reads the workflow END output (or any JSON that contains it, e.g. a saved run result) and writes
      posttran_transact.json, posttran_dalyrejs.json, posttran_acctdata.json, posttran_tcatbal.json
      (CONTRACT.md outputs) plus posttran_run_summary.json.

Standard library only.
"""
import argparse
import json
import pathlib
import sys

INPUT_FILES = {
    "dailytran": "dailytran.dat",
    "acctdata": "acctdata.dat",
    "cardxref": "cardxref.dat",
    "tcatbal": "tcatbal.dat",
}
OPTIONAL_INPUTS = {"tcatbal"}   # an empty TCATBALF is valid: every balance is then created by posting

OUTPUT_FILES = {
    "transactJson": "posttran_transact.json",
    "dalyrejsJson": "posttran_dalyrejs.json",
    "acctdataJson": "posttran_acctdata.json",
    "tcatbalJson": "posttran_tcatbal.json",
}
SUMMARY_KEYS = ("runStatus", "returnCode", "readCount", "postedCount", "rejectedCount", "duplicateSkippedCount")


def prepare(input_dir: pathlib.Path, out_path: pathlib.Path, business_date: str, batch_id: str) -> None:
    body = {"businessDate": business_date, "batchId": batch_id}
    for key, name in INPUT_FILES.items():
        path = input_dir / name
        if not path.exists():
            if key in OPTIONAL_INPUTS:
                body[key] = ""
                continue
            sys.exit(f"missing input file: {path}")
        # fixed-width ASCII records; latin-1 keeps every byte as one character so offsets stay exact
        body[key] = path.read_bytes().decode("latin-1")
    out_path.write_text(json.dumps(body), encoding="utf-8")
    print(f"wrote {out_path}")


def find_end_output(node):
    """Return the first dict holding the END output keys, searching nested wrappers."""
    if isinstance(node, dict):
        if "transactJson" in node:
            return node
        for value in node.values():
            found = find_end_output(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = find_end_output(value)
            if found is not None:
                return found
    return None


def unpack(result_path: pathlib.Path, output_dir: pathlib.Path) -> None:
    end = find_end_output(json.loads(result_path.read_text(encoding="utf-8")))
    if end is None:
        sys.exit(f"no workflow END output (transactJson ...) found in {result_path}")
    output_dir.mkdir(parents=True, exist_ok=True)
    for key, name in OUTPUT_FILES.items():
        value = end.get(key) or "[]"
        records = json.loads(value) if isinstance(value, str) else value
        (output_dir / name).write_text(json.dumps(records, indent=1) + "\n", encoding="utf-8")
        print(f"wrote {output_dir / name} ({len(records)} records)")
    summary = {k: end.get(k) for k in SUMMARY_KEYS}
    (output_dir / "posttran_run_summary.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
    print(f"run status {summary['runStatus']} (return code {summary['returnCode']})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("prepare")
    p.add_argument("input_dir", type=pathlib.Path)
    p.add_argument("out_path", type=pathlib.Path)
    p.add_argument("--business-date", default="2022-07-18")
    p.add_argument("--batch-id", default="POSTTRAN-2022-07-18")

    u = sub.add_parser("unpack")
    u.add_argument("result_path", type=pathlib.Path)
    u.add_argument("output_dir", type=pathlib.Path)

    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.input_dir, args.out_path, args.business_date, args.batch_id)
    else:
        unpack(args.result_path, args.output_dir)


if __name__ == "__main__":
    main()
