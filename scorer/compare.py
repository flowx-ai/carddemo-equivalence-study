# Differential scorer: a candidate run against the golden oracle, record by record and field by field.
# Every divergence gets a pre-registered rule tag (PROTOCOL.md §5) and is classed flagged or silent from the
# candidate's flags file. usage: compare.py --golden <dir> --cand <dir> [--flags f.json] [--outputs a,b] [--out d]
import argparse, json, pathlib
from collections import Counter
from decimal import Decimal
import canon

VOLATILE = {"proc_ts"}                                  # processing timestamps: masked everywhere
VOLATILE_BY_OUTPUT = {"intcalc_systran": {"orig_ts"}}   # generated interest records carry the run clock as ORIG-TS
PRESENTATION = {"posttran_dalyrejs": {"reason_desc"}, "intcalc_systran": {"desc", "source"}}
BALANCE = {"curr_bal", "curr_cyc_credit", "curr_cyc_debit"}

def tag(out, kind, key, g, c, field, ctx):
    """Rule tag for one divergence. kind: missing (in golden only) | extra (candidate only) | field."""
    if out == "posttran_dalyrejs":
        if kind == "field" and field == "reason":
            return "R-POST-PRECEDENCE" if {g["reason"], c["reason"]} == {102, 103} else f'R-POST-{g["reason"]}'
        if kind in ("missing", "extra"): return f'R-POST-{(g or c)["reason"]}'
        return "R-POST-COPY"
    if out == "posttran_transact":
        if kind == "extra": return f'R-POST-{ctx["golden_rejects"].get(key, "WRITE")}'
        if kind == "missing": return f'R-POST-{ctx["cand_rejects"].get(key, "WRITE")}'
        return "R-POST-COPY"
    if out == "posttran_acctdata":
        return "R-POST-BAL" if field in BALANCE else "R-PASSTHRU"
    if out == "posttran_tcatbal":
        return "R-POST-TCAT"
    if out == "intcalc_systran":
        if kind == "extra" and c["amt"] == 0: return "R-INT-ZERO"
        if kind in ("missing", "extra"): return "R-INT-RATE"
        if field == "tran_id": return "R-INT-TXID"
        if field == "amt": return "R-INT-TRUNC" if abs(g["amt"] - c["amt"]) == Decimal("0.01") else "R-INT-RATE"
        return "R-INT-TXFORMAT"
    if out == "intcalc_acctdata":
        if field in BALANCE and key == ctx["last_account"]: return "R-INT-LAST"
        if field == "curr_bal": return "R-INT-APPLY"
        if field in BALANCE: return "R-INT-CYC"
        return "R-PASSTHRU"
    return "OTHER"

