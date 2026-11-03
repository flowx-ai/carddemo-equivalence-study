# Layer 1 scorer: COMBTRAN (record-keyed) and the CREASTMT / TRANREPT reports (layout-aware), against the oracle.
# Kept separate from compare.py, which scores POSTTRAN and INTCALC and is unchanged.
#
# Reports are compared as units, not as bytes:
#   creastmt_statements / creastmt_statements_html: one unit per statement, keyed by account ID.
#   tranrept_report: one unit per detail line (keyed by TRAN-ID), per account total (keyed by the account of the
#     detail lines it closes), the grand total, and the report header.
# Strict equality: the unit's lines are identical after trailing spaces are dropped.
# Business equality: the unit's parsed fields are equal, with whitespace collapsed, low-values read as spaces,
#   amounts compared as numbers, and a statement's transactions compared as a multiset.
# Page totals and page breaks are not units: their values depend on the order of equal sort keys, which DFSORT
#   without EQUALS does not fix (plan_layer1_batch_chain.md, assumption S2). They are reported as a layout score.
#   For the same reason the grand total is business-equal when it matches any total the legacy program can print
#   under some order of equal keys (the sum plus one detail of the last account); strict still needs the golden line.
# Assumption S4 (A12): a statement for a card with more than 10 transactions (the CBSTM03A table overflow) is
#   excluded from equivalence by default and reported separately under "excluded" (rule R-STMT-OVERFLOW), because
#   z/OS may abend where GnuCOBOL added spaces as zero. --include-overflow scores it as golden instead.
#
# usage: report_compare.py --golden <dir> --cand <dir> --input <in dir> [--flags f.json] [--outputs a,b] [--out d]
#                          [--include-overflow]
import argparse, difflib, json, pathlib, re, sys
from collections import Counter
from decimal import Decimal
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import canon

OUTPUTS = ["combtran_transact", "creastmt_statements", "creastmt_statements_html", "tranrept_report"]
AMT = r"-?\s*[\d,]*\.\d\d-?"

def lines_of(p):
    return [l.rstrip(" ") for l in p.read_bytes().decode("latin-1").split("\n")] if p.exists() else None
def clean(s): return " ".join(s.replace("\x00", " ").split())
def amount(s):
    s = s.replace(",", "").replace(" ", ""); neg = s.startswith("-") or s.endswith("-")
    v = Decimal(s.strip("+-") or "0"); return -v if neg else v

# ---------------------------------------------------------------- inputs used for rule tags
def context(golden, inp):
    inp = pathlib.Path(inp); rd = lambda p: p.read_bytes().decode("latin-1").split("\n")[:-1] if p.exists() else []
    xref = sorted(rd(inp / "cardxref.dat")); cust = {l[0:9] for l in rd(inp / "custdata.dat")}
    acct = {l[0:11] for l in rd(pathlib.Path(golden) / "intcalc_acctdata.txt")}
    comb = rd(pathlib.Path(golden) / "combtran_transact.txt")
    per_card = Counter(r[262:278] for r in comb)
    acct_of_card = {x[0:16]: x[25:36] for x in xref}
    overflow = {int(acct_of_card[c]) for c, n in per_card.items() if n > 10 and c in acct_of_card}
    lost, stop = set(), False   # CBSTM03A abends at the first cross-reference whose customer or account is missing
    for x in xref:
        stop = stop or x[16:25] not in cust or x[25:36] not in acct
        if stop: lost.add(int(x[25:36]))
    return dict(overflow=overflow, abend_lost=lost)

# ---------------------------------------------------------------- COMBTRAN
def load_comb(d):
    p = pathlib.Path(d); t, j = p / "combtran_transact.txt", p / "combtran_transact.json"
    if j.exists():
        types = {f: ty for f, _, _, ty in canon.TRAN}
        recs = [{f: canon.norm(types[f], r.get(f)) for f in types} for r in json.loads(j.read_text())]
    elif t.exists():
        recs = [canon.parse_fixed(l, canon.TRAN, 350) for l in t.read_text(encoding="latin-1").split("\n") if l]
    else: return None
    return {r["tran_id"]: dict(fields=r, raw=None) for r in recs}

