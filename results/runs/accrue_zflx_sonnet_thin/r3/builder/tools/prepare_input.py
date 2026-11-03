#!/usr/bin/env python3
"""Build the inputBody for the FlowX workflow `accrue_interest_calculation` from the run's .dat files.

usage: python3 -I tools/prepare_input.py <input_dir> <out.json> [--parm 2022071800] [--ts 2022-07-18-00.00.00.000000]

Only the files ACCRUE reads are sent: ledgacc.dat (LXV022Y), balcat.dat (LXV026Y),
rategrp.dat (LXV027Y), cardlink.dat (LXV024Y). Per CONTRACT.md step isolation, ledgacc.dat and
balcat.dat are the oracle's POSTDAY outputs.
"""
import argparse
import json
import os


def read(path):
    with open(path, encoding="latin-1", newline="") as f:
        return "\n".join(line.rstrip("\r\n") for line in f.read().splitlines())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir")
    ap.add_argument("out")
    ap.add_argument("--parm", default="2022071800", help="ACCRUE PARM / interestRunDate")
    ap.add_argument("--ts", default=None, help="fixed DB2 timestamp for orig_ts/proc_ts (default: run clock)")
    a = ap.parse_args()

    body = {"interestRunDate": a.parm}
    for name in ("ledgacc", "balcat", "rategrp", "cardlink"):
        body[name] = read(os.path.join(a.input_dir, name + ".dat"))
    if a.ts:
        body["runTimestamp"] = a.ts
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(body, f)


if __name__ == "__main__":
    main()
