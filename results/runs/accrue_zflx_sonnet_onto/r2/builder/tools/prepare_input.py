#!/usr/bin/env python3
"""Build the inputBody for the FlowX `interest-calculation` workflow.

Usage: python3 -I prepare_input.py <input_dir> [--parm 2022071800] [--run-timestamp ISO]
                                   [--rewrite-last-account] > input_body.json

For each of ledgacc, cardlink, balcat and rategrp the file <name>.dat is used
(fixed width, as the COBOL chain reads it). Step isolation: when the oracle's
POSTDAY outputs are supplied as postday_ledgacc.json / postday_balcat.json
instead of ledgacc.dat / balcat.dat, those are passed through as JSON lists
(the workflow accepts either form). The file text is sent untouched; all
decoding happens in the workflow.
"""
import argparse
import json
import os
import sys

SOURCES = {
    "ledgaccDat": ["ledgacc.dat", "ledgacc.txt", "postday_ledgacc.json"],
    "cardlinkDat": ["cardlink.dat", "cardlink.txt"],
    "balcatDat": ["balcat.dat", "balcat.txt", "postday_balcat.json"],
    "rategrpDat": ["rategrp.dat", "rategrp.txt"],
}


def read_first(directory, names):
    for name in names:
        path = os.path.join(directory, name)
        if os.path.isfile(path):
            with open(path, "r", encoding="latin-1", newline="") as fh:
                return name, fh.read()
    sys.exit("missing input: none of %s in %s" % (", ".join(names), directory))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir")
    ap.add_argument("--parm", default="2022071800", help="ACCRUE PARM / interestRunDate")
    ap.add_argument("--run-timestamp", default=None, help="fix the transaction timestamps (ISO-8601)")
    ap.add_argument("--rewrite-last-account", action="store_true",
                    help="also rewrite the last account (not legacy behaviour, see assumptions.md A-01)")
    args = ap.parse_args()

    body = {"interestRunDate": args.parm}
    for key, names in SOURCES.items():
        name, text = read_first(args.input_dir, names)
        body[key] = text
        print("%s <- %s" % (key, name), file=sys.stderr)
    if args.rewrite_last_account:
        body["rewriteLastAccount"] = True
    if args.run_timestamp:
        body["runTimestamp"] = args.run_timestamp
    json.dump(body, sys.stdout)


if __name__ == "__main__":
    main()
