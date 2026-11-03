# Layer 1 scorer validation: plant known defects in copies of the golden COMBTRAN / CREASTMT / TRANREPT outputs and
# assert report_compare.py reports exactly the planted divergences, with the draft rule tags, and nothing else.
# usage: python3 report_selftest.py
import json, pathlib, re, shutil, sys
from decimal import Decimal
import report_compare as rc

ROOT = pathlib.Path(__file__).resolve().parent.parent
GOLD = {"base": ROOT / "golden/v1", **{c: ROOT / f"golden/v1/cases/{c}/out" for c in ("c01", "c02", "c03", "c04")}}
INP = {"base": ROOT / "data/in", **{c: ROOT / f"cases/{c}/in" for c in ("c01", "c02", "c03", "c04")}}
WORK = pathlib.Path(__file__).parent / "selftest"
FILES = [f"{o}.txt" for o in rc.OUTPUTS]

def golden_lines(case, f): return (GOLD[case] / f).read_bytes().decode("latin-1").split("\n")[:-1]
def write(name, case, edits, flags=None, drop=()):
    """Copy the golden outputs of <case>, apply {file: fn(lines) -> lines}, drop the files in <drop>."""
    d = WORK / name; shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
    for f in FILES:
        if f in drop: continue
        L = golden_lines(case, f)
        if f in edits: L = edits[f](L)
        (d / f).write_bytes(("\n".join(L) + "\n").encode("latin-1"))
    if flags is not None: (d / "flags.json").write_text(json.dumps(flags))
    return d
def ed15(v, sign):  # +/-ZZZ,ZZZ,ZZZ.ZZ as CBTRN03C prints it
    s = f"{abs(v):,.2f}".rjust(14); return (("-" if v < 0 else "+") if sign == "+" else ("-" if v < 0 else " ")) + s
def amt_of(line): return rc.amount(re.search(rc.AMT + r"\s*$", line.rstrip().replace("+", ""))[0])

MUTANTS = []
def mutant(f): MUTANTS.append(f); return f

@mutant
def r00_identity_trimmed():
    """golden with trailing spaces dropped from every line: no divergence, strict and business 100%"""
    return write("r00", "base", {f: (lambda L: [l.rstrip(" ") for l in L]) for f in FILES}), "base", {}, \
        dict(divergent_records=0, equivalence_strict=1.0, equivalence_business=1.0)

@mutant
def r01_whitespace_detail():
    """one TRANREPT detail line re-spaced: business-equal, strict-different, no divergence"""
    def e(L):
        i = next(i for i, l in enumerate(L) if l[:16].isdigit() and l[17:28].isdigit())
        L[i] = re.sub(" +", "  ", L[i]); return L
    return write("r01", "base", {"tranrept_report.txt": e}), "base", {}, \
        dict(divergent_records=0, equivalence_business=1.0)

@mutant
def r02_fix_last_dup():
    """TRANREPT grand total without the last transaction counted twice (the legacy defect silently fixed)"""
    def e(L):
        last = [l for l in L if l[:16].strip() and l[17:28].isdigit()][-1]
        i = next(i for i, l in enumerate(L) if l.startswith("Grand Total"))
        L[i] = L[i][:97] + ed15(amt_of(L[i]) - amt_of(last), "+"); return L
    return write("r02", "base", {"tranrept_report.txt": e}), "base", {"R-REPT-LASTDUP/silent": 1}, dict(divergent_records=1)

@mutant
def r03_fix_last_dup_flagged():
    """same build, its spec flagged the grand-total behaviour: counted as flagged"""
    d, case, _, s = r02_fix_last_dup()
    (d / "flags.json").write_text(json.dumps([{"rule": "R-REPT-LASTDUP", "source": "selftest"}]))
    return d, case, {"R-REPT-LASTDUP/flagged": 1}, dict(divergent_records=1, flagged_records=1, silent_records=0)

@mutant
def r04_last_account_total():
    """TRANREPT prints the account total for the last account (legacy omits it)"""
    def e(L):
        i = max(i for i, l in enumerate(L) if l.startswith("Page Total"))
        L[i:i] = ["Account Total" + "." * 84 + ed15(Decimal("123.45"), "+"), "-" * 133]; return L
    return write("r04", "base", {"tranrept_report.txt": e}), "base", {"R-REPT-LASTACCT/silent": 1}, dict(divergent_records=1)

