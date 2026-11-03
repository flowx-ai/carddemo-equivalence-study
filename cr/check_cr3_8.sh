#!/usr/bin/env bash
# Oracle checks for CR3-CR8 (A21 draft), per set (base, c01-c04):
#   1. procedure check: the unpatched bin/ through the same runner reproduces golden/v1 for the step (run/v1chk-*);
#   2. upstream check (report steps): the context files kept in golden/<n> equal golden/v1's;
#   3. independent reference model on golden/<n>: PASS expected; on golden/v1 (negative control): FAIL expected;
#   4. scorer, unchanged: golden/<n> against itself (100% expected) and legacy golden/v1 as the candidate.
# compare.py scores INTCALC and POSTTRAN, report_compare.py (layer 1, A12) scores CREASTMT and TRANREPT.
# usage: cr/check_cr3_8.sh > cr/CHECK_CR3_8.txt
set -uo pipefail
cd "$(dirname "$0")/.."
SETS="base c01 c02 c03 c04"
gd(){ [ "$2" = base ] && echo golden/$1 || echo golden/$1/cases/$2/out; }
ind(){ [ "$1" = base ] && echo data/in || echo cases/$1/in; }
biz(){ python3 -c "import json,sys; s=json.loads(sys.stdin.read()); print('%.2f%% strict %.2f%% silent rules %s' % (s['equivalence_business']*100, s['equivalence_strict']*100, s['rules_silent']))"; }

echo "## 1. procedure check (unpatched bin/, same runner) against golden/v1"
for s in $SETS; do I=$(ind $s); BIN=$PWD/bin INPUT=$I ./run_chain.sh run/v1chk-$s >/dev/null 2>&1
  V=$(gd v1 $s); bad=0
  for f in posttran_transact posttran_dalyrejs posttran_acctdata posttran_tcatbal intcalc_systran intcalc_acctdata combtran_transact creastmt_statements creastmt_statements_html tranrept_report; do
    cmp -s run/v1chk-$s/out/$f.txt $V/$f.txt || { bad=1; echo "  $s $f DIFFERS"; }; done
  echo "  $s: $([ $bad = 0 ] && echo 'all 10 outputs byte-identical to golden/v1' || echo MISMATCH)"; done

echo; echo "## 2. upstream files kept with the report goldens equal golden/v1"
for n in cr6 cr7 cr8; do for s in $SETS; do for f in combtran_transact intcalc_acctdata; do
  cmp -s $(gd $n $s)/$f.txt $(gd v1 $s)/$f.txt || echo "  $n $s $f DIFFERS"; done; done; echo "  $n: checked"; done

echo; echo "## 3. reference models: golden/<n> (expect PASS) and golden/v1 (negative control, expect FAIL)"
for s in $SETS; do I=$(ind $s); V=$(gd v1 $s)
  r(){ INPUT=$I "$@" 2>&1 | grep CROSS-CHECK | awk '{print $2}'; }
  echo "  $s  cr3 $(UPSTREAM=$V r python3 cr/ref_intcalc_cr3.py $(gd cr3 $s))/$(r python3 cr/ref_intcalc_cr3.py $V)" \
       " cr4 $(r python3 cr/ref_posttran_cr4.py $(gd cr4 $s))/$(r python3 cr/ref_posttran_cr4.py $V)" \
       " cr5 $(r python3 cr/ref_posttran_cr5.py $(gd cr5 $s))/$(r python3 cr/ref_posttran_cr5.py $V)" \
       " cr6 $(r python3 cr/ref_creastmt_cr6.py $(gd cr6 $s))/$(r python3 cr/ref_creastmt_cr6.py $V)" \
       " cr7 $(r python3 cr/ref_tranrept_cr7.py $(gd cr7 $s))/$(r python3 cr/ref_tranrept_cr7.py $V)" \
       " cr8 $(r python3 cr/ref_creastmt_cr8.py $(gd cr8 $s))/$(r python3 cr/ref_creastmt_cr8.py $V)"; done

echo; echo "## 4. scorer (unchanged): self-score and legacy golden/v1 as the candidate (business, strict, silent rules)"
PO=posttran_transact,posttran_dalyrejs,posttran_acctdata,posttran_tcatbal
for s in $SETS; do I=$(ind $s); V=$(gd v1 $s); mkdir -p run/a21score
  G=runs/A21_golden/cr3/$s
  echo "  cr3 $s self:   $(python3 scorer/compare.py --golden $G --cand $G --outputs intcalc_systran,intcalc_acctdata | biz)"
  echo "  cr3 $s legacy: $(python3 scorer/compare.py --golden $G --cand $V --outputs intcalc_systran,intcalc_acctdata --out run/a21score/cr3-$s | biz)"
  for n in cr4 cr5; do G=$(gd $n $s)
    echo "  $n $s self:   $(python3 scorer/compare.py --golden $G --cand $G --outputs $PO | biz)"
    echo "  $n $s legacy: $(python3 scorer/compare.py --golden $G --cand $V --outputs $PO --out run/a21score/$n-$s | biz)"; done
  for n in cr6 cr8; do G=$(gd $n $s)
    echo "  $n $s self:   $(python3 scorer/report_compare.py --golden $G --cand $G --input $I --outputs creastmt_statements,creastmt_statements_html | biz)"
    echo "  $n $s legacy: $(python3 scorer/report_compare.py --golden $G --cand $V --input $I --outputs creastmt_statements,creastmt_statements_html --out run/a21score/$n-$s | biz)"; done
  G=$(gd cr7 $s)
  echo "  cr7 $s self:   $(python3 scorer/report_compare.py --golden $G --cand $G --input $I --outputs tranrept_report | biz)"
  echo "  cr7 $s legacy: $(python3 scorer/report_compare.py --golden $G --cand $V --input $I --outputs tranrept_report --out run/a21score/cr7-$s | biz)"
done
