"""Build the inputBody for the FlowX workflow posttran_daily_transaction_posting.

Usage: python3 -I tools/build_input.py <input_dir> [business_date] [batch_id] > input_body.json

Reads the POSTTRAN input files named in CONTRACT.md (dailytran.dat, acctdata.dat, cardxref.dat,
tcatbal.dat) from <input_dir> and prints the JSON body run_workflow takes. The other contract inputs
(custdata, carddata, trantype, trancatg, discgrp) are not read by POSTTRAN and are ignored.
"""
import json
import os
import sys

FILES = {
    "dailytranFile": "dailytran.dat",
    "acctdataFile": "acctdata.dat",
    "cardxrefFile": "cardxref.dat",
    "tcatbalFile": "tcatbal.dat",
}


def read(path):
    if not os.path.exists(path):
        return ""
    with open(path, "rb") as fh:
        return fh.read().decode("latin-1")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    input_dir = sys.argv[1]
    body = {
        "businessDate": sys.argv[2] if len(sys.argv) > 2 else "2022-07-18",
        "batchId": sys.argv[3] if len(sys.argv) > 3 else "POSTTRAN",
    }
    for key, name in FILES.items():
        body[key] = read(os.path.join(input_dir, name))
    json.dump(body, sys.stdout)


if __name__ == "__main__":
    main()
