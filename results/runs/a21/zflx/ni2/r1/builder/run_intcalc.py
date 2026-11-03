#!/usr/bin/env python3
"""File adapter for the FlowX workflow `intcalc_batch` (CardDemo INTCALC).

The interest logic lives in the FlowX workflow; this script only moves data:

  build-input  <input_dir> [--parm 2022071800] [--out input.json]
      Reads acctdata.dat, tcatbal.dat, discgrp.dat, cardxref.dat from <input_dir> and writes the
      workflow's inputBody JSON (the files are passed verbatim as text).

  write-outputs <result.json> [--out-dir .]
      Takes the workflow's END output (the object holding intcalc_systran / intcalc_acctdata)
      and writes intcalc_systran.json and intcalc_acctdata.json as CONTRACT.md requires.
"""
import argparse
import json
import os
import sys

INPUT_FILES = {"acctdata": "acctdata.dat", "tcatbal": "tcatbal.dat",
               "discgrp": "discgrp.dat", "cardxref": "cardxref.dat"}


def build_input(input_dir, parm, out):
    body = {"interestRunDate": parm}
    for key, name in INPUT_FILES.items():
        # latin-1 keeps one character per byte, so fixed-width positions are preserved
        with open(os.path.join(input_dir, name), encoding="latin-1", newline="") as f:
            body[key] = f.read()
    text = json.dumps(body)
    if out == "-":
        sys.stdout.write(text)
    else:
        with open(out, "w", encoding="utf-8") as f:
            f.write(text)


def write_outputs(result_path, out_dir):
    with open(result_path, encoding="utf-8") as f:
        result = json.load(f)
    # accept either the END payload itself or a wrapper that contains it under "result"
    if "intcalc_systran" not in result and isinstance(result.get("result"), dict):
        result = result["result"]
    os.makedirs(out_dir, exist_ok=True)
    for name in ("intcalc_systran", "intcalc_acctdata"):
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(result[name], f, indent=2)
            f.write("\n")
    print(json.dumps(result.get("report", {}), indent=2))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build-input")
    b.add_argument("input_dir")
    b.add_argument("--parm", default="2022071800", help="INTCALC PARM / interestRunDate")
    b.add_argument("--out", default="-")
    w = sub.add_parser("write-outputs")
    w.add_argument("result_json")
    w.add_argument("--out-dir", default=".")
    a = p.parse_args()
    if a.cmd == "build-input":
        build_input(a.input_dir, a.parm, a.out)
    else:
        write_outputs(a.result_json, a.out_dir)


if __name__ == "__main__":
    main()
