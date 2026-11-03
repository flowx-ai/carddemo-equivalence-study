#!/usr/bin/env python3
"""Self-test of scorer/online_compare.py (A24 instrument validation, before any A24 output is opened).

  python3 scorer/online_selftest.py [workdir]          exit 0 only if every check passes

1. Identity: golden-online/v1 exported in the candidate format and scored against itself: every scored case 100%
   (screen and file units, tagged and untagged), outcome "matches legacy", H15, H16 and H17 hold.
2. One planted defect per rule, each on a fresh copy, with the exact count of differing units asserted.
3. Things that must NOT count: a changed timestamp on a session-written transaction, o-bil-04's card number on its
   session row, an edit inside an excluded step, an amount shown as $194.00, whitespace around a message.
4. Flags: a planted message defect with a matching flag gives "differs from legacy, flagged"; a flag for another
   rule leaves it silent.
"""
import json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scorer")); sys.path.insert(0, str(ROOT / "tools"))
import online_compare as OC  # noqa: E402
import a24_lib as L  # noqa: E402

G = ROOT / "golden-online/v1"
TAGS = json.loads((ROOT / "scorer/online/TAGS_v1.json").read_text())
CASES = sorted(p.name for p in G.iterdir() if p.is_dir() and p.name.startswith("o-") and p.name not in OC.UNSCORED)
results = []


def check(name, ok, info=""):
    results.append((name, bool(ok)))
    print(("ok   " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))


def export(dst):
    for c in CASES:
        OC.export_candidate(G / c, dst / c)


def score(cand, cases=None, flags=None):
    pc = {c: OC.score_case(G, cand, c, TAGS, flags or []) for c in (cases or CASES)}
    return pc, OC.summarise(pc)


def diffs(pc, case):
    return [u for u in pc[case][0] if not u["equal"]]


def edit_screen(cand, case, step, fn):
    p = cand / case / "screens.json"; d = json.loads(p.read_text())
    for s in d["steps"]:
        if s["step"] == step:
            fn(s)
    p.write_text(json.dumps(d))


def edit_file(cand, case, f, fn):
    p = cand / case / "files" / f"{f}.txt"
    recs = [L.decode(f, l) for l in p.read_bytes().decode("latin-1").split("\n") if l]
    recs = fn(recs)
    out = []
    for r in recs:
        j = {k: (float(v) if hasattr(v, "quantize") else v) for k, v in r.items()}
        if f == "USRSEC":
            j["pwd"] = L.PWD_MASK
        out.append(j)
    L.write_file(p, f, out)


