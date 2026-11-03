#!/usr/bin/env python3
"""CardDemo INTCALC step runner (FlowX implementation: workflow `intcalc_batch`).

The interest logic lives in src/intcalc_core.py, which is byte-for-byte the code
of the "Compute Interest" SCRIPT node of the FlowX workflow. This runner only
does file I/O around it.

  # compute locally with the same core and write the contract outputs
  python3 run_intcalc.py --input-dir IN --output-dir OUT

  # FlowX path: build the workflow input, run it in FlowX, write the outputs
  python3 run_intcalc.py --input-dir IN --emit-flowx-input flowx_input.json
  (run workflow intcalc_batch with that body; save its END output as result.json)
  python3 run_intcalc.py --from-flowx-result result.json --output-dir OUT

Outputs (CONTRACT.md, step INTCALC): intcalc_systran.json, intcalc_acctdata.json,
plus flags.json and a copy of assumptions.md next to them.
"""
import argparse
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "src"))
import intcalc_core as core  # noqa: E402

PARM_DATE = "2022071800"      # INTCALC parameter (CONTRACT.md)
BUSINESS_DATE = "2022-07-18"  # business date (CONTRACT.md)


def _read(path):
    with open(path, "r", encoding="latin-1", newline="") as f:
        return f.read().replace("\r\n", "\n")


def _first_existing(input_dir, names):
    for n in names:
        p = os.path.join(input_dir, n)
        if os.path.isfile(p):
            return p
    return None


def _accounts_from_json(path):
    out = []
    for r in json.loads(_read(path)):
        out.append({
            "acct_id": int(r["acct_id"]),
            "active_status": str(r.get("active_status") or "").rstrip(),
            "curr_bal": core.parse_decimal(r.get("curr_bal", 0)),
            "credit_limit": core.parse_decimal(r.get("credit_limit", 0)),
            "cash_credit_limit": core.parse_decimal(r.get("cash_credit_limit", 0)),
            "open_date": str(r.get("open_date") or "").rstrip(),
            "expiration_date": str(r.get("expiration_date") or "").rstrip(),
            "reissue_date": str(r.get("reissue_date") or "").rstrip(),
            "curr_cyc_credit": core.parse_decimal(r.get("curr_cyc_credit", 0)),
            "curr_cyc_debit": core.parse_decimal(r.get("curr_cyc_debit", 0)),
            "addr_zip": str(r.get("addr_zip") or "").rstrip(),
            "group_id": str(r.get("group_id") or ""),
        })
    return out


def _tcatbal_from_json(path):
    return [{"acct_id": int(r["acct_id"]), "type_cd": str(r["type_cd"]),
             "cat_cd": int(r["cat_cd"]), "bal": core.parse_decimal(r["bal"])}
            for r in json.loads(_read(path))]


def load_inputs(args):
    """Resolve the four INTCALC inputs (A13: POSTTRAN outputs win when present)."""
    d = args.input_dir
    acct = args.acctdata or _first_existing(d, [
        "posttran_acctdata.txt", "posttran_acctdata.dat", "posttran_acctdata.json",
        "acctdata.dat", "acctdata.txt"])
    tcat = args.tcatbal or _first_existing(d, [
        "posttran_tcatbal.txt", "posttran_tcatbal.dat", "posttran_tcatbal.json",
        "tcatbal.dat", "tcatbal.txt"])
    xref = args.cardxref or _first_existing(d, ["cardxref.dat", "cardxref.txt"])
    disc = args.discgrp or _first_existing(d, ["discgrp.dat", "discgrp.txt"])
    missing = [n for n, p in (("acctdata", acct), ("tcatbal", tcat),
                              ("cardxref", xref), ("discgrp", disc)) if not p]
    if missing:
        sys.exit("missing input file(s) in %s: %s" % (d, ", ".join(missing)))
    inp = {"acct_path": acct, "tcat_path": tcat,
           "cardxref": _read(xref), "discgrp": _read(disc),
           "accounts": None, "tcatbal": None, "acctdata": "", "tcatbal_text": ""}
    if acct.endswith(".json"):
        inp["accounts"] = _accounts_from_json(acct)
    else:
        inp["acctdata"] = _read(acct)
    if tcat.endswith(".json"):
        inp["tcatbal"] = _tcatbal_from_json(tcat)
    else:
        inp["tcatbal_text"] = _read(tcat)
    return inp


