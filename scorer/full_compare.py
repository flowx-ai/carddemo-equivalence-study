#!/usr/bin/env python3
"""Online scorer of the full-application study (DRAFT): a FlowX build's online run (tools/adapter_full.py) against the online
oracle, all 17 screens: golden-online/v1 (cases o-*) and golden-online/v2 (cases o2-*). A24's scorer/online_compare.py stays as
it is; this one imports its legacy-side parser and comparison helpers, and adds:

  files      CARDDAT is scored in every case (FILES has six).
  jobs       a report request is a job unit: the period of each job legacy's screen wrote to TD JOBS (PARM-START-DATE,
             PARM-END-DATE) against the build's files/JOBS.json [{start_date, end_date}], as a multiset. Rule R-ONL-JOB.
  clock      on a session-written TRANSACT row, the date part of orig_ts and proc_ts is one unit (R-ONL-CLOCK; the build reads the
             contract's RUN_TIMESTAMP). The time part stays masked, as in A24, as are the rest of those two fields.
  blank extra  a field the legacy step does not send, shown blank by the build, is not a unit: a blank element shows nothing. It
             is counted in `blank_extras`, so a reader can see the stricter figure. A non-blank one is a differing unit, as in A24.
  masks      compiler or data properties recorded in ONLINE_ORACLE 8.5, not scored: on an ACCTDAT row a COACTUPC session changed,
             addr_zip and group_id (the update record has no zip field) are reported as `quirk` units, outside every total; on a
             CARDDAT row a session changed, cvv_cd.
  columns    tagged (stub rule, TAGS_v2) and pic8 (rests on R-CEE-PIC8) are reported apart.

Exclusions, stated before any build; the mechanical rule for each:
  A24's list; steps whose legacy result is 'Invalid key pressed' (a key the screen does not offer);
  selection values a web list cannot produce (two rows selected, a value that is no action);
  a step ending in a task abend (o2-trl-02 step 7); steps after a case stopped on R-PROT-REFUSED (o2-cup-02 from step 9).
Everything else follows online_compare's docstring: units NAV, MSG, FIELD and file records; outcome classes; flags.
Rules (closed): those of A24, plus R-ONL-JOB and R-ONL-CLOCK."""
import argparse, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools")); sys.path.insert(0, str(ROOT / "scorer"))
import full_lib as F  # noqa: E402  (adds CARDDAT to the layouts online_compare reads)
import online_compare as OC  # noqa: E402
import yaml  # noqa: E402

FILES = F.FILES
V1, V2 = ROOT / "golden-online/v1", ROOT / "golden-online/v2"
UNSCORED = {"o-bil-06"}
EXCLUDED_STEPS = {**OC.EXCLUDED_STEPS, "o2-adm-01": {3}, "o2-rpt-01": {5}, "o2-tad-02": {9}, "o2-trv-01": {8}, "o2-uad-01": {7},
                  "o2-ccl-04": {4, 5}, "o2-trl-03": {6}, "o2-usl-01": {6}, "o2-trl-02": {7}}
STOP_AFTER = {"o2-cup-02": 8}
# one main-path case per screen; the hypotheses in prereg/drafts/FULL_DRAFT.md use these lists
CORE = {"COSGN00C": "o-sgn-01", "COMEN01C": "o-mnu-01", "COADM01C": "o2-adm-01", "COACTVWC": "o-avw-01", "COACTUPC": "o2-aup-01",
        "COCRDLIC": "o2-ccl-01", "COCRDSLC": "o2-csl-02", "COCRDUPC": "o2-cup-01", "COTRN00C": "o2-trl-01", "COTRN01C": "o2-trv-01",
        "COTRN02C": "o2-tad-01", "CORPT00C": "o2-rpt-01", "COBIL00C": "o-bil-01", "COUSR00C": "o2-usl-01", "COUSR01C": "o2-uad-01",
        "COUSR02C": "o2-uup-01", "COUSR03C": "o2-udl-01"}
MONEY = ["o-bil-01", "o-bil-03", "o2-tad-01", "o2-aup-03"]
PAGING = ["o2-ccl-01", "o2-ccl-02", "o2-trl-01", "o2-usl-01"]
JOBRE = re.compile(r"PARM-(START|END)-DATE,C'([0-9-]+)'")


ROWF = re.compile(r"^(TRNID|TDATE|TDESC|USRID|FNAME|LNAME|UTYPE)\d\d$|^TAMT\d{3}$|^(CRDNUM|ACCTNO|CRDSTS)\d$")


def TAG_CACHE(case):
    return json.loads((ROOT / "scorer/online/TAGS_v2.json").read_text())["cases"][case]["tagged_steps"]


