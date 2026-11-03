#!/usr/bin/env bash
# Disguised INTCALC oracle (A5): builds the disguised program and runs only the interest step, with step isolation
# as in CONTRACT.md: the account and category-balance inputs are golden/v1's POSTTRAN outputs for that set.
#   disguise/run_oracle.sh      -> golden/d1/{intcalc_*}.txt and golden/d1/cases/<c>/out/
set -euo pipefail
cd "$(dirname "$0")/.."
D=disguise/d1; B=$D/bin; mkdir -p $B
F=(-std=ibm -fsign=EBCDIC -ftab-width=3 -I $D/src)
P=$(python3 -c "import json;m=json.load(open('$D/map.json'))['programs'];print(m['CBACT04C'],m['RUNPARM'],m['CEE3ABD'])")
read PROG RUNP ABD <<<"$P"
cobc -x "${F[@]}" -o $B/$PROG $D/src/$RUNP.cbl $D/src/$PROG.cbl $D/src/$ABD.cbl
export COB_CURRENT_DATE="2022/07/18 10:00:00.00+0000"
run_set(){  # $1 set name, $2 golden posttran dir, $3 raw input dir, $4 output dir
  local W; W=$(mktemp -d); mkdir -p "$4"
  ld(){ COB_LS_VALIDATE=false DD_INFILE=$1 DD_OUTFILE=$W/$2 bin/ld_$3 >>$W/load.log; }
  ld "$2/posttran_acctdata.txt" acctdata acctdata; ld "$2/posttran_tcatbal.txt" tcatbal tcatbal
  ld "$3/cardxref.dat" cardxref cardxref; ld "$D/data/$1/rategrp.dat" discgrp discgrp
  DD_BALCATF=$W/tcatbal DD_LINKFILE=$W/cardxref DD_LEDGFILE=$W/acctdata DD_RATEGRP=$W/discgrp DD_TXNFILE=$W/systran.seq \
    $B/$PROG $PROG 2022071800 >"$4/accrue.log" 2>&1; echo "$1 rc=$?"
  COB_LS_VALIDATE=false DD_INFILE=$W/acctdata DD_OUTFILE=$4/intcalc_acctdata.txt bin/ul_acctdata
  python3 tools/fold.py 350 $W/systran.seq $4/intcalc_systran.txt
  rm -rf "$W"
}
run_set base golden/v1 data/in golden/d1
for c in c01 c02 c03 c04; do run_set $c golden/v1/cases/$c/out cases/$c/in golden/d1/cases/$c/out; done
