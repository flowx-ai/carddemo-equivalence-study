#!/usr/bin/env python3
"""I/O glue for the FlowX workflow `intcalc_interest_calculation` (CardDemo INTCALC / CBACT04C).

All business logic runs in FlowX. This script only moves files:

  build-request  <input_dir> [-o request.json] [--parm 2022071800] [--batch-id ID]
      Reads the CONTRACT.md input files and writes the workflow's input body
      (the raw text of each file, keyed as the workflow's INPUT slice expects).

  write-outputs  <result.json> [<out_dir>]
      Takes the workflow result (the END node output, or a whole run dump that
      contains it) and writes intcalc_systran.json and intcalc_acctdata.json.

Run the workflow in between with the request body, e.g. via the FlowX MCP
`run_workflow { workflowResourceId, inputBody }` or the Designer's Run dialog.
"""
import argparse
import json
import os
import sys

WORKFLOW_RESOURCE_ID = "<uuid>"
WORKFLOW_RESOURCE_DEFINITION_ID = "<uuid>"
DEFAULT_PARM = "2022071800"

# Workflow input key -> candidate files, in order of preference. For step isolation the
# account and category-balance inputs may arrive as the oracle's POSTTRAN JSON outputs.
INPUTS = {
    "acctdataDat": ["acctdata.dat", "posttran_acctdata.json", "posttran_acctdata.txt"],
    "tcatbalDat": ["tcatbal.dat", "posttran_tcatbal.json"],
    "discgrpDat": ["discgrp.dat"],
    "cardxrefDat": ["cardxref.dat"],
}

OUTPUTS = ("intcalc_systran", "intcalc_acctdata")


def read_text(path):
    with open(path, "rb") as f:
        return f.read().decode("latin-1")


def build_request(args):
    body = {"interestRunDate": args.parm, "batchId": args.batch_id or ""}
    for key, names in INPUTS.items():
        for name in names:
            path = os.path.join(args.input_dir, name)
            if os.path.isfile(path):
                text = read_text(path)
                if name.endswith(".json"):
                    # Normalise to a compact JSON list so the workflow recognises the JSON form.
                    text = json.dumps(json.loads(text))
                body[key] = text
                break
        else:
            sys.exit("missing input for %s: none of %s in %s" % (key, names, args.input_dir))
    out = args.output or "request.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(body, f)
    print("wrote %s (workflow %s)" % (out, WORKFLOW_RESOURCE_ID))


def find_result(node):
    if isinstance(node, dict):
        if all(k in node for k in OUTPUTS):
            return node
        for v in node.values():
            found = find_result(v)
            if found is not None:
                return found
    elif isinstance(node, list):
        for v in node:
            found = find_result(v)
            if found is not None:
                return found
    elif isinstance(node, str) and "intcalc_systran" in node:
        try:
            return find_result(json.loads(node))
        except ValueError:
            return None
    return None


def write_outputs(args):
    with open(args.result, encoding="utf-8") as f:
        result = find_result(json.load(f))
    if result is None:
        sys.exit("no %s in %s" % (" / ".join(OUTPUTS), args.result))
    os.makedirs(args.out_dir, exist_ok=True)
    for name in OUTPUTS:
        path = os.path.join(args.out_dir, name + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result[name], f, indent=2)
        print("wrote %s (%d records)" % (path, len(result[name])))
    for w in result.get("warnings") or []:
        print("warning: " + w, file=sys.stderr)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build-request")
    b.add_argument("input_dir")
    b.add_argument("-o", "--output")
    b.add_argument("--parm", default=DEFAULT_PARM, help="INTCALC PARM / interestRunDate")
    b.add_argument("--batch-id")
    b.set_defaults(func=build_request)
    w = sub.add_parser("write-outputs")
    w.add_argument("result")
    w.add_argument("out_dir", nargs="?", default="output")
    w.set_defaults(func=write_outputs)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
