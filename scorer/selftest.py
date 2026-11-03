# Scorer validation: plant known defects in copies of the golden outputs and assert the scorer reports exactly
# the planted divergences, with the pre-registered tags, and nothing else. usage: python3 selftest.py
import copy, json, pathlib, shutil, sys
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
import canon, compare

ROOT = pathlib.Path(__file__).resolve().parent.parent
GOLD = {"base": ROOT / "golden/v1", **{c: ROOT / f"golden/v1/cases/{c}/out" for c in ("c01", "c02", "c03", "c04")}}
INP = {"base": ROOT / "data/in", **{c: ROOT / f"cases/{c}/in" for c in ("c01", "c02", "c03", "c04")}}
WORK = pathlib.Path(__file__).parent / "selftest"
c = Decimal

def load_all(case): return {n: canon.load(GOLD[case], n) for n in canon.OUTPUTS}
def write(name, recs, flags=None):
    d = WORK / name; shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
    for n, r in recs.items(): (d / f"{n}.json").write_text(json.dumps(canon.to_json(r.values())))
    if flags is not None: (d / "flags.json").write_text(json.dumps(flags))
    return d
def acct_of(t): return f'{int(t["desc"].split()[-1]):011d}'   # "Int. for a/c 00000000001"

def rated(case):
    """(tcat key, exact interest) for every category balance that produces an interest transaction, in run order."""
    R = load_all(case)
    disc = {l[0:16]: canon.zoned(l[16:22], 2) for l in (INP[case] / "discgrp.dat").read_text().split("\n") if l}
    out = []
    for k, t in sorted(R["posttran_tcatbal"].items()):
        a = R["posttran_acctdata"][k.split("|")[0]]
        tail = f'{t["type_cd"]}{t["cat_cd"]:04d}'
        rate = disc.get(a["group_id"].ljust(10) + tail, disc.get("DEFAULT".ljust(10) + tail))
        if rate: out.append((k, t["bal"] * rate / 1200))
    return out

MUTANTS = []
def mutant(f): MUTANTS.append(f); return f

@mutant
def m00_identity_json():
    """golden re-emitted as contract JSON, record order reversed: no divergence (format- and order-insensitive)"""
    R = {n: dict(reversed(list(r.items()))) for n, r in load_all("base").items()}
    return write("m00", R), "base", {}, dict(divergent_records=0)

@mutant
def m01_volatile_ts():
    """every PROC-TS rewritten: masked, so no divergence, but reported as volatile"""
    R = load_all("base")
    for n in ("posttran_transact", "intcalc_systran"):
        for r in R[n].values(): r["proc_ts"] = "2030-01-01-00.00.00.000000"
    return write("m01", R), "base", {}, dict(divergent_records=0)

@mutant
def m02_fix_last_account():
    """a 'clean' build that applies interest to the last account too (the legacy defect silently fixed)"""
    R = load_all("base"); last = max(R["intcalc_acctdata"])
    interest = sum(t["amt"] for t in R["intcalc_systran"].values() if acct_of(t) == last)
    a = R["intcalc_acctdata"][last]; a["curr_bal"] += interest; a["curr_cyc_credit"] = a["curr_cyc_debit"] = c(0)
    return write("m02", R), "base", {"R-INT-LAST/silent": 3}, dict(divergent_records=1, silent_records=1)

@mutant
def m03_fix_last_flagged():
    """same build, but its spec flagged the last-account behaviour as uncertain: the divergence counts as flagged"""
    d, case, _, _ = m02_fix_last_account(); d2 = WORK / "m03"; shutil.rmtree(d2, ignore_errors=True); shutil.copytree(d, d2)
    (d2 / "flags.json").write_text(json.dumps([{"rule": "R-INT-LAST", "source": "selftest"}]))
    return d2, case, {"R-INT-LAST/flagged": 3}, dict(divergent_records=1, silent_records=0, flagged_records=1)

@mutant
def m04_round_half_up():
    """interest rounded half-up instead of truncated; the balance cascade is tagged R-INT-APPLY, last account untouched"""
    R = load_all("base"); txs = sorted(R["intcalc_systran"].values(), key=lambda t: t["tran_id"])
    ex = rated("base"); assert len(ex) == len(txs)
    n_tx, delta = 0, {}
    for t, (k, e) in zip(txs, ex):
        assert t["amt"] == e.quantize(c("0.01"), ROUND_DOWN), "model/oracle mismatch"
        up = e.quantize(c("0.01"), ROUND_HALF_UP)
        if up != t["amt"]:
            n_tx += 1; a = k.split("|")[0]; delta[a] = delta.get(a, 0) + up - t["amt"]; t["amt"] = up
    last = max(R["intcalc_acctdata"]); n_acc = 0
    for a, dlt in delta.items():
        if a != last and dlt: R["intcalc_acctdata"][a]["curr_bal"] += dlt; n_acc += 1
    exp = {"R-INT-TRUNC/silent": n_tx, "R-INT-APPLY/silent": n_acc}
    print(f"      (half-up changes {n_tx} interest amounts, {n_acc} applied balances)")
    return write("m04", R, [{"rule": "R-INT-TRUNC", "source": "wiki BR-08 TODO"}]), "base", \
        {"R-INT-TRUNC/flagged": n_tx, "R-INT-APPLY/silent": n_acc}, dict(divergent_records=n_tx + n_acc, silent_records=n_acc)

