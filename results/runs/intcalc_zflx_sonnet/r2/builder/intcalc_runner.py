#!/usr/bin/env python3
"""INTCALC (CardDemo interest calculation, CBACT04C) runner for the FlowX implementation.

All business logic lives in the FlowX workflow `intcalc_interest_calculation`. This script only
moves data across the boundary:

  prepare  read the fixed-width input files and write the workflow's INPUT body (JSON)
  emit     turn the workflow's END output into the CONTRACT.md outputs:
           intcalc_systran.json and intcalc_acctdata.json

Typical run:
  python3 intcalc_runner.py prepare --input-dir <dir with .dat files> --out intcalc_input.json
  (run workflow intcalc_interest_calculation with that body; save its END output as JSON)
  python3 intcalc_runner.py emit --result intcalc_result.json --out-dir output

Standard library only.
"""
import argparse
import json
import os
import sys
from decimal import Decimal

DEFAULT_RUN_DATE = "2022071800"  # CONTRACT.md: INTCALC parameter

# workflow INPUT key -> input file name (CONTRACT.md "Inputs")
INPUT_FILES = [
    ("tcatbalFile", "tcatbal.dat", True),    # CVTRA01Y, 50
    ("acctdataFile", "acctdata.dat", True),  # CVACT01Y, 300
    ("discgrpFile", "discgrp.dat", True),    # CVTRA02Y, 50
    ("cardxrefFile", "cardxref.dat", False), # CVACT03Y, 50
]


def read_text(path):
    # latin-1 maps every byte to one character, so fixed-width offsets are preserved
    with open(path, "r", encoding="latin-1", newline="") as f:
        return f.read()


def prepare(args):
    body = {"interestRunDate": args.run_date}
    for key, name, required in INPUT_FILES:
        path = os.path.join(args.input_dir, name)
        if os.path.exists(path):
            body[key] = read_text(path)
        elif required:
            sys.exit("missing required input file: %s" % path)
        else:
            body[key] = ""
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(body, f)
    print("wrote %s" % args.out)


def find_result(node):
    """Locate the END output object (has transactions + accounts) inside whatever JSON was saved."""
    if isinstance(node, dict):
        if "transactions" in node and "accounts" in node:
            return node
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


def amount(value):
    d = Decimal(str(value if value not in (None, "") else 0)).quantize(Decimal("0.01"))
    if d == 0:
        d = Decimal("0.00")
    return str(d)


def as_int(value):
    s = str(value if value is not None else "").strip()
    return int(s) if s else 0


def text(value):
    return ("" if value is None else str(value)).rstrip()


def emit(args):
    with open(args.result, "r", encoding="utf-8") as f:
        result = find_result(json.load(f))
    if result is None:
        sys.exit("no object with 'transactions' and 'accounts' found in %s" % args.result)

    systran = [
        {
            "tran_id": text(t.get("transactionId")),
            "type_cd": text(t.get("typeCode")),
            "cat_cd": as_int(t.get("categoryCode")),
            "source": text(t.get("source")),
            "desc": text(t.get("description")),
            "amt": amount(t.get("amount")),
            "merchant_id": as_int(t.get("merchantId")),
            "merchant_name": text(t.get("merchantName")),
            "merchant_city": text(t.get("merchantCity")),
            "merchant_zip": text(t.get("merchantZip")),
            "card_num": text(t.get("cardNumber")),
            "orig_ts": text(t.get("originalTimestamp")),
            "proc_ts": text(t.get("processedTimestamp")),
        }
        for t in result.get("transactions") or []
    ]
    acctdata = [
        {
            "acct_id": as_int(a.get("accountId")),
            "active_status": text(a.get("activeStatus")),
            "curr_bal": amount(a.get("currentBalance")),
            "credit_limit": amount(a.get("creditLimit")),
            "cash_credit_limit": amount(a.get("cashCreditLimit")),
            "open_date": text(a.get("openDate")),
            "expiration_date": text(a.get("expiryDate")),
            "reissue_date": text(a.get("reissueDate")),
            "curr_cyc_credit": amount(a.get("currentCycleCredit")),
            "curr_cyc_debit": amount(a.get("currentCycleDebit")),
            "addr_zip": text(a.get("addressZip")),
            "group_id": text(a.get("groupId")),
        }
        for a in result.get("accounts") or []
    ]

    os.makedirs(args.out_dir, exist_ok=True)
    for name, rows in (("intcalc_systran.json", systran), ("intcalc_acctdata.json", acctdata)):
        with open(os.path.join(args.out_dir, name), "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)
    print("wrote %d transactions, %d accounts to %s" % (len(systran), len(acctdata), args.out_dir))
    summary = result.get("runSummary")
    if summary:
        print("run summary: %s" % json.dumps(summary))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("prepare", help="input files -> workflow INPUT body")
    p.add_argument("--input-dir", required=True)
    p.add_argument("--run-date", default=DEFAULT_RUN_DATE, help="INTCALC PARM (default %s)" % DEFAULT_RUN_DATE)
    p.add_argument("--out", default="intcalc_input.json")
    p.set_defaults(func=prepare)

    e = sub.add_parser("emit", help="workflow END output -> contract JSON outputs")
    e.add_argument("--result", required=True)
    e.add_argument("--out-dir", default="output")
    e.set_defaults(func=emit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
