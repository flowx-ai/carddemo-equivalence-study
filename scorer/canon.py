# Canonical records for the CardDemo batch outputs: one parser for the oracle's fixed-width dumps and for a
# candidate's JSON, so both sides are compared as typed fields, never as bytes. Layouts from the copybooks.
import json, pathlib, sys
from decimal import Decimal
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "tools"))
from ref_posttran_lib import zoned

# (field, start, end, type)  n = PIC 9 (int), d = PIC S9..V99 (Decimal), x = PIC X (string, trailing spaces/low-values trimmed)
TRAN = [("tran_id", 0, 16, "x"), ("type_cd", 16, 18, "x"), ("cat_cd", 18, 22, "n"), ("source", 22, 32, "x"),
        ("desc", 32, 132, "x"), ("amt", 132, 143, "d"), ("merchant_id", 143, 152, "n"), ("merchant_name", 152, 202, "x"),
        ("merchant_city", 202, 252, "x"), ("merchant_zip", 252, 262, "x"), ("card_num", 262, 278, "x"),
        ("orig_ts", 278, 304, "x"), ("proc_ts", 304, 330, "x")]
ACCT = [("acct_id", 0, 11, "n"), ("active_status", 11, 12, "x"), ("curr_bal", 12, 24, "d"), ("credit_limit", 24, 36, "d"),
        ("cash_credit_limit", 36, 48, "d"), ("open_date", 48, 58, "x"), ("expiration_date", 58, 68, "x"),
        ("reissue_date", 68, 78, "x"), ("curr_cyc_credit", 78, 90, "d"), ("curr_cyc_debit", 90, 102, "d"),
        ("addr_zip", 102, 112, "x"), ("group_id", 112, 122, "x")]
TCAT = [("acct_id", 0, 11, "n"), ("type_cd", 11, 13, "x"), ("cat_cd", 13, 17, "n"), ("bal", 17, 28, "d")]
REJ = TRAN + [("reason", 350, 354, "n"), ("reason_desc", 354, 430, "x")]

def _card_ordinal(recs):
    # interest TRAN-IDs are a generated counter, so interest records are matched on card + occurrence, not on ID
    seen, out = {}, {}
    for r in sorted(recs, key=lambda r: r["tran_id"]):
        n = seen[r["card_num"]] = seen.get(r["card_num"], 0) + 1
        out[f'{r["card_num"]}#{n}'] = r
    return out

OUTPUTS = {  # name: (layout, record length, key)
    "posttran_transact": (TRAN, 350, lambda rs: {r["tran_id"]: r for r in rs}),
    "posttran_dalyrejs": (REJ, 430, lambda rs: {r["tran_id"]: r for r in rs}),
    "posttran_acctdata": (ACCT, 300, lambda rs: {f'{r["acct_id"]:011d}': r for r in rs}),
    "posttran_tcatbal": (TCAT, 50, lambda rs: {f'{r["acct_id"]:011d}|{r["type_cd"]}|{r["cat_cd"]:04d}': r for r in rs}),
    "intcalc_systran": (TRAN, 350, _card_ordinal),
    "intcalc_acctdata": (ACCT, 300, lambda rs: {f'{r["acct_id"]:011d}': r for r in rs}),
}

def norm(typ, v):
    if v is None: return None
    if typ == "n": return int(str(v).strip() or 0)
    if typ == "d": return Decimal(str(v))
    return str(v).rstrip(" \x00")   # trailing spaces and low-values are padding, not content

def parse_fixed(line, layout, length):
    line = line.ljust(length)  # LINE SEQUENTIAL dumps drop trailing spaces
    return {f: (zoned(line[a:b], 2) if t == "d" else norm(t, line[a:b])) for f, a, b, t in layout}

def load(d, name):
    """Records of one output from a run directory: <name>.json (candidate contract) or <name>.txt (fixed width).
    Returns {key: record} or None when the output is absent."""
    layout, length, keyf = OUTPUTS[name]
    d = pathlib.Path(d); j, t = d / f"{name}.json", d / f"{name}.txt"
    if j.exists():
        types = {f: ty for f, _, _, ty in layout}
        recs = [{f: norm(types[f], r.get(f)) for f in types} for r in json.loads(j.read_text())]
    elif t.exists():
        recs = [parse_fixed(l, layout, length) for l in t.read_text().split("\n") if l]
    else:
        return None
    keyed = keyf(recs)
    if len(keyed) != len(recs): raise SystemExit(f"{name}: duplicate keys in {d}")
    return keyed

def to_json(recs):
    return [{k: (f"{v}" if isinstance(v, Decimal) else v) for k, v in r.items()} for r in recs]

if __name__ == "__main__":  # dump a run directory as contract JSON: canon.py <run/out> <dest>
    src, dst = map(pathlib.Path, sys.argv[1:3]); dst.mkdir(parents=True, exist_ok=True)
    for n in OUTPUTS:
        recs = load(src, n)
        if recs is not None: (dst / f"{n}.json").write_text(json.dumps(to_json(recs.values()), indent=1))