def score(golden, cand, outputs, flags):
    gt = canon.load(golden, "posttran_tcatbal")
    ctx = {"last_account": max(k.split("|")[0] for k in gt) if gt else None,
           "golden_rejects": {k: r["reason"] for k, r in (canon.load(golden, "posttran_dalyrejs") or {}).items()},
           "cand_rejects": {k: r["reason"] for k, r in (canon.load(cand, "posttran_dalyrejs") or {}).items()}}
    flag_rules = {f["rule"] for f in flags if "rule" in f}
    flag_keys = {(f["output"], f["key"]) for f in flags if "key" in f}
    res, divs, volatile = {}, [], Counter()
    for out in outputs:
        G, C = canon.load(golden, out), canon.load(cand, out)
        if G is None: raise SystemExit(f"golden has no {out}")
        if C is None:
            res[out] = dict(golden=len(G), candidate=0, equal_strict=0, equal_business=0, union=len(G), absent=True)
            divs += [dict(output=out, key=k, kind="missing", field=None, rule="R-ABSENT", golden=None, cand=None) for k in G]
            continue
        skip = VOLATILE | VOLATILE_BY_OUTPUT.get(out, set()); pres = PRESENTATION.get(out, set())
        eq_s = eq_b = 0
        for k in sorted(set(G) | set(C)):
            g, c = G.get(k), C.get(k)
            if g is None or c is None:
                kind = "extra" if g is None else "missing"
                divs.append(dict(output=out, key=k, kind=kind, field=None, rule=tag(out, kind, k, g, c, None, ctx),
                                 golden=None, cand=None))
                continue
            fd = [f for f in g if f not in skip and g[f] != c[f]]
            volatile.update(f"{out}.{f}" for f in skip if f in g and g[f] != c[f])
            eq_s += not fd; eq_b += not [f for f in fd if f not in pres]
            for f in fd:
                divs.append(dict(output=out, key=k, kind="field", field=f, rule=tag(out, "field", k, g, c, f, ctx),
                                 golden=str(g[f]), cand=str(c[f]), presentation=f in pres))
        res[out] = dict(golden=len(G), candidate=len(C), equal_strict=eq_s, equal_business=eq_b, union=len(set(G) | set(C)))
    for d in divs:
        d["flagged"] = d["rule"] in flag_rules or (d["output"], d["key"]) in flag_keys
    hit = {d["rule"] for d in divs} | {(d["output"], d["key"]) for d in divs}
    unneeded = [f for f in flags if f.get("rule", (f.get("output"), f.get("key"))) not in hit]
    U = sum(r["union"] for r in res.values())
    biz = [d for d in divs if not d.get("presentation")]
    recs = lambda ds: len({(d["output"], d["key"]) for d in ds})
    summary = dict(
        records_union=U,
        equivalence_strict=round(sum(r["equal_strict"] for r in res.values()) / U, 4) if U else None,
        equivalence_business=round(sum(r["equal_business"] for r in res.values()) / U, 4) if U else None,
        divergent_records=recs(biz), silent_records=recs([d for d in biz if not d["flagged"]]),
        flagged_records=recs([d for d in biz if d["flagged"]]),
        rules_silent=sorted({d["rule"] for d in biz if not d["flagged"]}),
        rules_flagged=sorted({d["rule"] for d in biz if d["flagged"]}),
        flags_raised=len(flags), flags_unneeded=len(unneeded), volatile_masked=dict(volatile))
    by_rule = Counter((d["rule"], "flagged" if d["flagged"] else "silent") for d in biz)
    return dict(summary=summary, outputs=res, by_rule={f"{r}/{s}": n for (r, s), n in sorted(by_rule.items())},
                divergences=divs, unneeded_flags=unneeded)

def markdown(rep, golden, cand):
    s = rep["summary"]
    L = [f"# Score: `{cand}` vs `{golden}`", "",
         f"- Equivalence (strict): **{s['equivalence_strict']:.2%}** · business: **{s['equivalence_business']:.2%}** of {s['records_union']} records",
         f"- Divergent records: {s['divergent_records']} (silent {s['silent_records']}, flagged {s['flagged_records']})",
         f"- Flags raised: {s['flags_raised']} (unneeded {s['flags_unneeded']}) · volatile fields masked: {s['volatile_masked'] or 'none differed'}", "",
         "| Output | golden | candidate | equal (strict) | equal (business) |", "|---|---|---|---|---|"]
    L += [f"| {o} | {r['golden']} | {r['candidate']} | {r['equal_strict']} | {r['equal_business']} |" for o, r in rep["outputs"].items()]
    L += ["", "| Rule | silent | flagged |", "|---|---|---|"]
    rules = sorted({k.split("/")[0] for k in rep["by_rule"]})
    L += [f"| {r} | {rep['by_rule'].get(r + '/silent', 0)} | {rep['by_rule'].get(r + '/flagged', 0)} |" for r in rules]
    L += ["", "First 40 divergences:", "", "| output | key | kind | field | golden | candidate | rule | flagged |", "|---|---|---|---|---|---|---|---|"]
    L += [f"| {d['output']} | {d['key']} | {d['kind']} | {d['field'] or ''} | {d['golden'] or ''} | {d['cand'] or ''} | {d['rule']} | {'yes' if d['flagged'] else 'no'} |"
          for d in rep["divergences"][:40]]
    return "\n".join(L) + "\n"

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--golden", required=True); ap.add_argument("--cand", required=True)
    ap.add_argument("--flags"); ap.add_argument("--outputs", default=",".join(canon.OUTPUTS)); ap.add_argument("--out")
    a = ap.parse_args()
    flags = json.loads(pathlib.Path(a.flags).read_text()) if a.flags else []
    rep = score(a.golden, a.cand, a.outputs.split(","), flags)
    if a.out:
        o = pathlib.Path(a.out); o.mkdir(parents=True, exist_ok=True)
        (o / "report.json").write_text(json.dumps(rep, indent=1, default=str))
        (o / "report.md").write_text(markdown(rep, a.golden, a.cand))
    print(json.dumps(rep["summary"]))