# ---------------------------------------------------------------- CREASTMT text
def load_stmt(d):
    L = lines_of(pathlib.Path(d) / "creastmt_statements.txt")
    if L is None: return None
    units, block = {}, None
    for l in L:
        if "START OF STATEMENT" in l: block = [l]; continue
        if block is None: continue
        block.append(l)
        if "END OF STATEMENT" in l:
            f = parse_stmt(block); k = f"{f['acct']}"
            n = sum(1 for u in units if u.split("#")[0] == k); units[k if not n else f"{k}#{n + 1}"] = dict(fields=f, raw=block)
            block = None
    return units
def parse_stmt(b):
    text = "\n".join(b); dash = [i for i, l in enumerate(b) if l and set(l) == {"-"}]
    head = [clean(l) for l in b[1:dash[0]]] if dash else []
    head += [""] * (4 - len(head))
    g = lambda pat: (re.search(pat, text) or [None, ""])[1]
    hdr = next((i for i, l in enumerate(b) if l.startswith("Tran ID")), None)
    tx = []
    if hdr is not None:
        for l in b[hdr + 2:]:
            if l and set(l) == {"-"}: break
            m = re.match(r"^(\S+)\s(.*)\$\s*(" + AMT + r")\s*$", l)
            tx.append((m[1], clean(m[2]), amount(m[3])) if m else ("?", clean(l), None))
    acct = g(r"Account ID\s*:\s*(\d+)")
    return dict(acct=int(acct) if acct else None, name=head[0], add1=head[1], add2=head[2], add3=head[3],
                bal=amount(g(r"Current Balance\s*:\s*(" + AMT + ")") or "0"), fico=clean(g(r"FICO Score\s*:\s*(\S*)")),
                txns=tuple(sorted(tx, key=str)), total=amount(g(r"Total EXP:\s*\$\s*(" + AMT + ")") or "0"))

# ---------------------------------------------------------------- CREASTMT HTML
def load_html(d):
    L = lines_of(pathlib.Path(d) / "creastmt_statements_html.txt")
    if L is None: return None
    units, block = {}, None
    for l in L:
        if l.strip().lower().startswith("<!doctype"): block = [l]; continue
        if block is None: continue
        block.append(l)
        if l.strip().lower().startswith("</html>"):
            f = parse_html(block); k = f"{f['acct']}"
            n = sum(1 for u in units if u.split("#")[0] == k); units[k if not n else f"{k}#{n + 1}"] = dict(fields=f, raw=block)
            block = None
    return units
def parse_html(b):
    text = " ".join(b)
    acct = (re.search(r"Statement for Account Number:\s*(\d+)", text) or [None, ""])[1]
    ps = [clean(re.sub("<[^>]+>", "", p)) for p in re.findall(r"<p[^>]*>(.*?)</p>", text, re.S)]
    lab = lambda name: next((p.split(":", 1)[1].strip() for p in ps if p.startswith(name)), "")
    try: i = ps.index("Amount")
    except ValueError: i = len(ps)
    rest = ps[i + 1:]; tx = tuple(sorted(((rest[j], rest[j + 1], amount(rest[j + 2]) if re.fullmatch(AMT, rest[j + 2]) else rest[j + 2])
                                          for j in range(0, len(rest) - 2, 3)), key=str))
    addr = ps[3:7] if len(ps) >= 7 else ps[3:] + [""] * (7 - len(ps))   # after the three fixed bank lines
    return dict(acct=int(acct) if acct else None, name=addr[0], add1=addr[1], add2=addr[2], add3=addr[3],
                bal=amount(lab("Current Balance") or "0"), fico=lab("FICO Score"), txns=tx)