def write_outputs(out_dir, result):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "intcalc_systran.json"), "w") as f:
        json.dump(result["systran"], f, indent=1)
    with open(os.path.join(out_dir, "intcalc_acctdata.json"), "w") as f:
        json.dump(result["accounts"], f, indent=1)

    # flags.json: uncertainties declared before scoring (CONTRACT.md).
    flags = []
    last = result.get("last_account_id", result.get("lastAccountId"))
    if last is not None:
        flags.append({"output": "intcalc_acctdata.json", "key": str(last),
                      "source": "assumptions.md A4 (last account not rewritten, "
                                "src/intcalc_core.py post_last_account)"})
    for w in result.get("warnings") or []:
        flags.append({"output": "intcalc_systran.json", "key": w,
                      "source": "assumptions.md A12"})
    with open(os.path.join(out_dir, "flags.json"), "w") as f:
        json.dump(flags, f, indent=1)

    src = os.path.join(HERE, "assumptions.md")
    dst = os.path.join(out_dir, "assumptions.md")
    if os.path.isfile(src) and os.path.abspath(src) != os.path.abspath(dst):
        shutil.copyfile(src, dst)
    for w in result.get("warnings") or []:
        print("warning:", w, file=sys.stderr)
    print("wrote %d interest transactions, %d accounts to %s"
          % (len(result["systran"]), len(result["accounts"]), out_dir))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input-dir", default=".")
    ap.add_argument("--output-dir", default=HERE)
    for name in ("--acctdata", "--tcatbal", "--cardxref", "--discgrp"):
        ap.add_argument(name, help="explicit path (overrides --input-dir lookup)")
    ap.add_argument("--parm-date", default=PARM_DATE)
    ap.add_argument("--business-date", default=BUSINESS_DATE)
    ap.add_argument("--post-last-account", action="store_true",
                    help="also rewrite the last account (wiki-literal; legacy does not, A4)")
    ap.add_argument("--emit-flowx-input", metavar="FILE",
                    help="write the intcalc_batch workflow input body and exit")
    ap.add_argument("--from-flowx-result", metavar="FILE",
                    help="write outputs from a saved intcalc_batch END output")
    args = ap.parse_args()

    if args.from_flowx_result:
        res = json.loads(_read(args.from_flowx_result))
        res = res.get("output", res)
        write_outputs(args.output_dir, res)
        return

    inp = load_inputs(args)
    if args.emit_flowx_input:
        if inp["accounts"] is not None or inp["tcatbal"] is not None:
            sys.exit("the FlowX workflow takes fixed-width text; JSON inputs are local-only")
        body = {"acctdata": inp["acctdata"], "tcatbal": inp["tcatbal_text"],
                "cardxref": inp["cardxref"], "discgrp": inp["discgrp"],
                "parmDate": args.parm_date, "businessDate": args.business_date,
                "postLastAccount": bool(args.post_last_account)}
        with open(args.emit_flowx_input, "w") as f:
            json.dump(body, f)
        print("wrote", args.emit_flowx_input)
        return

    res = core.run_intcalc(inp["acctdata"], inp["tcatbal_text"], inp["cardxref"],
                           inp["discgrp"], args.parm_date, args.business_date,
                           args.post_last_account,
                           accounts=inp["accounts"], tcatbal=inp["tcatbal"])
    write_outputs(args.output_dir, res)


if __name__ == "__main__":
    main()