@mutant
def r05_detail_amount():
    """one TRANREPT detail amount off by 0.01"""
    def e(L):
        i = next(i for i, l in enumerate(L) if l[:16].isdigit() and l[17:28].isdigit() and amt_of(l) > 1)
        L[i] = L[i][:114 - 17] + ed15(amt_of(L[i]) - Decimal("0.01"), "-") + "  "; return L
    return write("r05", "base", {"tranrept_report.txt": e}), "base", {"R-REPT-AMT/silent": 1}, dict(divergent_records=1)

@mutant
def r06_detail_missing():
    """one TRANREPT detail line dropped"""
    def e(L):
        i = next(i for i, l in enumerate(L) if l[:16].isdigit() and l[17:28].isdigit()); del L[i]; return L
    return write("r06", "base", {"tranrept_report.txt": e}), "base", {"R-REPT-SET/silent": 1}, dict(divergent_records=1)

@mutant
def r07_tie_order():
    """two detail lines of one card swapped across a page break, page totals recomputed: units unchanged"""
    def e(L):
        for i, l in enumerate(L):
            if l.startswith("Page Total") and i > 0:
                prev = max(j for j in range(i) if L[j][17:28].isdigit())
                nxt = next(j for j in range(i, len(L)) if L[j][17:28].isdigit())
                if L[prev][17:28] == L[nxt][17:28] and amt_of(L[prev]) != amt_of(L[nxt]):
                    d = amt_of(L[nxt]) - amt_of(L[prev])
                    p2 = next(j for j in range(nxt, len(L)) if L[j].startswith("Page Total"))
                    L[i] = L[i][:97] + ed15(amt_of(L[i]) + d, "+"); L[p2] = L[p2][:97] + ed15(amt_of(L[p2]) - d, "+")
                    L[prev], L[nxt] = L[nxt], L[prev]; return L
        raise AssertionError("no card split by a page break")
    return write("r07", "base", {"tranrept_report.txt": e}), "base", {}, dict(divergent_records=0, equivalence_strict=1.0)

@mutant
def r08_stmt_txn_order():
    """CREASTMT text: two transaction lines of one statement swapped: business-equal, strict-different"""
    def e(L):
        i = next(i for i, l in enumerate(L) if l.startswith("Tran ID")) + 2
        L[i], L[i + 1] = L[i + 1], L[i]; return L
    return write("r08", "base", {"creastmt_statements.txt": e}), "base", {}, dict(divergent_records=0, equivalence_business=1.0)

@mutant
def r09_html_name():
    """CREASTMT HTML: one name printed without its middle name"""
    def e(L):
        i = next(i for i, l in enumerate(L) if l.startswith('<p style="font-size:16px">') and l.count(" ") >= 3
                 and "Bank of" not in l and "Details" not in l and "Summary" not in l)
        parts = re.sub("<[^>]+>", "", L[i]).split()
        L[i] = '<p style="font-size:16px">' + parts[0] + " " + parts[-1] + "  </p>"; return L
    return write("r09", "base", {"creastmt_statements_html.txt": e}), "base", {"R-STMT-NAME/silent": 1}, dict(divergent_records=1)

@mutant
def r09b_full_city():
    """CREASTMT text: full multi-word city on address line 3 where legacy keeps only its first word"""
    cust = [l for l in (INP["base"] / "custdata.dat").read_text().split("\n") if l]
    c = next(l for l in cust if " " in l[184:234].strip())
    city, state = c[184:234].strip(), c[234:236]
    def e(L):
        i = next(i for i, l in enumerate(L) if l.startswith(city.split()[0] + " " + state + " "))
        L[i] = (city + L[i][len(city.split()[0]):]).ljust(80)[:80]; return L
    return write("r09b", "base", {"creastmt_statements.txt": e}), "base", {"R-STMT-ADDR/silent": 1}, dict(divergent_records=1)

@mutant
def r10_overflow_fixed():
    """c04: statement lists the real 11th transaction of the card instead of the overflow line, total follows"""
    comb = golden_lines("c04", "combtran_transact.txt")
    xref = {l[0:16]: l[25:36] for l in (INP["c04"] / "cardxref.dat").read_text().split("\n") if l}
    card = next(c for c in xref if xref[c] == f"{5:011d}")
    real = sorted(r for r in comb if r[262:278] == card)[10]
    def e(L):
        s = next(i for i, l in enumerate(L) if l.startswith("Account ID         :00000000005"))
        hdr = next(i for i in range(s, len(L)) if L[i].startswith("Tran ID"))
        end = next(i for i in range(hdr + 2, len(L)) if set(L[i]) == {"-"})
        bad = end - 1; old = rc.amount(L[bad][67:80])
        new = rc.canon.zoned(real[132:143], 2)
        L[bad] = real[0:16] + " " + real[32:132][:49] + "$" + f"{new:.2f}".rjust(12) + " "
        t = end + 1; tot = rc.amount(L[t][67:80]) - old + new
        L[t] = L[t][:67] + f"{tot:.2f}".rjust(12) + " "; return L
    return write("r10", "c04", {"creastmt_statements.txt": e}), "c04", {}, \
        dict(divergent_records=0, excluded_units=2, excluded_differing=1)

