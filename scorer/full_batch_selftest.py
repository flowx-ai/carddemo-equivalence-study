#!/usr/bin/env python3
"""Self-test of scorer/full_batch_compare.py on golden/full-v1: identity, negative controls with exact counts, what must not count."""
import json, pathlib, shutil, sys, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent; sys.path.insert(0, str(ROOT / "scorer"))
import full_batch_compare as B  # noqa: E402
results = []
def check(n, ok, info=""):
    results.append(bool(ok)); print(("ok   " if ok else "FAIL ") + n + (f"  [{info}]" if info else ""))
work = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp()); base = work / "id"; shutil.rmtree(work, ignore_errors=True); CASES = B.all_cases()
for c in CASES:
    B.export_candidate(B.G / c, base / c)
def score(d, cs=None, fl=None):
    pc = {c: B.score_case(d, c, fl or []) for c in (cs or CASES)}; return pc, B.summarise(pc)
def fresh(t):
    d = work / t; shutil.copytree(base, d); return d
def diffs(pc, c):
    return [u for u in pc[c][0] if not u["equal"]]
def ed(d, c, f, fn):
    p = d / c / f"{f}.json"; x = json.loads(p.read_text()); x = fn(x); p.write_text(json.dumps(x))
pc, r = score(base); bad = [c for c in CASES if diffs(pc, c)]
check(f"identity: all {len(CASES)} cases match legacy", not bad, str(bad[:4])); check("identity: 7 programs, round trip holds", len(r["by_program"]) == 7 and r["H_round_trip"]["holds"], str({k: v["units"] for k, v in r["by_program"].items()}))
d = fresh("a"); ed(d, "f-exp-01", "export", lambda x: [dict(x[0], last_name="Z")] + x[1:]); pc, r = score(d, ["f-exp-01", "f-imp-01"]); x = diffs(pc, "f-exp-01")
check("negative: one export field altered = 1 R-BAT-REC; round trip fails", [u["rule"] for u in x] == ["R-BAT-REC"] and not r["H_round_trip"]["holds"], str([u["name"] for u in x]))
d = fresh("b"); ed(d, "f-exp-01", "export", lambda x: x[:-1]); pc, r = score(d, ["f-exp-01"]); x = diffs(pc, "f-exp-01")
check("negative: one export record missing = 1 unit", [u["name"] for u in x] == ["export:462"], str([u["name"] for u in x]))
d = fresh("c"); ed(d, "f-exp-01", "export", lambda x: x[1:] + x[:1]); pc, r = score(d, ["f-exp-01"])
check("negative: export order changed fails", len(diffs(pc, "f-exp-01")) == 462, str(len(diffs(pc, "f-exp-01"))))
d = fresh("d"); ed(d, "f-act-01", "acctext_out", lambda x: [dict(x[0], curr_cyc_debit="0.00")] + x[1:]); pc, r = score(d, ["f-act-01"]); x = diffs(pc, "f-act-01")
check("negative: CBACT01C's 2525.00 replaced by the account's own debit = 1 unit", [u["name"] for u in x] == ["acctext_out:1"], str([u["name"] for u in x]))
d = fresh("e"); (d / "f-act-03/acctext_rc.txt").unlink(); pc, r = score(d, ["f-act-03"]); x = diffs(pc, "f-act-03")
check("negative: rc 0 where legacy has 16 = 1 R-BAT-RC", [u["rule"] for u in x] == ["R-BAT-RC"])
d = fresh("f"); p = d / "f-xrf-01/xrefprint_sysout.txt"; L = p.read_text().splitlines(); p.write_text("\n".join(l for i, l in enumerate(L) if i not in (1,)) + "\n"); pc, r = score(d, ["f-xrf-01"]); x = diffs(pc, "f-xrf-01")
check("negative: a reader that prints one copy fewer differs", len(x) >= 1 and {u["rule"] for u in x} == {"R-BAT-LINE"}, str(len(x)))
d = fresh("g"); p = d / "f-trn-01/dailycheck_sysout.txt"; L = p.read_text().splitlines(); L = L[:-4] + L[-1:]; p.write_text("\n".join(L) + "\n"); pc, r = score(d, ["f-trn-01"]); x = diffs(pc, "f-trn-01")
check("negative: CBTRN01C without the last extra lookup differs", len(x) >= 1, str(len(x)))
d = fresh("err"); ed(d, "f-imp-03", "import_errors", lambda x: [dict(x[0], message="other")] + x[1:]); pc, r = score(d, ["f-imp-03"]); x = diffs(pc, "f-imp-03")
check("negative: an import error with another message = 1 unit", [u["name"] for u in x] == ["import_errors:1"], str([u["name"] for u in x]))
check("the contract's error form is what identity exports", json.loads((base / "f-imp-03/import_errors.json").read_text())[0] == {"rec_type": "Z", "seq": "5", "message": "Unknown record type encountered"})
d = fresh("h"); shutil.rmtree(d / "f-cus-01"); pc, r = score(d, ["f-cus-01"])
check("negative: a case absent = outcome absent", r["cases"]["f-cus-01"]["outcome"] == "absent" and {u["rule"] for u in diffs(pc, "f-cus-01")} == {"R-ABSENT"})
d = fresh("i"); ed(d, "f-exp-01", "export", lambda x: [dict(x[0], last_name="Z")] + x[1:]); pc, r = score(d, ["f-exp-01"], [{"rule": "R-BAT-REC", "case": "f-exp-01"}])
check("flag: the same defect, flagged", r["cases"]["f-exp-01"]["outcome"] == "differs from legacy, flagged")
d = fresh("j"); ed(d, "f-exp-01", "export", lambda x: [dict(r, timestamp="2022-07-18 10:00:00.000000") for r in x]); ed(d, "f-act-02", "acctext_out", lambda x: [dict(x[0], curr_cyc_debit="55.00")] + x[1:]); ed(d, "f-act-01", "acctext_out", lambda x: [dict(x[0], reissue_date="20250520zz")] + x[1:]); p = d / "f-trn-04/dailycheck_sysout.txt"; p.write_text("".join(l + "\n" for l in p.read_text().splitlines() if not l.startswith("libcob"))); pc, r = score(d, ["f-exp-01", "f-act-01", "f-act-02", "f-trn-04"]); x = [u for c in pc for u in diffs(pc, c)]
check("must not count: bytes never set in a timestamp, a reissue date and an unset debit; libcob lines", not x, str([(u["case"], u["name"]) for u in x][:5]))
d = fresh("k"); ed(d, "f-exp-01", "export", lambda x: [dict(r, timestamp="2026-10-30 09:00:00.00") for r in x]); pc, r = score(d, ["f-exp-01"])
check("negative: the wall clock in an export timestamp = every record", len(diffs(pc, "f-exp-01")) == 462, str(len(diffs(pc, "f-exp-01"))))
print(f"\n{sum(results)}/{len(results)} checks passed"); sys.exit(0 if all(results) else 1)