# ---------------------------------------------------------------- TRANREPT
def load_rept(d):
    L = lines_of(pathlib.Path(d) / "tranrept_report.txt")
    if L is None: return None, None
    units, last_acct, n_tot, pages = {}, None, Counter(), []
    for l in L:
        if l.startswith("DALYREPT"):
            m = re.search(r"Date Range:\s*(\S+)\s+to\s+(\S+)", l)
            units.setdefault("header", dict(fields=dict(range=(m[1], m[2]) if m else None), raw=[l]))
        elif l.startswith("Page Total"): pages.append(amount(re.search(AMT + r"\s*$", l.replace("+", ""))[0]))
        elif l.startswith("Account Total"):
            k = f"acct:{last_acct}"; n_tot[k] += 1; k = k if n_tot[k] == 1 else f"{k}#{n_tot[k]}"
            units[k] = dict(fields=dict(total=amount(re.search(AMT + r"\s*$", l.replace("+", ""))[0])), raw=[l])
        elif l.startswith("Grand Total"):
            units["grand"] = dict(fields=dict(total=amount(re.search(AMT + r"\s*$", l.replace("+", ""))[0])), raw=[l])
        else:
            m = re.match(r"^(\S{16})\s+(\d{11})\s+(\S\S)-(.*?)\s+(\d{4})-(.*?)(?:\s+(" + AMT + r"))?\s*$", l)
            if not m: continue
            last_acct = m[2]
            units[m[1]] = dict(fields=dict(acct=m[2], type_cd=m[3], type_desc=clean(m[4]), cat_cd=m[5],
                                           cat_desc_source=clean(m[6]), amt=amount(m[7]) if m[7] else Decimal(0)), raw=[l])
    return units, pages

# ---------------------------------------------------------------- tags
def tag(out, kind, key, g, c, field, ctx):
    if out == "combtran_transact": return "R-COMB-SET" if kind != "field" else "R-COMB-COPY"
    if out.startswith("creastmt"):
        acct = int(str(key).split("#")[0]) if str(key).split("#")[0].isdigit() else None
        if kind != "field": return "R-STMT-ABEND" if acct in ctx["abend_lost"] else "R-STMT-SET"
        if field in ("txns", "total") and acct in ctx["overflow"]: return "R-STMT-OVERFLOW"
        return {"name": "R-STMT-NAME", "add1": "R-STMT-ADDR", "add2": "R-STMT-ADDR", "add3": "R-STMT-ADDR",
                "bal": "R-STMT-BAL", "fico": "R-STMT-FICO", "txns": "R-STMT-TXN", "total": "R-STMT-TOTAL"}.get(field, "R-STMT-OTHER")
    if out == "tranrept_report":
        if key == "header": return "R-REPT-HEADER"
        if key == "grand":
            if kind == "field" and ctx.get("last_amt") is not None and g["total"] - c["total"] == ctx["last_amt"]: return "R-REPT-LASTDUP"
            return "R-REPT-GRAND"
        if str(key).startswith("acct:"):
            if kind == "extra" and key == f"acct:{ctx.get('last_rept_acct')}": return "R-REPT-LASTACCT"
            return "R-REPT-ACCT"
        if kind != "field": return "R-REPT-SET"
        return {"amt": "R-REPT-AMT", "acct": "R-REPT-XREF"}.get(field, "R-REPT-LOOKUP")
    return "OTHER"

VOLATILE = {"proc_ts"}

