#!/usr/bin/env python3
"""Run harness for the FlowX workflow `accrue_interest_calculation` (Ledgerline ACCRUE / LXB002C).

The interest calculation itself runs in FlowX (see flowx/*.js, deployed as the workflow's SCRIPT nodes).
This harness only moves files in and out:

  1. prepare  - read the run's input files and write the workflow's input body (JSON)
  2. (run the workflow in FlowX with that body, e.g. MCP `run_workflow`, and save the END output)
  3. split    - turn the END output into accrue_systxn.json / accrue_ledgacc.json next to
                assumptions.md and flags.json

Stdlib only.
"""
import argparse
import json
import shutil
import sys
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_RUN_DATE = "2022071800"   # ACCRUE PARM for business date 2022-07-18 (CONTRACT.md)

POS = "{ABCDEFGHI"


def zoned(value, digits):
    """Amount -> signed zoned decimal with trailing overpunch, 2 implied decimals."""
    cents = int((Decimal(str(value)) * 100).to_integral_value())
    body = str(abs(cents)).rjust(digits, "0")[-digits:]
    last = int(body[-1])
    sign_char = POS[last] if cents >= 0 else "}JKLMNOPQR"[last]
    return body[:-1] + sign_char


def fixed(value, width):
    return str("" if value is None else value).ljust(width)[:width]


def ledgacc_from_json(rows):
    out = []
    for a in rows:
        out.append("".join([
            str(int(a["acct_id"])).rjust(11, "0"), fixed(a.get("active_status"), 1),
            zoned(a["curr_bal"], 12), zoned(a["credit_limit"], 12), zoned(a["cash_credit_limit"], 12),
            fixed(a.get("open_date"), 10), fixed(a.get("expiration_date"), 10), fixed(a.get("reissue_date"), 10),
            zoned(a["curr_cyc_credit"], 12), zoned(a["curr_cyc_debit"], 12),
            fixed(a.get("addr_zip"), 10), fixed(a.get("group_id"), 10),
        ]))
    return "\n".join(out) + "\n"


def balcat_from_json(rows):
    out = []
    for b in rows:
        out.append(str(int(b["acct_id"])).rjust(11, "0") + fixed(b["type_cd"], 2)
                   + str(int(b["cat_cd"])).rjust(4, "0") + zoned(b["bal"], 11))
    return "\n".join(out) + "\n"


def read_input(input_dir, dat_name, json_name, from_json):
    """Prefer the fixed-width .dat; fall back to the oracle POSTDAY dump (.txt) or JSON output."""
    dat = input_dir / dat_name
    if dat.exists():
        return dat.read_text(encoding="latin-1")
    if json_name:
        txt = input_dir / (json_name + ".txt")
        if txt.exists():
            return txt.read_text(encoding="latin-1")
        js = input_dir / (json_name + ".json")
        if js.exists():
            return from_json(json.loads(js.read_text(encoding="utf-8")))
    raise SystemExit("missing input: %s in %s" % (dat_name, input_dir))


def prepare(args):
    d = Path(args.input_dir)
    body = {
        "interestRunDate": args.run_date,
        "ledgaccDat": read_input(d, "ledgacc.dat", "postday_ledgacc", ledgacc_from_json),
        "balcatDat": read_input(d, "balcat.dat", "postday_balcat", balcat_from_json),
        "rategrpDat": read_input(d, "rategrp.dat", None, None),
        "cardlinkDat": read_input(d, "cardlink.dat", None, None),
    }
    if args.run_timestamp:
        body["runTimestamp"] = args.run_timestamp
    if args.rounding:
        body["roundingMode"] = args.rounding
    if args.update_final_account:
        body["updateFinalAccount"] = True
    text = json.dumps(body)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def find_result(obj):
    if isinstance(obj, dict):
        if "accrue_systxn" in obj and "accrue_ledgacc" in obj:
            return obj
        for v in obj.values():
            r = find_result(v)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_result(v)
            if r is not None:
                return r
    return None


def split(args):
    result = find_result(json.loads(Path(args.result).read_text(encoding="utf-8")))
    if result is None:
        raise SystemExit("no accrue_systxn/accrue_ledgacc in %s" % args.result)
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name in ("accrue_systxn", "accrue_ledgacc"):
        (out / (name + ".json")).write_text(json.dumps(result[name], indent=1), encoding="utf-8")
    for doc in ("assumptions.md", "flags.json"):
        if (HERE / doc).exists() and (HERE / doc).resolve() != (out / doc).resolve():
            shutil.copyfile(HERE / doc, out / doc)
    for w in result.get("warnings") or []:
        print("warning:", w, file=sys.stderr)
    print(json.dumps(result.get("stats") or {}), file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prepare", help="build the workflow input body from a run's input files")
    p.add_argument("--input-dir", required=True)
    p.add_argument("--run-date", default=DEFAULT_RUN_DATE, help="interestRunDate / legacy PARM (X(10))")
    p.add_argument("--run-timestamp", help="orig_ts/proc_ts override, e.g. 2022-07-18-23.00.00.000000")
    p.add_argument("--rounding", choices=["TRUNCATE", "HALF_UP"])
    p.add_argument("--update-final-account", action="store_true", help="see assumptions.md A-06")
    p.add_argument("--out")
    p.set_defaults(fn=prepare)
    s = sub.add_parser("split", help="write contract outputs from the workflow END output")
    s.add_argument("--result", required=True, help="JSON file holding the workflow END output")
    s.add_argument("--output-dir", required=True)
    s.set_defaults(fn=split)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
