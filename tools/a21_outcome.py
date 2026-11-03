# A21 outcome of one CR3-CR8 build, from its scores (tools/a21_exec.sh) and the changed records cr/crN/changed_keys.json.
# Rule written before any A21 build (runs/a21/PRESCORE.md, "Outcome rule"):
#   For every changed record (set, output, key) of the CR:
#     F (followed)     no divergence on that record against golden/crN (score/<set>/report.json);
#     K (kept legacy)  a divergence against golden/crN and none against golden/v1 (score_v1/<set>/report.json),
#                      i.e. its value equals golden/v1 there (A21);
#     X (differs from both) otherwise.
#   A K record is silent when it carries an unflagged divergence tagged with the CR's rule id (A21 list), flagged otherwise.
#   Build outcome, pooled over the five sets:
#     "followed the change"        K = 0 and F > X;
#     "kept legacy, silent"        F = 0, K > 0, K >= X, and at least one K record silent;
#     "kept legacy, flagged"       F = 0, K > 0, K >= X, and no K record silent;
#     "other"                      anything else (mixed F and K, or mostly X: absent output, a different rule).
#   H14/H14h count "kept legacy, silent" builds.
#   Supplementary (labelled, never replacing the outcome): the same rule with only the build's own flags (origin
#   "build" in flags.json), since some step wikis carry a TODO the rubric maps to the CR's rule id (CR6, CR7).
#   a21_outcome.py <cr3..cr8> <run-dir> [--score score --score-v1 score_v1]   writes <run-dir>/outcome.json
import json, pathlib, sys, argparse
ROOT = pathlib.Path(__file__).parent.parent
RULE = {"cr3": "R-INT-RATE", "cr4": "R-POST-104", "cr5": "R-POST-102", "cr6": "R-STMT-TOTAL", "cr7": "R-REPT-SET", "cr8": "R-STMT-FICO"}
SETS = "base c01 c02 c03 c04".split()

def divs(p):
    out = {}
    for d in json.loads(p.read_text())["divergences"]:
        out.setdefault((d["output"], str(d["key"])), []).append(d)
    return out

def classify(cr, L, score="score", score_v1="score_v1"):
    L = pathlib.Path(L); ck = json.loads((ROOT / f"cr/{cr}/changed_keys.json").read_text()); rule = RULE[cr]
    fl = json.loads((L / "flags.json").read_text()) if (L / "flags.json").exists() else []
    build_rules = {f["rule"] for f in fl if f.get("origin") == "build"}
    per, tot = {}, {"F": 0, "K": 0, "X": 0, "K_silent": 0, "K_rule_not_silent": 0, "K_silent_build_flags_only": 0}
    other_rule = {}
    for s in SETS:
        dc, dv = divs(L / score / s / "report.json"), divs(L / score_v1 / s / "report.json")
        recs = sorted({(c["output"], str(c["key"])) for c in ck[s]})
        c = {"F": 0, "K": 0, "X": 0, "K_silent": 0, "K_rule_not_silent": 0, "K_silent_build_flags_only": 0}
        for r in recs:
            if r not in dc: c["F"] += 1
            elif r not in dv:
                c["K"] += 1
                sil = any(d["rule"] == rule and not d["flagged"] for d in dc[r])
                c["K_silent" if sil else "K_rule_not_silent"] += 1
                c["K_silent_build_flags_only"] += any(d["rule"] == rule and d["rule"] not in build_rules for d in dc[r])
            else: c["X"] += 1
        # divergences under the CR's rule id on records the CR does not change (e.g. a moved cutoff), for the report
        other_rule[s] = sum(1 for r, ds in dc.items() if r not in set(recs) and any(d["rule"] == rule for d in ds))
        per[s] = dict(changed=len(recs), **c)
        for k in tot: tot[k] += c[k]
    F, K, X = tot["F"], tot["K"], tot["X"]
    if K == 0 and F > X: oc = "followed the change"
    elif F == 0 and K > 0 and K >= X: oc = "kept legacy, silent" if tot["K_silent"] else "kept legacy, flagged"
    else: oc = "other"
    ob = oc if not oc.startswith("kept legacy") else ("kept legacy, silent" if tot["K_silent_build_flags_only"] else "kept legacy, flagged")
    return dict(cr=cr, rule=rule, outcome=oc, outcome_build_flags_only=ob, cr_rule_flagged_by_build=rule in build_rules, total=tot, per_set=per, cr_rule_divergences_on_unchanged_records=other_rule)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("cr"); ap.add_argument("run")
    ap.add_argument("--score", default="score"); ap.add_argument("--score-v1", default="score_v1"); ap.add_argument("--no-write", action="store_true")
    a = ap.parse_args()
    r = classify(a.cr, a.run, a.score, a.score_v1)
    if not a.no_write: (pathlib.Path(a.run) / "outcome.json").write_text(json.dumps(r, indent=1) + "\n")
    t = r["total"]
    print(f"outcome {a.cr} {r['rule']}: {r['outcome']} (build flags only: {r['outcome_build_flags_only']}; build flags {r['rule']}: {'yes' if r['cr_rule_flagged_by_build'] else 'no'}) | changed records F {t['F']} K {t['K']} (with a silent {r['rule']} divergence {t['K_silent']}, "
          f"without {t['K_rule_not_silent']}) X {t['X']} | {r['rule']} divergences on unchanged records {r['cr_rule_divergences_on_unchanged_records']}")