def gdir_of(case):
    return V2 if case.startswith("o2-") else V1


def session_of(case):
    d = "cases-online-v2" if case.startswith("o2-") else "cases-online"
    return yaml.safe_load((ROOT / d / case / "session.yaml").read_text())


def all_cases():
    out = [p.name for g in (V1, V2) for p in sorted(g.iterdir()) if p.is_dir() and re.match(r"o2?-", p.name)]
    return [c for c in out if c not in UNSCORED]


def legacy_jobs(gcase):
    p = gcase / "td" / "JOBS.txt"
    if not p.exists():
        return []
    v = JOBRE.findall(p.read_text(errors="replace")); out = []
    for i in range(0, len(v) - 1, 2):
        out.append({"start_date": v[i][1], "end_date": v[i + 1][1]})
    return out


def export_candidate(gcase, ocase):
    gcase, ocase = pathlib.Path(gcase), pathlib.Path(ocase)
    st = OC.parse_screens(gcase / "screens.log"); steps = []
    for n, s in sorted(st.items()):
        e = s["end"] or {"nav": None, "msg": {}, "fields": {}}
        steps.append({"step": n, "reached": True, "nav": e["nav"], "msg": e["msg"], "fields": e["fields"]})
    (ocase / "files").mkdir(parents=True, exist_ok=True)
    (ocase / "screens.json").write_text(json.dumps({"case": gcase.name, "steps": steps}, indent=1) + "\n")
    for f in FILES:
        (ocase / "files" / f"{f}.txt").write_bytes((gcase / "files" / f"{f}.txt").read_bytes())
    if legacy_jobs(gcase):
        (ocase / "files" / "JOBS.json").write_text(json.dumps(legacy_jobs(gcase)) + "\n")


def base_state(case):
    sess = session_of(case); base = {}
    for f in FILES:
        lines = [l for l in (V2 / "o2-rpt-01/files" / f"{f}.txt").read_bytes().decode("latin-1").split("\n") if l]
        k = F.KEYLEN[f]
        for e in sess.get("data_edits") or []:
            if e["file"] != f:
                continue
            if "delete" in e:
                lines = [l for l in lines if l[:k] != e["delete"]]
            elif "add" in e:
                lines.append(e["add"].rstrip(" "))
            elif e.get("truncate"):
                lines = []
            elif "replace" in e:
                lines = [e["replace"].rstrip(" ") if l[:k] == e["replace"][:k] else l for l in lines]
        base[f] = {F.key_of(f, F.decode(f, l)): F.decode(f, l) for l in lines}
    return base


