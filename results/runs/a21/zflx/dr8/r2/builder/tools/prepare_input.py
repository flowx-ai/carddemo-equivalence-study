#!/usr/bin/env python3
"""Build the FlowX workflow input body from the POSTTRAN input files.

Usage: python3 -I tools/prepare_input.py <input_dir> <out_body.json> [--business-date 2022-07-18] [--batch-id ID]

The workflow `posttran_daily_transaction_posting` takes each file's raw content as a string and
does all parsing, validation and posting itself; this script only reads the files.
"""
import argparse
import json
import os

FILES = ("dailytran", "acctdata", "cardxref", "tcatbal")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir")
    ap.add_argument("out_file")
    ap.add_argument("--business-date", default="2022-07-18")
    ap.add_argument("--batch-id", default="POSTTRAN")
    args = ap.parse_args()

    body = {"batchId": args.batch_id, "businessDate": args.business_date}
    for name in FILES:
        path = os.path.join(args.input_dir, name + ".dat")
        # latin-1 keeps every byte as one character, so fixed-width offsets are preserved.
        with open(path, encoding="latin-1", newline="") as fh:
            body[name] = fh.read()
    with open(args.out_file, "w", encoding="utf-8") as fh:
        json.dump(body, fh, ensure_ascii=False)


if __name__ == "__main__":
    main()