def score(golden, cand, inp, outputs, flags, exclude_overflow=True):
    ctx = context(golden, inp)
    flag_rules = {f["rule"] for f in flags if "rule" in f}
    flag_keys = {(f["output"], f["key"]) for f in flags if "key" in f}
    res, divs, layout, excluded = {}, [], {}, []
    for out in outputs:
        if out == "combtran_transact": G, C = load_comb(golden), load_comb(cand)
        elif out == "creastmt_statements": G, C = load_stmt(golden), load_stmt(cand)
        elif out == "creastmt_statements_html": G, C = load_html(golden), load_html(cand)
        else:
            (G, gp), (C, cp) = load_rept(golden), load_rept(cand)
            details = [u for k, u in G.items() if "amt" in u["fields"]]
            ctx["last_amt"] = details[-1]["fields"]["amt"] if details else None
            ctx["last_rept_acct"] = details[-1]["fields"]["acct"] if details else None
            # the grand total counts the last detail twice; which detail is last depends on the order of equal sort
            # keys (assumption S2), so any one detail of the last account is an acceptable second count
            tot = sum((u["fields"]["amt"] for u in details), Decimal(0))
            ctx["grand_alt"] = {tot + u["fields"]["amt"] for u in details if u["fields"]["acct"] == ctx["last_rept_acct"]}
            gl, cl = lines_of(pathlib.Path(golden) / "tranrept_report.txt"), lines_of(pathlib.Path(cand) / "tranrept_report.txt")
            layout[out] = dict(line_match=round(difflib.SequenceMatcher(None, gl, cl or [], autojunk=False).ratio(), 4),
                               page_totals_equal=(gp == cp), pages_golden=len(gp or []), pages_candidate=len(cp or []))
        if G is None: raise SystemExit(f"golden has no {out}")
        if out.startswith("creastmt") and C is not None:
            gf = out + ".txt"; gl, cl = lines_of(pathlib.Path(golden) / gf), lines_of(pathlib.Path(cand) / gf)
            layout[out] = dict(line_match=round(difflib.SequenceMatcher(None, gl, cl, autojunk=False).ratio(), 4))
        if C is None:
            res[out] = dict(golden=len(G), candidate=0, equal_strict=0, equal_business=0, union=len(G), absent=True)
            divs += [dict(output=out, key=k, kind="missing", field=None, rule="R-ABSENT", golden=None, cand=None) for k in G]
            continue
        eq_s = eq_b = 0
        if out.startswith("creastmt") and exclude_overflow:   # S4: set the overflow statements aside before scoring
            skip = {k for k in set(G) | set(C) if str(k).split("#")[0].isdigit() and int(str(k).split("#")[0]) in ctx["overflow"]}
            for k in sorted(skip, key=str):
                g, c = G.pop(k, None), C.pop(k, None)
                fd = sorted(set((g or {}).get("fields", {})) | set((c or {}).get("fields", {})))
                diff = [f for f in fd if (g and g["fields"].get(f)) != (c and c["fields"].get(f))] if g and c else ["(unit missing or extra)"]
                excluded.append(dict(output=out, key=k, rule="R-STMT-OVERFLOW", fields_differing=diff,
                                     present_golden=g is not None, present_candidate=c is not None))
        for k in sorted(set(G) | set(C), key=str):
            g, c = G.get(k), C.get(k)
            if g is None or c is None:
                kind = "extra" if g is None else "missing"
                divs.append(dict(output=out, key=k, kind=kind, field=None, golden=None, cand=None,
                                 rule=tag(out, kind, k, g and g["fields"], c and c["fields"], None, ctx)))
                continue
            fd = [f for f in g["fields"] if f not in VOLATILE and g["fields"][f] != c["fields"].get(f)]
            if out == "tranrept_report" and k == "grand" and fd == ["total"] and c["fields"]["total"] in ctx["grand_alt"]: fd = []
            strict = (g["raw"] == c["raw"]) if g["raw"] is not None else not fd
            eq_s += strict and not fd; eq_b += not fd
            for f in fd:
                divs.append(dict(output=out, key=k, kind="field", field=f, golden=str(g["fields"][f])[:200],
                                 cand=str(c["fields"].get(f))[:200], rule=tag(out, "field", k, g["fields"], c["fields"], f, ctx)))
        res[out] = dict(golden=len(G), candidate=len(C), equal_strict=eq_s, equal_business=eq_b, union=len(set(G) | set(C)))
    for d in divs:
        d["flagged"] = d["rule"] in flag_rules or (d["output"], str(d["key"])) in flag_keys
    hit = {d["rule"] for d in divs} | {(d["output"], str(d["key"])) for d in divs}
    unneeded = [f for f in flags if f.get("rule", (f.get("output"), f.get("key"))) not in hit]
    U = sum(r["union"] for r in res.values())
    recs = lambda ds: len({(d["output"], str(d["key"])) for d in ds})
    summary = dict(
        records_union=U,
        equivalence_strict=round(sum(r["equal_strict"] for r in res.values()) / U, 4) if U else None,
        equivalence_business=round(sum(r["equal_business"] for r in res.values()) / U, 4) if U else None,
        divergent_records=recs(divs), silent_records=recs([d for d in divs if not d["flagged"]]),
        flagged_records=recs([d for d in divs if d["flagged"]]),
        rules_silent=sorted({d["rule"] for d in divs if not d["flagged"]}),
        rules_flagged=sorted({d["rule"] for d in divs if d["flagged"]}),
        flags_raised=len(flags), flags_unneeded=len(unneeded), layout=layout,
        excluded_units=len(excluded), excluded_differing=sum(1 for e in excluded if e["fields_differing"]))
    by_rule = Counter((d["rule"], "flagged" if d["flagged"] else "silent") for d in divs)
    return dict(summary=summary, outputs=res, by_rule={f"{r}/{s}": n for (r, s), n in sorted(by_rule.items())},
                divergences=divs, unneeded_flags=unneeded, excluded=excluded)

