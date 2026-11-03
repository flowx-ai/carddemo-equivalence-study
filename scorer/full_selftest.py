#!/usr/bin/env python3
"""Self-test of scorer/full_compare.py, on the oracle's own answer key (no FlowX). Exit 0 only if every check passes.
1. Identity: all scored v1 and v2 cases against themselves: 100%, matches legacy, hypotheses hold.
2. Negative controls: one planted defect per rule, on every kind of data the study adds, with exact counts. Each must fail.
3. What must not count: masks and exclusions. 4. Flags. 5. A24's limitation closed: blank extras are counted apart and a non-blank
extra counts. 6. The other full-application self-tests and A24's own."""
import json, pathlib, shutil, subprocess, sys, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scorer")); sys.path.insert(0, str(ROOT / "tools"))
import full_compare as C, full_lib as F, online_compare as OC  # noqa: E402
TAGS = json.loads((ROOT / "scorer/online/TAGS_v2.json").read_text()); CASES = C.all_cases(); results = []


def check(name, ok, info=""):
    results.append(bool(ok)); print(("ok   " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))


def score(cand, cases=None, flags=None):
    pc = {c: C.score_case(cand, c, TAGS, flags or []) for c in (cases or CASES)}
    return pc, C.summarise(pc)


def diffs(pc, c):
    return [u for u in pc[c][0] if not u["equal"] and u["kind"] != "quirk"]


def ed_scr(cand, case, step, fn):
    p = cand / case / "screens.json"; d = json.loads(p.read_text())
    for s in d["steps"]:
        if s["step"] == step:
            fn(s)
    p.write_text(json.dumps(d))


def ed_file(cand, case, f, fn):
    p = cand / case / "files" / f"{f}.txt"
    recs = [F.decode(f, l) for l in p.read_bytes().decode("latin-1").split("\n") if l]
    out = []
    for r in fn(recs):
        j = {k: (float(v) if hasattr(v, "quantize") else v) for k, v in r.items()}
        if f == "USRSEC":
            j["pwd"] = F.PWD_MASK
        out.append(j)
    F.write_file(p, f, out)


