#!/usr/bin/env bash
# Recreates results/runs/A5_golden/<set>/: golden/d1's INTCALC outputs next to golden/v1's POSTTRAN category-balance
# file, which the scorer reads to find the last account. Used to score A5, A6 and A6b.
set -euo pipefail
cd "$(dirname "$0")/.."
for s in base c01 c02 c03 c04; do
  d=results/runs/A5_golden/$s; mkdir -p "$d"
  if [ "$s" = base ]; then g=golden/d1; v=golden/v1; else g=golden/d1/cases/$s/out; v=golden/v1/cases/$s/out; fi
  for f in intcalc_acctdata.txt intcalc_systran.txt; do ln -sf "../../../../$g/$f" "$d/$f"; done
  ln -sf "../../../../$v/posttran_tcatbal.txt" "$d/posttran_tcatbal.txt"
done
echo linked
