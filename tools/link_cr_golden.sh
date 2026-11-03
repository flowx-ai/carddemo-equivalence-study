#!/usr/bin/env bash
# Recreates results/runs/A16_golden/cr1/<set>/ and results/runs/A21_golden/cr3/<set>/: the change-request golden
# INTCALC outputs next to golden/v1's POSTTRAN category-balance file, which the scorer reads to find the last account.
# Used to score CR1 (A16) and CR3 (A21).
set -euo pipefail
cd "$(dirname "$0")/.."
for pair in A16_golden:cr1 A21_golden:cr3; do
  n=${pair%%:*}; cr=${pair##*:}
  for s in base c01 c02 c03 c04; do
    d=results/runs/$n/$cr/$s; mkdir -p "$d"
    if [ "$s" = base ]; then g=golden/$cr; v=golden/v1; else g=golden/$cr/cases/$s/out; v=golden/v1/cases/$s/out; fi
    for f in intcalc_acctdata.txt intcalc_systran.txt; do ln -sfn "../../../../../$g/$f" "$d/$f"; done
    ln -sfn "../../../../../$v/posttran_tcatbal.txt" "$d/posttran_tcatbal.txt"
  done
done
echo linked