@mutant
def r10b_overflow_included():
    """same build scored with --include-overflow (S4 off): the statement counts, tagged R-STMT-OVERFLOW"""
    d, case, _, _ = r10_overflow_fixed()
    return d, case, {"R-STMT-OVERFLOW/silent": 2}, dict(divergent_records=1, excluded_units=0)

@mutant
def r11_no_abend():
    """c03: a build that skips the orphan cross-reference and prints the statements legacy never reaches"""
    ctx = rc.context(GOLD["c03"], INP["c03"]); lost = sorted(a for a in ctx["abend_lost"] if a != 99999999999)
    def e(L):
        s = next(i for i, l in enumerate(L) if "START OF STATEMENT" in l)
        t = next(i for i, l in enumerate(L) if "END OF STATEMENT" in l)
        block = L[s:t + 1]; out = list(L)
        for a in lost:
            b = [re.sub(r"^Account ID         :\d{11}", f"Account ID         :{a:011d}", l) for l in block]; out += b
        return out
    return write("r11", "c03", {"creastmt_statements.txt": e}), "c03", {"R-STMT-ABEND/silent": len(lost)}, dict(divergent_records=len(lost))

@mutant
def r12_stmt_balance():
    """CREASTMT text: one current balance off by 0.01"""
    def e(L):
        i = next(i for i, l in enumerate(L) if l.startswith("Current Balance    :"))
        v = rc.amount(L[i][20:33]) + Decimal("0.01"); L[i] = L[i][:20] + f"{v:012.2f}" + " "; return L
    return write("r12", "base", {"creastmt_statements.txt": e}), "base", {"R-STMT-BAL/silent": 1}, dict(divergent_records=1)

@mutant
def r13_combtran():
    """COMBTRAN: one record dropped, one merchant name changed"""
    def e(L):
        del L[0]; L[1] = L[1][:152] + "SOMEONE ELSE".ljust(50) + L[1][202:]; return L
    return write("r13", "base", {"combtran_transact.txt": e}), "base", {"R-COMB-SET/silent": 1, "R-COMB-COPY/silent": 1}, \
        dict(divergent_records=2)

@mutant
def r14_report_absent():
    """TRANREPT report not produced: every unit absent"""
    n = len(rc.load_rept(GOLD["base"])[0])
    return write("r14", "base", {}, drop=("tranrept_report.txt",)), "base", {"R-ABSENT/silent": n}, dict(divergent_records=n)

@mutant
def r15_grand_other_tie():
    """TRANREPT grand total doubles another detail of the last account (a different tie order): business-equal"""
    def e(L):
        det = [l for l in L if l[:16].strip() and l[17:28].isdigit()]
        last_acct = det[-1][17:28]; other = next(l for l in det if l[17:28] == last_acct and amt_of(l) != amt_of(det[-1]))
        i = next(i for i, l in enumerate(L) if l.startswith("Grand Total"))
        L[i] = L[i][:97] + ed15(amt_of(L[i]) - amt_of(det[-1]) + amt_of(other), "+"); return L
    return write("r15", "base", {"tranrept_report.txt": e}), "base", {}, dict(divergent_records=0, equivalence_business=1.0)

if __name__ == "__main__":
    ok = True
    for m in MUTANTS:
        d, case, exp_rules, exp_sum = m()
        fl = d / "flags.json"; flags = json.loads(fl.read_text()) if fl.exists() else []
        rep = rc.score(GOLD[case], d, INP[case], rc.OUTPUTS, flags, exclude_overflow=m.__name__ != "r10b_overflow_included")
        got = rep["by_rule"]; s = rep["summary"]
        bad = got != exp_rules or any(s[k] != v for k, v in exp_sum.items())
        if m.__name__ in ("r01_whitespace_detail", "r08_stmt_txn_order", "r15_grand_other_tie") and not s["equivalence_strict"] < 1: bad = True
        if m.__name__ == "r07_tie_order" and s["layout"]["tranrept_report"]["page_totals_equal"]: bad = True
        ok &= not bad
        print(f'{"FAIL" if bad else "ok  "} {m.__name__:26} {m.__doc__.strip()[:72]}')
        if bad: print("      expected", exp_rules, exp_sum, "\n      got     ", got, {k: s[k] for k in exp_sum})
    print("SELFTEST", "PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
