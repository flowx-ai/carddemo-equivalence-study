#!/usr/bin/env python3
"""File wrapper around the FlowX workflow `posttran_daily_posting` (CardDemo POSTTRAN).

All posting logic runs in FlowX. This script only moves files in and out:

  prepare  <input_dir> <body.json>   read the CONTRACT.md input files and write the
                                      workflow's START input body
  emit     <result.json> <output_dir> take the workflow's END output (or any JSON that
                                      contains it) and write the CONTRACT.md outputs

Run the workflow between the two steps with the body from `prepare`, e.g. via the
FlowX MCP tool `run_workflow { workflowResourceId, inputBody }`, or the Designer's
"Run workflow", and save the END node output as result.json.
"""
import json
import os
import sys

BUSINESS_DATE = "2022-07-18"  # CONTRACT.md run parameter

# workflow input key -> file name (CONTRACT.md "Inputs")
INPUT_FILES = {
    "dailytranDat": "dailytran.dat",
    "acctdataDat": "acctdata.dat",
    "cardxrefDat": "cardxref.dat",
    "tcatbalDat": "tcatbal.dat",
    "carddataDat": "carddata.dat",  # read by the workflow only when validationProfile=WIKI
}
REQUIRED = ("acctdataDat", "cardxrefDat")

# workflow output key -> file name (CONTRACT.md "Outputs", POSTTRAN rows)
OUTPUT_FILES = {
    "posttran_transact": "posttran_transact.json",
    "posttran_dalyrejs": "posttran_dalyrejs.json",
    "posttran_acctdata": "posttran_acctdata.json",
    "posttran_tcatbal": "posttran_tcatbal.json",
}


def read_fixed_width(path):
    # latin-1 maps every byte to one character, so record offsets survive unchanged.
    with open(path, "rb") as f:
        return f.read().decode("latin-1")


def prepare(input_dir, body_path, profile="LEGACY"):
    body = {"businessDate": BUSINESS_DATE, "validationProfile": profile}
    for key, name in INPUT_FILES.items():
        path = os.path.join(input_dir, name)
        if os.path.exists(path):
            body[key] = read_fixed_width(path)
        elif key in REQUIRED:
            sys.exit(f"missing required input file: {path}")
        else:
            body[key] = ""
    with open(body_path, "w", encoding="utf-8") as f:
        json.dump(body, f, ensure_ascii=False)
    print(f"wrote {body_path} ({os.path.getsize(body_path)} bytes)")


def find_result(node):
    """Locate the object holding posttran_transact, however the run output was wrapped."""
    if isinstance(node, dict):
        if "posttran_transact" in node:
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
    return None


def emit(result_path, output_dir):
    with open(result_path, encoding="utf-8") as f:
        result = find_result(json.load(f))
    if result is None:
        sys.exit(f"{result_path} does not contain the posttran_* outputs")
    os.makedirs(output_dir, exist_ok=True)
    for key, name in OUTPUT_FILES.items():
        rows = result.get(key) or []
        with open(os.path.join(output_dir, name), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=1)
        print(f"{name}: {len(rows)} records")
    stats = result.get("posttran_stats")
    if stats:
        print("stats:", json.dumps(stats))


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "prepare":
        prepare(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "LEGACY")
    elif len(sys.argv) == 4 and sys.argv[1] == "emit":
        emit(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