@mutant
def m05_precedence():
    """c01: over-limit AND expired reported as 102 instead of 103 (check order reversed)"""
    R = load_all("c01")
    r = next(r for r in R["posttran_dalyrejs"].values() if r["reason"] == 103 and r["amt"] == c("99999999.99"))
    r["reason"] = 102; r["reason_desc"] = "OVERLIMIT TRANSACTION"
    return write("m05", R), "c01", {"R-POST-PRECEDENCE/silent": 1}, dict(divergent_records=1)

@mutant
def m06_reject_dropped():
    """c01: the unknown-card transaction is neither rejected nor posted (silently lost)"""
    R = load_all("c01")
    k = next(k for k, r in R["posttran_dalyrejs"].items() if r["reason"] == 100); del R["posttran_dalyrejs"][k]
    return write("m06", R), "c01", {"R-POST-100/silent": 1}, dict(divergent_records=1)

@mutant
def m07_limit_strict():
    """c01: limit check '>' instead of '>=': the exact-headroom transaction is rejected 102, with its cascade"""
    R = load_all("c01")
    t = next(t for t in R["posttran_transact"].values() if t["tran_id"].startswith("C01") and t["amt"] == c("784.36"))
    del R["posttran_transact"][t["tran_id"]]
    R["posttran_dalyrejs"][t["tran_id"]] = dict(t, reason=102, reason_desc="OVERLIMIT TRANSACTION")
    a = R["posttran_acctdata"][f'{1:011d}']; a["curr_bal"] -= t["amt"]; a["curr_cyc_credit"] -= t["amt"]
    R["posttran_tcatbal"][f'{1:011d}|{t["type_cd"]}|{t["cat_cd"]:04d}']["bal"] -= t["amt"]
    return write("m07", R, []), "c01", {"R-POST-102/silent": 2, "R-POST-BAL/silent": 2, "R-POST-TCAT/silent": 1}, \
        dict(divergent_records=4)

@mutant
def m08_txid_unshifted():
    """c02: interest IDs keep a slot for the zero-rate account (no shift): only identity fields differ"""
    R = load_all("c02"); txs = sorted(R["intcalc_systran"].values(), key=lambda t: t["tran_id"]); n = 0
    for t in txs:
        if acct_of(t) > f'{2:011d}':
            t["tran_id"] = t["tran_id"][:10] + f'{int(t["tran_id"][10:]) + 1:06d}'; n += 1
    return write("m08", R), "c02", {"R-INT-TXID/silent": n}, dict(divergent_records=n)

@mutant
def m09_zero_rate_tx():
    """c02: a 0.00 interest transaction written for the zero-rate account"""
    R = load_all("c02")
    card = next(l[0:16] for l in (INP["c02"] / "cardxref.dat").read_text().split("\n") if l[25:36] == f'{2:011d}')
    tmpl = next(iter(R["intcalc_systran"].values()))
    R["intcalc_systran"]["extra"] = dict(tmpl, tran_id="2022071800999999", card_num=card, amt=c(0), desc="Int. for a/c 00000000002")
    R["intcalc_systran"] = canon._card_ordinal(R["intcalc_systran"].values())
    return write("m09", R), "c02", {"R-INT-ZERO/silent": 1}, dict(divergent_records=1)

@mutant
def m10_output_absent():
    """INTCALC account file not produced at all"""
    R = load_all("base"); del R["intcalc_acctdata"]
    return write("m10", R), "base", {"R-ABSENT/silent": 50}, dict(divergent_records=50)

@mutant
def m11_floor_negative():
    """c04: negative interest floored (-2.58) instead of truncated toward zero (-2.57); balance follows"""
    R = load_all("c04")
    t = next(t for t in R["intcalc_systran"].values() if t["amt"] < 0); t["amt"] -= c("0.01")
    R["intcalc_acctdata"][acct_of(t)]["curr_bal"] -= c("0.01")
    return write("m11", R), "c04", {"R-INT-TRUNC/silent": 1, "R-INT-APPLY/silent": 1}, dict(divergent_records=2)

@mutant
def m12_one_tx_per_account():
    """c04: one interest transaction per account (categories summed) instead of one per category"""
    R = load_all("c04"); a = f'{5:011d}'
    xs = sorted((t for t in R["intcalc_systran"].values() if acct_of(t) == a), key=lambda t: t["tran_id"])
    assert len(xs) == 3
    keep = dict(xs[0], amt=sum(t["amt"] for t in xs))
    recs = [t for t in R["intcalc_systran"].values() if acct_of(t) != a] + [keep]
    R["intcalc_systran"] = canon._card_ordinal(recs)
    return write("m12", R), "c04", {"R-INT-RATE/silent": 3}, dict(divergent_records=3)

if __name__ == "__main__":
    ok = True
    for m in MUTANTS:
        d, case, exp_rules, exp_sum = m()
        fl = d / "flags.json"; flags = json.loads(fl.read_text()) if fl.exists() else []
        rep = compare.score(GOLD[case], d, list(canon.OUTPUTS), flags)
        got = rep["by_rule"]; s = rep["summary"]
        bad = got != exp_rules or any(s[k] != v for k, v in exp_sum.items())
        if m.__name__ == "m01_volatile_ts" and not s["volatile_masked"]: bad = True
        ok &= not bad
        print(f'{"FAIL" if bad else "ok  "} {m.__name__:24} {m.__doc__.strip()[:70]}')
        if bad: print("      expected", exp_rules, exp_sum, "\n      got     ", got, {k: s[k] for k in exp_sum})
    print("SELFTEST", "PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
