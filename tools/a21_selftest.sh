#!/usr/bin/env bash
# A21 scoring-wiring self-test (before any A21 build): for each CR, golden/crN as the candidate (expect 100% and
# "followed the change") and golden/v1 as the candidate (expect the A21 legacy-kept figures and "kept legacy, silent"),
# and golden/v1 again with one flag on the CR's rule id (expect "kept legacy, flagged"), through tools/a21_score.sh
# (empty flags file in the first two). Work dirs under run/a21selftest/ (not committed).
#   tools/a21_selftest.sh > runs/a21/SELFTEST.txt
set -euo pipefail
O=$(cd "$(dirname "$0")/.." && pwd); cd "$O"; . tools/a21_lib.sh
gd() { [ $2 = base ] && echo golden/$1 || echo golden/$1/cases/$2/out; }
for CR in cr3 cr4 cr5 cr6 cr7 cr8; do a21_def $CR
  R=$(python3 -c "import sys; sys.path.insert(0,'tools'); from a21_outcome import RULE; print(RULE['$CR'])")
  for C in golden legacy legacyflag; do W=run/a21selftest/$CR-$C; rm -rf $W; mkdir -p $W/out; echo '[]' > $W/flags.json
    [ $C = legacyflag ] && echo "[{\"rule\": \"$R\", \"source\": \"selftest\", \"line\": 0, \"note\": \"selftest\", \"origin\": \"selftest\"}]" > $W/flags.json
    for s in base c01 c02 c03 c04; do
      if [ $C = golden ]; then S=$(gd $CR $s); [ $CR = cr3 ] && S=results/runs/A21_golden/cr3/$s; else S=$(gd v1 $s); fi
      mkdir -p $W/out/$s; cp -L $S/*.txt $W/out/$s/; done
    echo "== $CR ($STEP, $ID) candidate: $([ $C = golden ] && echo "golden/$CR" || echo golden/v1)$([ $C = legacyflag ] && echo ", one flag on $R")"
    tools/a21_score.sh $CR $W | sed 's/^/  /'
  done
done