def score_case(cdir, case, tags, flags):
    gcase = gdir_of(case) / case; units = []; blank_extras = []
    leg = OC.parse_screens(gcase / "screens.log"); excl = EXCLUDED_STEPS.get(case, set())
    ctag = tags["cases"].get(case, {}); tsteps = {int(k) for k in ctag.get("tagged_steps", {})}; pic = ctag.get("pic8_from")
    ccase = pathlib.Path(cdir) / case; cscr = None
    if (ccase / "screens.json").exists():
        cscr = {s["step"]: s for s in json.loads((ccase / "screens.json").read_text())["steps"]}
    has_files = (ccase / "files").is_dir(); absent = cscr is None and not has_files

    def add(kind, step, name, rule, equal, tagged, screen=None, file=None, detail=None, pic8=False):
        u = dict(kind=kind, case=case, step=step, name=name, rule=None if equal else rule, equal=equal, tagged=tagged,
                 pic8=pic8, flagged=False, screen=screen, file=file, detail=detail)
        if not equal and not absent:
            u["flagged"] = any(fl.get("rule") == rule and fl.get("case", case) == case and fl.get("step", step) == step
                               and fl.get("field", name) == name and fl.get("screen", screen) == screen and fl.get("file", file) == file
                               for fl in flags)
        units.append(u)

    for n, s in sorted(leg.items()):
        if n in excl or s["end"] is None:
            continue
        e = s["end"]; tstep = n in tsteps; p8 = bool(pic and n >= pic); c = (cscr or {}).get(n)
        unreached = c is not None and c.get("reached") is False
        rule_of = lambda r: "R-ABSENT" if (absent or cscr is None or c is None) else ("R-ONL-UNREACH" if unreached else r)
        ok = lambda: c is not None and not unreached
        add("screen", n, "NAV", rule_of("R-ONL-NAV"), ok() and c.get("nav") == e["nav"], tstep, screen=e["nav"],
            detail={"legacy": e["nav"], "build": c.get("nav") if c else None}, pic8=p8)
        cmsg = (c or {}).get("msg") or {}
        for k, v in e["msg"].items():
            cv = cmsg.get(k)
            add("screen", n, k, rule_of("R-ONL-MSG"), ok() and cv is not None and OC.ws(v) == OC.ws(cv), tstep or bool(OC.RESP.search(v)),
                screen=e["nav"], detail={"legacy": v, "build": cv}, pic8=p8)
        cf = (c or {}).get("fields") or {}
        for k, v in e["fields"].items():
            add("screen", n, k, rule_of("R-ONL-FIELD"), ok() and OC.field_equal(v, cf.get(k)), tstep, screen=e["nav"],
                detail={"legacy": v, "build": cf.get(k)}, pic8=p8)
        for k in sorted(set(cf) - set(e["fields"]) - OC.MSG_FIELDS - OC.HEADER):
            if not ok():
                continue
            if str(cf[k]).strip() == "":
                blank_extras.append((n, k))
            else:
                add("screen", n, k, "R-ONL-FIELD", False, tstep, screen=e["nav"], detail={"legacy": None, "build": cf[k]}, pic8=p8)

    base = base_state(case); write_tagged = any(s in tsteps for s in ctag.get("write_steps", []))
    aup = case.startswith("o2-aup-")
    for f in FILES:
        g = F.read_file(gcase / "files" / f"{f}.txt", f); cpath = ccase / "files" / f"{f}.txt"
        c = F.read_file(cpath, f) if cpath.exists() else None
        for k in sorted(set(g) | set(c or {})):
            gr, cr = g.get(k), (c or {}).get(k)
            session_row = f == "TRANSACT" and k not in base["TRANSACT"]
            changed = gr is not None and (k not in base[f] or not OC.rec_equal(f, base[f][k], gr, set()))
            masked = {"orig_ts", "proc_ts"} if session_row else set()
            if session_row and case == "o-bil-04":
                masked |= {"card_num"}
            if f == "CARDDAT" and changed:
                masked |= {"cvv_cd"}
            quirk = f == "ACCTDAT" and changed and aup
            if quirk:
                masked |= {"addr_zip", "group_id"}
            rule = "R-ONL-ACCT" if f == "ACCTDAT" else "R-ONL-TRAN" if session_row else "R-ONL-FILE"
            if c is None:
                rule = "R-ABSENT"
            eq = gr is not None and cr is not None and OC.rec_equal(f, gr, cr, masked)
            add("file", None, k, rule, eq, bool(changed and write_tagged), file=f, pic8=bool(pic and changed),
                detail=None if eq else {"legacy": OC._show(f, gr), "build": OC._show(f, cr)})
            if quirk and gr is not None and cr is not None:
                add("quirk", None, k, "R-ONL-ACCT", all(F.canon(f, n, gr[n]) == F.canon(f, n, cr[n]) for n in ("addr_zip", "group_id")), False, file=f)
            if session_row and gr is not None and cr is not None and case != "o-bil-04":
                same = all(str(gr[n])[:10] == str(cr[n])[:10] for n in ("orig_ts", "proc_ts"))
                add("file", None, k + ":date", "R-ONL-CLOCK", same, False, file=f,
                    detail=None if same else {"legacy": [gr["orig_ts"], gr["proc_ts"]], "build": [cr["orig_ts"], cr["proc_ts"]]})
    gj = legacy_jobs(gcase); jp = ccase / "files" / "JOBS.json"
    cj = json.loads(jp.read_text()) if jp.exists() else []
    if gj or cj:
        key = lambda j: (str(j.get("start_date")), str(j.get("end_date")))
        gs, cs = sorted(map(key, gj)), sorted(map(key, cj))
        rem = list(cs); missed = []
        for i, x in enumerate(gs):
            if x in rem:
                rem.remove(x); add("file", None, f"job{i + 1}", "R-ONL-JOB", True, False, file="JOBS")
            else:
                missed.append((i, x))
        for i, x in missed:   # a job with another period is one differing unit, not a missing job and an extra one
            got = rem.pop(0) if rem else None
            add("file", None, f"job{i + 1}", "R-ABSENT" if absent else "R-ONL-JOB", False, False, file="JOBS", detail={"legacy": x, "build": got})
        for i, x in enumerate(rem):
            add("file", None, f"extra-job{i + 1}", "R-ONL-JOB", False, False, file="JOBS", detail={"legacy": None, "build": x})
    return units, absent, blank_extras


def eq(us):
    return (sum(u["equal"] for u in us), len(us))


def silent(us):
    return sum(1 for u in us if not u["equal"] and not u["flagged"])