def main():
    work = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp(prefix="online_selftest_"))
    base = work / "identity"
    if base.exists():
        shutil.rmtree(base)
    export(base)

    # 1. identity
    pc, r = score(base)
    for c in CASES:
        rc = r["cases"][c]
        full = all(rc[k][0] == rc[k][1] for k in ("screen_untagged", "screen_tagged", "file_untagged", "file_tagged"))
        check(f"identity {c}: 100% and matches legacy", full and rc["outcome_untagged"] == "matches legacy",
              f"screen {rc['screen_untagged']}+{rc['screen_tagged']} file {rc['file_untagged']}+{rc['file_tagged']}")
    check("identity H15 / H16 / H17 hold", r["H15_payment_files"]["holds"] and r["H16_core_no_silent"]["holds"]
          and r["H17_account_view_fields"]["holds"], json.dumps({k: r[k] for k in ("H15_payment_files", "H17_account_view_fields")}))
    tot = {k: (v["equal"], v["units"]) for k, v in r["pooled"].items()}
    check("identity pooled 100%", all(e == n for e, n in tot.values()), str(tot))

    def fresh(tag):
        d = work / tag
        if d.exists():
            shutil.rmtree(d)
        shutil.copytree(base, d)
        return d

    # 2. one defect per rule
    d = fresh("nav"); edit_screen(d, "o-bil-01", 6, lambda s: s.update(nav="COSGN0A"))
    pc, r = score(d, ["o-bil-01"]); x = diffs(pc, "o-bil-01")
    check("R-ONL-NAV: 1 unit", len(x) == 1 and x[0]["rule"] == "R-ONL-NAV", str([(u['rule'], u['step'], u['name']) for u in x]))
    check("R-ONL-NAV on a core case breaks H16", not r["H16_core_no_silent"]["holds"])

    d = fresh("msg"); edit_screen(d, "o-bil-01", 5, lambda s: s["msg"].update(ERRMSG="Payment done."))
    pc, r = score(d, ["o-bil-01"]); x = diffs(pc, "o-bil-01")
    check("R-ONL-MSG: 1 unit, silent", len(x) == 1 and x[0]["rule"] == "R-ONL-MSG"
          and r["cases"]["o-bil-01"]["outcome_tagged"] == "differs from legacy, silent", str([(u['rule'], u['step'], u['name'], u['tagged']) for u in x]))
    pc, r = score(d, ["o-bil-01"], [{"rule": "R-ONL-MSG", "case": "o-bil-01", "field": "ERRMSG", "source": "selftest"}])
    check("flag covers the MSG defect -> flagged", r["cases"]["o-bil-01"]["outcome_tagged"] == "differs from legacy, flagged")
    pc, r = score(d, ["o-bil-01"], [{"rule": "R-ONL-FIELD", "case": "o-bil-01", "source": "selftest"}])
    check("flag for another rule leaves it silent", r["cases"]["o-bil-01"]["outcome_tagged"] == "differs from legacy, silent")

    d = fresh("field"); edit_screen(d, "o-avw-01", 4, lambda s: s["fields"].update(ACURBAL="195.00"))
    pc, r = score(d, ["o-avw-01"]); x = diffs(pc, "o-avw-01")
    check("R-ONL-FIELD: 1 unit; H17 fails", len(x) == 1 and x[0]["rule"] == "R-ONL-FIELD" and not r["H17_account_view_fields"]["holds"],
          str([(u['rule'], u['step'], u['name']) for u in x]))

    d = fresh("extra"); edit_screen(d, "o-avw-01", 4, lambda s: s["fields"].update(ACSTNUMX="1"))
    pc, r = score(d, ["o-avw-01"]); x = diffs(pc, "o-avw-01")
    check("extra field: 1 unit R-ONL-FIELD", len(x) == 1 and x[0]["rule"] == "R-ONL-FIELD" and x[0]["name"] == "ACSTNUMX")

    d = fresh("acct")
    edit_file(d, "o-bil-01", "ACCTDAT", lambda rs: [dict(r, curr_bal=r["curr_bal"] + 1) if r["acct_id"] == 1 else r for r in rs])
    pc, r = score(d, ["o-bil-01"]); x = diffs(pc, "o-bil-01")
    check("R-ONL-ACCT: 1 unit; H15 fails", len(x) == 1 and x[0]["rule"] == "R-ONL-ACCT" and not r["H15_payment_files"]["holds"],
          str([(u['rule'], u['name']) for u in x]))

    d = fresh("tran"); edit_file(d, "o-bil-03", "TRANSACT", lambda rs: [r for r in rs if r["tran_id"] != "0000000996722788"])
    pc, r = score(d, ["o-bil-03"]); x = diffs(pc, "o-bil-03")
    check("R-ONL-TRAN: missing session row = 1 unit", len(x) == 1 and x[0]["rule"] == "R-ONL-TRAN", str([(u['rule'], u['name']) for u in x]))

    d = fresh("tran2")
    edit_file(d, "o-bil-01", "TRANSACT", lambda rs: [dict(r, type_cd="01") if r["tran_id"] == "0000000996722788" else r for r in rs])
    pc, r = score(d, ["o-bil-01"]); x = diffs(pc, "o-bil-01")
    check("R-ONL-TRAN: session row type differs = 1 unit, tagged (write step tagged)",
          len(x) == 1 and x[0]["rule"] == "R-ONL-TRAN" and x[0]["tagged"], str([(u['rule'], u['name'], u['tagged']) for u in x]))

    d = fresh("file"); edit_file(d, "o-avw-01", "CUSTDAT", lambda rs: [dict(r, last_name="X") if r["cust_id"] == 5 else r for r in rs])
    pc, r = score(d, ["o-avw-01"]); x = diffs(pc, "o-avw-01")
    check("R-ONL-FILE: 1 unit", len(x) == 1 and x[0]["rule"] == "R-ONL-FILE", str([(u['rule'], u['name']) for u in x]))

    d = fresh("unreach"); edit_screen(d, "o-bil-02", 10, lambda s: s.update(reached=False))
    pc, r = score(d, ["o-bil-02"]); x = diffs(pc, "o-bil-02")
    n10 = sum(1 for u in pc["o-bil-02"][0] if u["step"] == 10)
    check("R-ONL-UNREACH: every unit of the step", len(x) == n10 and n10 > 0 and all(u["rule"] == "R-ONL-UNREACH" for u in x)
          and r["cases"]["o-bil-02"]["outcome_untagged"] == "not reachable", f"{len(x)} of {n10}")

    d = fresh("absent"); shutil.rmtree(d / "o-mnu-01")
    pc, r = score(d, ["o-mnu-01"]); x = diffs(pc, "o-mnu-01")
    check("R-ABSENT: every unit of the case", len(x) == len(pc["o-mnu-01"][0]) and all(u["rule"] == "R-ABSENT" for u in x)
          and r["cases"]["o-mnu-01"]["outcome_untagged"] == "absent", f"{len(x)} units")

    # 3. must not count
    d = fresh("mask")
    edit_file(d, "o-bil-01", "TRANSACT", lambda rs: [dict(r, orig_ts="2026-10-29 09:00:00.000000", proc_ts="x") if r["tran_id"] == "0000000996722788" else r for r in rs])
    edit_file(d, "o-bil-04", "TRANSACT", lambda rs: [dict(r, card_num="1234567890123456") if r["tran_id"] == "0000000996722788" else r for r in rs])
    edit_screen(d, "o-sgn-02", 5, lambda s: s.update(nav="X", msg={"ERRMSG": "anything"}))
    edit_screen(d, "o-bil-01", 4, lambda s: s["fields"].update(CURBAL="$194.00"))
    edit_screen(d, "o-bil-01", 4, lambda s: s["msg"].update(ERRMSG="  Confirm to make a bill payment...  "))
    edit_screen(d, "o-bil-01", 5, lambda s: s["msg"].update(ERRMSG="Payment successful. Your Transaction ID is 0000000996722788."))
    pc, r = score(d, ["o-bil-01", "o-bil-04", "o-sgn-02"])
    x = [u for c in pc for u in diffs(pc, c)]
    check("masked timestamps, o-bil-04 card, excluded step, $ amount, message whitespace (ends; one space for two): 0 units", not x,
          str([(u['case'], u['rule'], u['name']) for u in x]))
    edit_file(d, "o-avw-01", "TRANSACT", lambda rs: [dict(r, orig_ts="changed") if r["tran_id"] == "0000000996722787" else r for r in rs])
    pc, r = score(d, ["o-avw-01"])
    check("a base transaction's timestamp IS scored (R-ONL-FILE)", [u["rule"] for u in diffs(pc, "o-avw-01")] == ["R-ONL-FILE"])

    # 5. adapter "show" paths (instrument fix 6, A24 after the freeze): a plain path reads as before; "a|b|c" takes the
    #    one non-empty text; two or more non-empty texts give a marker that differs from legacy and is logged
    import adapter_online as AO
    resp = {"m": "Plain", "bill": {"error": "", "prompt": "Confirm to make a bill payment...", "success": None}}
    check("fix 6: a plain show path reads as before", AO.show_value(resp, "m") == ("Plain", False)
          and AO.show_value(resp, "nope") == (None, False))
    check("fix 6: one non-empty text of a|b|c is the value", AO.show_value(resp, "bill.error|bill.prompt|bill.success")
          == ("Confirm to make a bill payment...", False))
    check("fix 6: no non-empty text of a|b|c gives an empty value", AO.show_value({"bill": {}}, "bill.error|bill.prompt")
          == ("", False))
    amb = AO.show_value({"bill": {"error": "E", "prompt": "P"}}, "bill.error|bill.prompt|bill.success")
    check("fix 6: two non-empty texts are ambiguous (marker, flagged as ambiguous)", amb[1] and amb[0].startswith(AO.AMBIGUOUS))
    d = fresh("amb")
    edit_screen(d, "o-bil-01", 4, lambda s: s["msg"].update(ERRMSG=amb[0]))
    pc, r = score(d, ["o-bil-01"])
    check("fix 6: an ambiguous message scores as one differing message unit (R-ONL-MSG)",
          [u["rule"] for u in diffs(pc, "o-bil-01")] == ["R-ONL-MSG"], str([(u['rule'], u['name']) for u in diffs(pc, "o-bil-01")]))

    # batch self-tests still pass (A24 instrument validation)
    for bt in ("scorer/selftest.py", "scorer/report_selftest.py"):
        p = subprocess.run([sys.executable, str(ROOT / bt)], capture_output=True, text=True, cwd=ROOT)
        last = (p.stdout.strip().splitlines() or [""])[-1]
        check(f"batch self-test {bt}", p.returncode == 0 and last == "SELFTEST PASS", last)

    n_ok = sum(ok for _, ok in results)
    print(f"\n{n_ok}/{len(results)} checks passed")
    sys.exit(0 if n_ok == len(results) else 1)


if __name__ == "__main__":
    main()
