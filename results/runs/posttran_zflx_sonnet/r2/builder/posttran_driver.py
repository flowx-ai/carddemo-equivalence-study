#!/usr/bin/env python3
"""File bridge for the FlowX workflow `posttran_daily_transaction_posting` (CardDemo POSTTRAN).

The posting logic runs in FlowX. This script only moves data across the boundary:

  prepare  <input_dir> [-o posttran_input.json] [--business-date 2022-07-18] [--batch-id ID]
      Reads dailytran.dat, acctdata.dat, cardxref.dat, tcatbal.dat (fixed width, one record
      per line) and writes the workflow's START input body as JSON.

  emit     <result.json> [-o <output_dir>]
      Reads the workflow result (the END node output, or any JSON that contains it, e.g. a
      saved get_workflow_run node dump) and writes the four CONTRACT.md outputs:
      posttran_transact.json, posttran_dalyrejs.json, posttran_acctdata.json, posttran_tcatbal.json.

Between the two, run the workflow with the prepared body (FlowX Designer "Run workflow", or the
MCP tool run_workflow with workflowResourceId <uuid>).
"""
import argparse
import json
import os
import sys

INPUT_FILES = {
    "dailytran": "dailytran.dat",
    "acctdata": "acctdata.dat",
    "cardxref": "cardxref.dat",
    "tcatbal": "tcatbal.dat",
}
OUTPUT_KEYS = ["posttran_transact", "posttran_dalyrejs", "posttran_acctdata", "posttran_tcatbal"]


def read_fixed_width(path):
    # latin-1 keeps one character per byte, so the copybook offsets hold for any byte value.
    with open(path, "r", encoding="latin-1", newline="") as fh:
        return fh.read()


def prepare(args):
    body = {}
    for key, name in INPUT_FILES.items():
        path = os.path.join(args.input_dir, name)
        if not os.path.exists(path):
            if key == "tcatbal":
                body[key] = ""  # an empty category-balance file is legal; balances are created on posting
                continue
            sys.exit("missing input file: %s" % path)
        body[key] = read_fixed_width(path)
    body["businessDate"] = args.business_date
    body["batchId"] = args.batch_id or ("POSTTRAN-" + args.business_date)
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(body, fh)
    counts = {k: len([l for l in body[k].splitlines() if l.strip()]) for k in INPUT_FILES}
    print("wrote %s (%s)" % (args.output, ", ".join("%s=%d" % kv for kv in counts.items())))


def find_result(node):
    if isinstance(node, dict):
        if all(k in node for k in OUTPUT_KEYS):
            return node
        for key in ("output", "result"):
            if key in node:
                found = find_result(node[key])
                if found is not None:
                    return found
        for value in node.values():
            found = find_result(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = find_result(value)
            if found is not None:
                return found
    return None


def emit(args):
    with open(args.result, "r", encoding="utf-8") as fh:
        result = find_result(json.load(fh))
    if result is None:
        sys.exit("no posttran result (%s) found in %s" % (", ".join(OUTPUT_KEYS), args.result))
    os.makedirs(args.output_dir, exist_ok=True)
    for key in OUTPUT_KEYS:
        path = os.path.join(args.output_dir, key + ".json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(result[key], fh, indent=1, ensure_ascii=False)
        print("wrote %s (%d records)" % (path, len(result[key])))
    print("status %s, return code %s, summary %s" % (
        result.get("status"), result.get("returnCode"),
        json.dumps({k: v for k, v in (result.get("summary") or {}).items() if not isinstance(v, list)})))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("prepare", help="input .dat files -> workflow input body")
    p.add_argument("input_dir")
    p.add_argument("-o", "--output", default="posttran_input.json")
    p.add_argument("--business-date", default="2022-07-18")
    p.add_argument("--batch-id")
    p.set_defaults(func=prepare)

    e = sub.add_parser("emit", help="workflow result -> CONTRACT.md output files")
    e.add_argument("result")
    e.add_argument("-o", "--output-dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "output"))
    e.set_defaults(func=emit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
