#!/usr/bin/env python3
"""File I/O around the FlowX workflow `intcalc_interest_calculation` (CardDemo INTCALC / CBACT04C).

  prepare <input_dir> [parm]        -> prints the workflow inputBody (JSON) built from
                                       tcatbal.dat, acctdata.dat, cardxref.dat, discgrp.dat
  split   <end_output.json> <out_dir> -> writes intcalc_systran.json and intcalc_acctdata.json
                                       from the workflow END output (or a get_workflow_run dump)

The calculation itself runs in FlowX; this script only moves files in and out.
"""
import json
import os
import sys

INPUTS = {"tcatbal": "tcatbal.dat", "acctdata": "acctdata.dat",
          "cardxref": "cardxref.dat", "discgrp": "discgrp.dat"}
DEFAULT_PARM = "2022071800"


def prepare(input_dir, parm=DEFAULT_PARM):
    body = {"parmDate": parm}
    for key, name in INPUTS.items():
        with open(os.path.join(input_dir, name), encoding="latin-1", newline="") as f:
            body[key] = f.read()
    json.dump(body, sys.stdout)


def _find(result, key):
    if isinstance(result, dict):
        if key in result:
            return result[key]
        for v in result.values():
            found = _find(v, key)
            if found is not None:
                return found
    return None


def split(result_path, out_dir):
    with open(result_path, encoding="utf-8") as f:
        result = json.load(f)
    os.makedirs(out_dir, exist_ok=True)
    for key in ("intcalc_systran", "intcalc_acctdata"):
        rows = _find(result, key)
        if rows is None:
            sys.exit(f"{key} not found in {result_path}")
        with open(os.path.join(out_dir, key + ".json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)
        print(f"{key}.json: {len(rows)} records")
    summary = _find(result, "intcalc_summary")
    if summary and summary.get("warnings"):
        print("warnings:", *summary["warnings"], sep="\n  ")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "prepare":
        prepare(sys.argv[2], *sys.argv[3:4])
    elif len(sys.argv) == 4 and sys.argv[1] == "split":
        split(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