def summarise(pc):
    allu = [u for v in pc.values() for u in v[0]]; r = {"cases": {}, "pooled": {}, "columns": {}}
    for cid, (us, ab, be) in pc.items():
        sc = [u for u in us if u["kind"] != "quirk"]
        r["cases"][cid] = {"outcome_untagged": OC.outcome([u for u in sc if not u["tagged"]], ab),
                           "outcome_tagged": OC.outcome([u for u in sc if u["tagged"]], ab) if any(u["tagged"] for u in sc) else None,
                           "screen": eq([u for u in sc if u["kind"] == "screen"]), "file": eq([u for u in sc if u["kind"] == "file"]),
                           "blank_extras": len(be), "rules_silent": sorted({u["rule"] for u in sc if not u["equal"] and not u["flagged"]})}
    for kind in ("screen", "file"):
        for t in (False, True):
            us = [u for u in allu if u["kind"] == kind and u["tagged"] == t]
            e, n = eq(us); r["pooled"][f"{kind}_{'tagged' if t else 'untagged'}"] = {"equal": e, "units": n, "equivalence": e / n if n else None}
    r["columns"] = {"pic8": eq([u for u in allu if u["pic8"]]), "without_pic8": eq([u for u in allu if not u["pic8"] and u["kind"] != "quirk"]),
                    "quirk": eq([u for u in allu if u["kind"] == "quirk"]), "blank_extras": sum(len(v[2]) for v in pc.values())}
    core = {p: c for p, c in CORE.items() if c in pc}
    gone = {p: r["cases"][c]["outcome_untagged"] for p, c in core.items() if pc[c][1] or any(u["rule"] in ("R-ONL-UNREACH", "R-ABSENT") for u in pc[c][0])}
    r["H_reachable"] = {"programs_scored": len(core), "not_reachable_or_absent": gone, "holds": len(core) == 17 and not gone}
    bad = {p: silent([u for u in pc[c][0] if u["kind"] == "screen" and not u["pic8"]]) for p, c in core.items()}
    r["H_core_screens"] = {"programs_scored": len(core), "programs_no_silent": sum(1 for v in bad.values() if v == 0), "silent_by_program": bad,
                           "silent_resting_on_pic8": sum(silent([u for u in pc[c][0] if u["kind"] == "screen" and u["pic8"]]) for c in core.values()),
                           "holds": len(core) == 17 and all(v == 0 for v in bad.values()) and not any(pc[c][1] for c in core.values())}
    m = [u for c in MONEY if c in pc for u in pc[c][0] if u["kind"] == "file" and u["file"] in ("ACCTDAT", "TRANSACT")]
    r["H_money_files"] = {"silent_units": silent([u for u in m if not u["pic8"]]), "silent_resting_on_pic8": silent([u for u in m if u["pic8"]]),
                          "holds": all(c in pc for c in MONEY) and bool(m) and silent([u for u in m if not u["pic8"]]) == 0}
    # paging: NAV and the row fields, tagged or not, on PF7 and PF8 steps; a step whose result rests on a browse rule (R-BR-*) is out
    pg = []
    for c in PAGING:
        if c not in pc:
            continue
        aid = {i: st.get("aid") for i, st in enumerate(session_of(c)["steps"], start=1)}; tg = TAG_CACHE(c)
        out = {int(k) for k, v in tg.items() if any(x.startswith("R-BR-") for x in v)}
        pg += [u for u in pc[c][0] if u["kind"] == "screen" and aid.get(u["step"]) in ("PF7", "PF8") and u["step"] not in out and (u["name"] == "NAV" or ROWF.match(u["name"]))]
    r["H_list_paging"] = {"equal": eq(pg)[0], "units": eq(pg)[1], "steps": len({(u["case"], u["step"]) for u in pg}), "holds": all(c in pc for c in PAGING) and bool(pg) and all(u["equal"] for u in pg)}
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cand"); ap.add_argument("--flags"); ap.add_argument("--tags", default=str(ROOT / "scorer/online/TAGS_v2.json"))
    ap.add_argument("--cases"); ap.add_argument("--out"); ap.add_argument("--export", nargs=2)
    a = ap.parse_args()
    if a.export:
        export_candidate(*a.export); return
    tags = json.loads(pathlib.Path(a.tags).read_text()); flags = json.loads(pathlib.Path(a.flags).read_text()) if a.flags else []
    cases = a.cases.split(",") if a.cases else all_cases()
    pc = {c: score_case(a.cand, c, tags, flags) for c in cases}; r = summarise(pc)
    if a.out:
        o = pathlib.Path(a.out); o.mkdir(parents=True, exist_ok=True)
        (o / "units.json").write_text(json.dumps([u for v in pc.values() for u in v[0]], indent=1, default=str) + "\n")
        (o / "summary.json").write_text(json.dumps(r, indent=1) + "\n")
    print(json.dumps(r, indent=1))


if __name__ == "__main__":
    main()