def markdown(rep, golden, cand):
    s = rep["summary"]
    L = [f"# Layer 1 score: `{cand}` vs `{golden}`", "",
         f"- Equivalence (strict): **{s['equivalence_strict']:.2%}** · business: **{s['equivalence_business']:.2%}** of {s['records_union']} units",
         f"- Divergent units: {s['divergent_records']} (silent {s['silent_records']}, flagged {s['flagged_records']})",
         f"- Flags raised: {s['flags_raised']} (unneeded {s['flags_unneeded']})",
         f"- Layout (not part of equivalence): {json.dumps(s['layout'])}",
         f"- Excluded from equivalence (S4, overflow statements): {s['excluded_units']} units, {s['excluded_differing']} differing"
         + "".join(f"; {e['output']} {e['key']}: {', '.join(e['fields_differing']) or 'equal'}" for e in rep["excluded"]), "",
         "| Output | golden | candidate | equal (strict) | equal (business) |", "|---|---|---|---|---|"]
    L += [f"| {o} | {r['golden']} | {r['candidate']} | {r['equal_strict']} | {r['equal_business']} |" for o, r in rep["outputs"].items()]
    L += ["", "| Rule | silent | flagged |", "|---|---|---|"]
    for r in sorted({k.split("/")[0] for k in rep["by_rule"]}):
        L.append(f"| {r} | {rep['by_rule'].get(r + '/silent', 0)} | {rep['by_rule'].get(r + '/flagged', 0)} |")
    L += ["", "First 40 divergences:", "", "| output | key | kind | field | rule | flagged |", "|---|---|---|---|---|---|"]
    L += [f"| {d['output']} | {d['key']} | {d['kind']} | {d['field'] or ''} | {d['rule']} | {'yes' if d['flagged'] else 'no'} |"
          for d in rep["divergences"][:40]]
    return "\n".join(L) + "\n"

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--golden", required=True); ap.add_argument("--cand", required=True); ap.add_argument("--input", required=True)
    ap.add_argument("--flags"); ap.add_argument("--outputs", default=",".join(OUTPUTS)); ap.add_argument("--out")
    ap.add_argument("--include-overflow", action="store_true", help="score the S4 overflow statements as golden")
    a = ap.parse_args()
    flags = json.loads(pathlib.Path(a.flags).read_text()) if a.flags else []
    rep = score(a.golden, a.cand, a.input, a.outputs.split(","), flags, exclude_overflow=not a.include_overflow)
    if a.out:
        o = pathlib.Path(a.out); o.mkdir(parents=True, exist_ok=True)
        (o / "report.json").write_text(json.dumps(rep, indent=1, default=str))
        (o / "report.md").write_text(markdown(rep, a.golden, a.cand))
    print(json.dumps(rep["summary"], default=str))