def main():
    work = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp(prefix="full_selftest_"))
    base = work / "identity"; shutil.rmtree(base, ignore_errors=True)
    for c in CASES:
        C.export_candidate(C.gdir_of(c) / c, base / c)
    pc, r = score(base)
    bad = [c for c in CASES if diffs(pc, c) or r["cases"][c]["outcome_untagged"] != "matches legacy"]
    check(f"identity: all {len(CASES)} cases 100% and matches legacy", not bad, str(bad[:6]))
    tot = {k: (v["equal"], v["units"]) for k, v in r["pooled"].items()}
    check("identity pooled 100%", all(e == n for e, n in tot.values()), str(tot))
    check("identity: core screens on all 17 programs, money files, list paging hold", r["H_core_screens"]["holds"] and r["H_money_files"]["holds"] and r["H_list_paging"]["holds"],
          f"core {r['H_core_screens']['programs_no_silent']}/17, paging {r['H_list_paging']['units']} units on {r['H_list_paging']['steps']} steps, money silent {r['H_money_files']['silent_units']}")
    check("the core list names all 17 online programs; HF1 holds", len(C.CORE) == 17 and r["H_reachable"]["holds"])
    check("list paging is not vacuous: PF7 and PF8 steps on all three lists", r["H_list_paging"]["steps"] >= 10 and r["H_list_paging"]["units"] > 150, str(r["H_list_paging"]))
    check("R-CEE-PIC8 column: some units rest on it; quirk column exists", r["columns"]["pic8"][1] > 0 and r["columns"]["quirk"][1] > 0, str(r["columns"]))
    tagged = sum(len(v["tagged_steps"]) for v in TAGS["cases"].values())
    check("tag list covers v1 and v2 cases", len(TAGS["cases"]) >= 55 and tagged > 0, f"{len(TAGS['cases'])} cases, {tagged} tagged steps")

    def fresh(tag):
        d = work / tag; shutil.rmtree(d, ignore_errors=True); shutil.copytree(base, d); return d

    d = fresh("nav"); ed_scr(d, "o2-trl-01", 4, lambda s: s.update(nav="COSGN0A")); pc, r = score(d, ["o2-trl-01"]); x = diffs(pc, "o2-trl-01")
    check("negative: list page goes to the wrong screen = 1 R-ONL-NAV", [u["rule"] for u in x] == ["R-ONL-NAV"], str([(u["rule"], u["step"]) for u in x]))
    d = fresh("msg"); ed_scr(d, "o2-uad-01", 6, lambda s: s["msg"].update(ERRMSG="Saved.")); pc, r = score(d, ["o2-uad-01"]); x = diffs(pc, "o2-uad-01")
    check("negative: another message on the user-add screen = 1 R-ONL-MSG, silent", [u["rule"] for u in x] == ["R-ONL-MSG"] and r["cases"]["o2-uad-01"]["rules_silent"] == ["R-ONL-MSG"], str([(u["rule"], u["step"], u["name"]) for u in x]))
    pc2, r2 = score(d, ["o2-uad-01"], [{"rule": "R-ONL-MSG", "case": "o2-uad-01", "field": "ERRMSG"}])
    check("flag covers the message: nothing silent", r2["cases"]["o2-uad-01"]["rules_silent"] == [])
    pc2, r2 = score(d, ["o2-uad-01"], [{"rule": "R-ONL-FIELD", "case": "o2-uad-01"}])
    check("flag for another rule leaves it silent", r2["cases"]["o2-uad-01"]["rules_silent"] == ["R-ONL-MSG"])
    d = fresh("row"); ed_scr(d, "o2-trl-01", 4, lambda s: s["fields"].update(TRNID01="0000000000000000")); pc, r = score(d, ["o2-trl-01"]); x = diffs(pc, "o2-trl-01")
    check("negative: a wrong row on page 2 = 1 R-ONL-FIELD", [(u["rule"], u["name"]) for u in x] == [("R-ONL-FIELD", "TRNID01")], str([(u["rule"], u["name"]) for u in x]))
    pc, r = score(d, ["o2-trl-01"] + [c for c in C.PAGING if c != "o2-trl-01"])
    check("negative: a wrong row breaks list paging", not r["H_list_paging"]["holds"], str(r["H_list_paging"]))
    d = fresh("pg"); ed_scr(d, "o2-ccl-02", 6, lambda s: s["fields"].update(CRDNUM1="0000000000000000")); pc, r = score(d, C.PAGING)
    check("negative: a wrong row on a later card page breaks list paging", not r["H_list_paging"]["holds"], str(r["H_list_paging"]))
    d = fresh("pic"); ed_file(d, "o2-aup-03", "ACCTDAT", lambda rs: [dict(r, curr_bal=float(r["curr_bal"]) + 1) if r["acct_id"] == 1 else r for r in rs]); pc, r = score(d, C.MONEY)
    check("R-CEE-PIC8: a difference on a record resting on it is reported apart and does not decide money files", r["H_money_files"]["silent_resting_on_pic8"] == 1 and r["H_money_files"]["holds"], str(r["H_money_files"]))
    d = fresh("miss"); ed_scr(d, "o2-ccl-01", 4, lambda s: s["fields"].pop("CRDNUM1", None)); pc, r = score(d, ["o2-ccl-01"]); x = diffs(pc, "o2-ccl-01")
    check("negative: a row field the page lacks = 1 R-ONL-FIELD", len(x) == 1 and x[0]["rule"] == "R-ONL-FIELD", str([(u["rule"], u["step"], u["name"]) for u in x]))
    d = fresh("extra"); ed_scr(d, "o-avw-01", 4, lambda s: s["fields"].update(ACSTNUMX="1", ZZBLANK="  ")); pc, r = score(d, ["o-avw-01"]); x = diffs(pc, "o-avw-01")
    check("A24's limit closed: non-blank extra = 1 unit; blank extra = 0 units, counted apart", [u["name"] for u in x] == ["ACSTNUMX"] and r["columns"]["blank_extras"] == 1, f"{[u['name'] for u in x]}, blank {r['columns']['blank_extras']}")
    d = fresh("card"); ed_file(d, "o2-csl-02", "CARDDAT", lambda rs: [dict(r, embossed_name="X") if r["card_num"] == "9805583408996588" else r for r in rs]); pc, r = score(d, ["o2-csl-02"]); x = diffs(pc, "o2-csl-02")
    check("negative: a card record altered = 1 R-ONL-FILE on CARDDAT", [(u["rule"], u["file"]) for u in x] == [("R-ONL-FILE", "CARDDAT")], str([(u["rule"], u["file"]) for u in x]))
    d = fresh("user"); ed_file(d, "o2-uad-01", "USRSEC", lambda rs: rs[:-1]); pc, r = score(d, ["o2-uad-01"]); x = diffs(pc, "o2-uad-01")
    check("negative: a user record dropped = 1 R-ONL-FILE on USRSEC", [(u["rule"], u["file"]) for u in x] == [("R-ONL-FILE", "USRSEC")], str([(u["rule"], u["file"], u["name"]) for u in x]))
    d = fresh("acct"); ed_file(d, "o-bil-01", "ACCTDAT", lambda rs: [dict(r, curr_bal=float(r["curr_bal"]) + 1) if r["acct_id"] == 1 else r for r in rs]); pc, r = score(d, ["o-bil-01"]); x = diffs(pc, "o-bil-01")
    check("negative: a balance off by 1.00 = 1 R-ONL-ACCT", [u["rule"] for u in x] == ["R-ONL-ACCT"])
    pc, r = score(d, C.MONEY)
    check("negative: that breaks money files", not r["H_money_files"]["holds"], str(r["H_money_files"]))
    d = fresh("jobmiss"); (d / "o2-rpt-01/files/JOBS.json").unlink(); pc, r = score(d, ["o2-rpt-01"]); x = diffs(pc, "o2-rpt-01")
    n = len(C.legacy_jobs(C.V2 / "o2-rpt-01"))
    check("negative: no job request = one R-ONL-JOB per job", n > 0 and [u["rule"] for u in x] == ["R-ONL-JOB"] * n, f"{n} jobs: {[u['name'] for u in x]}")
    d = fresh("jobdate"); j = json.loads((d / "o2-rpt-01/files/JOBS.json").read_text()); j[0]["start_date"] = "2022-08-01"; (d / "o2-rpt-01/files/JOBS.json").write_text(json.dumps(j)); pc, r = score(d, ["o2-rpt-01"]); x = diffs(pc, "o2-rpt-01")
    check("negative: another report period = 1 R-ONL-JOB", [u["rule"] for u in x] == ["R-ONL-JOB"])
    d = fresh("jobextra"); (d / "o-avw-01/files/JOBS.json").write_text(json.dumps([{"start_date": "2022-07-01", "end_date": "2022-07-31"}])); pc, r = score(d, ["o-avw-01"]); x = diffs(pc, "o-avw-01")
    check("negative: a job where legacy has none = 1 R-ONL-JOB", [u["rule"] for u in x] == ["R-ONL-JOB"])
    sid = "0000000996722788"
    d = fresh("clock"); ed_file(d, "o-bil-01", "TRANSACT", lambda rs: [dict(r, proc_ts="2026-10-30 09:00:00.000000", orig_ts="2026-10-30 09:00:00.000000") if r["tran_id"] == sid else r for r in rs]); pc, r = score(d, ["o-bil-01"]); x = diffs(pc, "o-bil-01")
    check("negative: the wall clock on a session row = 1 R-ONL-CLOCK", [u["rule"] for u in x] == ["R-ONL-CLOCK"], str([(u["rule"], u["name"]) for u in x]))
    d = fresh("tran"); ed_file(d, "o2-tad-01", "TRANSACT", lambda rs: [r for r in rs if r["tran_id"] != sid]); pc, r = score(d, ["o2-tad-01"]); x = diffs(pc, "o2-tad-01")
    check("negative: a session row missing = R-ONL-TRAN", {u["rule"] for u in x} == {"R-ONL-TRAN"} and len(x) == 1, str([(u["rule"], u["name"]) for u in x]))
    d = fresh("unreach"); ed_scr(d, "o2-usl-01", 4, lambda s: s.update(reached=False)); pc, r = score(d, ["o2-usl-01"]); x = diffs(pc, "o2-usl-01"); n4 = sum(1 for u in pc["o2-usl-01"][0] if u["step"] == 4)
    check("negative: a step not reachable = every unit, outcome not reachable", len(x) == n4 > 0 and {u["rule"] for u in x} == {"R-ONL-UNREACH"} and "not reachable" in (r["cases"]["o2-usl-01"]["outcome_untagged"], r["cases"]["o2-usl-01"]["outcome_tagged"]), f"{len(x)} of {n4}")
    pc, r = score(d, list(C.CORE.values()))
    check("negative: a core step not reachable fails HF1", not r["H_reachable"]["holds"] and "COUSR00C" in r["H_reachable"]["not_reachable_or_absent"], str(r["H_reachable"]["not_reachable_or_absent"]))
    d = fresh("absent"); shutil.rmtree(d / "o2-trv-01"); pc, r = score(d, ["o2-trv-01"]); x = diffs(pc, "o2-trv-01")
    check("negative: a case absent = every unit R-ABSENT, outcome absent", {u["rule"] for u in x} == {"R-ABSENT"} and r["cases"]["o2-trv-01"]["outcome_untagged"] == "absent", f"{len(x)} units")

    d = fresh("mask")
    ed_file(d, "o-bil-01", "TRANSACT", lambda rs: [dict(r, orig_ts="2022-07-18 23:59:59.000000", proc_ts="2022-07-18 23:59:59.000000") if r["tran_id"] == sid else r for r in rs])
    ed_scr(d, "o2-adm-01", 3, lambda s: s.update(nav="X", msg={"ERRMSG": "anything"})); ed_scr(d, "o2-ccl-04", 5, lambda s: s.update(nav="X")); ed_scr(d, "o2-trl-02", 7, lambda s: s.update(nav="X"))
    ed_scr(d, "o2-trl-01", 4, lambda s: s["fields"].update(TAMT001="$" + str(s["fields"]["TAMT001"]).strip()) if s["fields"].get("TAMT001") else None)
    pc, r = score(d, ["o-bil-01", "o2-adm-01", "o2-ccl-04", "o2-trl-02", "o2-trl-01"]); x = [u for c in pc for u in diffs(pc, c)]
    check("must not count: time part of a session row, invalid-key step, impossible selection, abend step, '$' on an amount", not x, str([(u["case"], u["rule"], u["name"]) for u in x]))
    changed = [c for c in CASES if c.startswith("o2-aup-") and any(u["kind"] == "quirk" for u in C.score_case(base, c, TAGS, [])[0])]
    if changed:
        c = changed[0]; q = [u["name"] for u in C.score_case(base, c, TAGS, [])[0] if u["kind"] == "quirk"][0]; d = fresh("quirk")
        ed_file(d, c, "ACCTDAT", lambda rs: [dict(r, addr_zip="11111") if int(r["acct_id"]) == int(q) else r for r in rs]); pc, r = score(d, [c])
        check(f"must not count in totals: COACTUPC zip on {c}, reported as a quirk unit that differs", not diffs(pc, c) and r["columns"]["quirk"][0] < r["columns"]["quirk"][1], str(r["columns"]["quirk"]))
    cup = [c for c in CASES if c.startswith("o2-cup-") and any(u["kind"] == "file" and u["file"] == "CARDDAT" for u in C.score_case(base, c, TAGS, [])[0]) and (C.gdir_of(c) / c / "files/CARDDAT.txt").read_bytes() != (C.V2 / "o2-rpt-01/files/CARDDAT.txt").read_bytes()]
    if cup:
        c = cup[0]; g = F.read_file(C.gdir_of(c) / c / "files/CARDDAT.txt", "CARDDAT"); b = C.base_state(c)["CARDDAT"]; k = [k for k in g if not OC.rec_equal("CARDDAT", b[k], g[k], set())][0]; d = fresh("cvv")
        ed_file(d, c, "CARDDAT", lambda rs: [dict(r, cvv_cd=999) if r["card_num"] == k else r for r in rs]); pc, r = score(d, [c])
        check(f"must not count: cvv on the card a session changed ({c})", not diffs(pc, c), str([(u["rule"], u["name"]) for u in diffs(pc, c)]))
    for t in ("scorer/full_batch_selftest.py", "scorer/full_e2e_selftest.py", "tests-full/adapter_selftest.py", "tests-full/ui_selftest.py"):
        if (ROOT / t).exists():
            p = subprocess.run([sys.executable, str(ROOT / t), str(work / pathlib.Path(t).stem)], capture_output=True, text=True, cwd=ROOT)
            last = (p.stdout.strip().splitlines() or [""])[-1]
            check(f"{t}", p.returncode == 0, last)
    p = subprocess.run([sys.executable, str(ROOT / "tools/check_secrets.py"), str(work)], capture_output=True, text=True, cwd=ROOT)
    check("no sample password in anything the self-tests wrote", p.returncode == 0, (p.stdout.strip().splitlines() or [""])[-1])
    p = subprocess.run([sys.executable, str(ROOT / "scorer/online_selftest.py"), str(work / "a24")], capture_output=True, text=True, cwd=ROOT)
    check("A24's scorer/online_selftest.py still passes, unchanged", p.returncode == 0, (p.stdout.strip().splitlines() or [""])[-1])
    print(f"\n{sum(results)}/{len(results)} checks passed"); sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
