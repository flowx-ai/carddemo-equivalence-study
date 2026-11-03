#!/usr/bin/env bash
# A21 scoring of one CR3-CR8 candidate whose decoded outputs are in <run-dir>/out/<set>, with the unchanged scorers:
#   CR3 scorer/compare.py vs results/runs/A21_golden/cr3/<set>; CR4, CR5 compare.py vs golden/crN[/cases/<set>/out];
#   CR6-CR8 scorer/report_compare.py vs golden/crN[/cases/<set>/out], --input data/in or cases/<set>/in (S4 is the
#   scorer default: the overflow statement of c04 is set aside).
# The same candidate is also scored against golden/v1 into score_v1/ (used only for "kept legacy", A21); then
# tools/a21_outcome.py writes <run-dir>/outcome.json.     tools/a21_score.sh <cr3..cr8> <run-dir>
set -euo pipefail
CR=$1; L=$2; O=$(cd "$(dirname "$0")/.." && pwd); cd "$O"; . tools/a21_lib.sh; a21_def $CR
F=$L/flags.json; [ -e $F ] || { echo "STOP: no flags.json in $L"; exit 6; }
gd() { [ $2 = base ] && echo golden/$1 || echo golden/$1/cases/$2/out; }
for s in base c01 c02 c03 c04; do
  I=data/in; [ $s != base ] && I=cases/$s/in; mkdir -p $L/out/$s
  case $STEP in
    intcalc) G=results/runs/A21_golden/cr3/$s; SC="scorer/compare.py"; OUTS=intcalc_systran,intcalc_acctdata; IN=;;
    posttran) G=$(gd $CR $s); SC="scorer/compare.py"; OUTS=posttran_transact,posttran_dalyrejs,posttran_acctdata,posttran_tcatbal; IN=;;
    creastmt) G=$(gd $CR $s); SC="scorer/report_compare.py"; OUTS=creastmt_statements,creastmt_statements_html; IN="--input $I";;
    tranrept) G=$(gd $CR $s); SC="scorer/report_compare.py"; OUTS=tranrept_report; IN="--input $I";;
  esac
  python3 $SC --golden $G --cand $L/out/$s $IN --flags $F --outputs $OUTS --out $L/score/$s > /dev/null
  python3 $SC --golden $(gd v1 $s) --cand $L/out/$s $IN --flags $F --outputs $OUTS --out $L/score_v1/$s > /dev/null
done
python3 - $L <<'PY'
import json,sys
for s in "base c01 c02 c03 c04".split():
    r=json.load(open(f"{sys.argv[1]}/score/{s}/report.json"))["summary"]
    print(s, f"strict {r['equivalence_strict']*100:.2f}% business {r['equivalence_business']*100:.2f}%",
          f"div {r['divergent_records']} silent {r['silent_records']} flagged {r['flagged_records']}",
          "silent:", ",".join(r['rules_silent']) or "-", "flagged:", ",".join(r['rules_flagged']) or "-")
PY
python3 tools/a21_outcome.py $CR $L
