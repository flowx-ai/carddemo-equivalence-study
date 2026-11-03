#!/usr/bin/env python3
"""Online-to-batch scorer of the full-application study (DRAFT), for the four v2 end-to-end cases. tools/a24_e2e.py stays as it is;
its comparison (scorer/compare.py, scorer/report_compare.py, combtran record by record) is reused.
  python3 scorer/full_e2e_compare.py units <work>                        the touched units of each pair, vs golden/v1
  python3 scorer/full_e2e_compare.py score <case> <session-out> <baseline-out> <JOBS.json|-> <result.json>
Touched units: where the legacy pair (golden-online/v2/<case>/out) differs from golden/v1. For a report request (e2e-o2-rpt-*) the job
period is a touched unit too, from td/JOBS.txt of the online case: e2e-o2-rpt-01's chain is byte-identical to golden/v1, so without
this unit nothing would be tested. Outcome, as A24: carried through; carried through except inherited (each differing unit differs
in the same way in the baseline); differs from legacy; absent (a stage returned nothing).
Fix to a known property of A24's rule: a touched unit whose whole key is missing from a chain now counts as differing. In A24 such a
unit, keyed `missing`, did not match the touched unit's field and passed. The self-test's negative control found a second one: a touched record that is new in the pair (keyed `extra`) passed whatever its
fields held, as the divergence on a field did not match the record's key. Here any differing field of that record differs.
tools/a24_e2e.py has both properties, and A24's own results stay under A24's rule.
The session date comes from the contract's RUN_TIMESTAMP, so TRANREPT's July 2022 window keeps a build's rows (see FULL_DRAFT.md). A
build that stamps the wall clock loses them, and that is scored as a difference."""
import json, pathlib, shutil, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import a24_e2e as AE  # noqa: E402
import full_lib as F  # noqa: E402
sys.path.insert(0, str(ROOT / "scorer"))
import full_compare as FC  # noqa: E402
V2 = ROOT / "golden-online/v2"; V1 = ROOT / "golden/v1"; IN = ROOT / "data/in"
CASES = {"e2e-o2-tad-01": "o2-tad-01", "e2e-o2-aup-01": "o2-aup-03", "e2e-o2-rpt-01": "o2-rpt-01", "e2e-o2-rpt-02": "o2-rpt-02"}
PERIOD = ("job_requests", "period", "start_end")


def pair(case):
    return V2 / case / "out"


def touched(case):
    u = set(AE.divergences(pair(case), V1, IN))
    if FC.legacy_jobs(V2 / CASES[case]):
        u.add(PERIOD)
    return u


def legacy_period(case):
    j = FC.legacy_jobs(V2 / CASES[case])
    return sorted((x["start_date"], x["end_date"]) for x in j)


def cand_period(jobs):
    if jobs in (None, "-"):
        return []
    p = pathlib.Path(jobs)
    if not p.exists():
        return []
    return sorted((str(x.get("start_date")), str(x.get("end_date"))) for x in json.loads(p.read_text()))


def differs(u, div):
    """A touched unit keyed extra or missing covers its whole record: a change in any field of that record differs."""
    if u in div or (u[0], u[1], "missing") in div:
        return True
    return u[2] in ("extra", "missing") and any(d[0] == u[0] and d[1] == u[1] for d in div)


def classify(case, sd, bd, pu, jobs="-"):
    if sd is None or bd is None:
        return "absent", []
    bad = sorted(u for u in pu if u != PERIOD and differs(u, sd))
    if PERIOD in pu and cand_period(jobs) != legacy_period(case):
        bad.append(PERIOD)
    if not bad:
        return "carried through", []
    if PERIOD not in bad and all(differs(u, bd) for u in bad):
        return "carried through except inherited", bad
    return "differs from legacy", bad


def score(case, s, b, jobs, res):
    pu = touched(case); sd = AE.divergences(pair(case), pathlib.Path(s), IN); bd = AE.divergences(V1, pathlib.Path(b), IN)
    oc, bad = classify(case, sd, bd, pu, jobs)
    r = {"case": case, "outcome": oc, "touched_units": len(pu), "differing": bad, "session_divergences": None if sd is None else len(sd), "baseline_divergences": None if bd is None else len(bd)}
    pathlib.Path(res).write_text(json.dumps(r, indent=1, default=list) + "\n"); print(json.dumps(r, indent=1, default=list))


def main():
    a = sys.argv[1:]
    if a and a[0] == "units":
        for c in CASES:
            u = touched(c); print(c, len(u), sorted({x[0] for x in u}))
    elif a and a[0] == "score":
        score(*a[1:6])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
