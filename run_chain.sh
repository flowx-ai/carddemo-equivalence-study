#!/usr/bin/env bash
# Runs the CardDemo batch chain off-mainframe on the shipped sample data and dumps every output.
# usage: ./run_chain.sh <run-dir>
set -uo pipefail
cd "$(dirname "$0")"
R=${1:-run/r1}; rm -rf "$R"; mkdir -p "$R"/{vsam,out,log}
B=${BIN:-$PWD/bin}; I=${INPUT:-$PWD/data/in}; I=$(cd "$I" && pwd)
export COB_CURRENT_DATE="2022/07/18 10:00:00.00+0000"   # pin FUNCTION CURRENT-DATE (timestamps written by CBTRN02C / CBACT04C)
load(){ COB_LS_VALIDATE=false DD_INFILE=$I/$1.dat DD_OUTFILE=$R/vsam/$1 "$B/ld_$1" >>"$R/log/load.log"; }
unload(){ COB_LS_VALIDATE=false DD_INFILE=$R/vsam/$1 DD_OUTFILE=$R/out/$2.txt "$B/ul_$1"; }
for f in acctdata carddata cardxref custdata discgrp tcatbal trancatg trantype; do load $f; done
# fixed-length sequential input = raw records, no line terminators
tr -d '\n' < $I/dailytran.dat > $R/vsam/dailytran.seq

# STEP POSTTRAN: CBTRN02C
cp $R/vsam/acctdata $R/vsam/acctdata.pre 2>/dev/null; cp $R/vsam/tcatbal $R/vsam/tcatbal.pre
DD_DALYTRAN=$R/vsam/dailytran.seq DD_TRANFILE=$R/vsam/transact DD_XREFFILE=$R/vsam/cardxref \
DD_DALYREJS=$R/vsam/dalyrejs.seq DD_ACCTFILE=$R/vsam/acctdata DD_TCATBALF=$R/vsam/tcatbal \
  "$B/CBTRN02C" >"$R/log/posttran.log" 2>&1; echo "POSTTRAN rc=$?" | tee -a "$R/log/rc.txt"
unload transact posttran_transact; unload acctdata posttran_acctdata; unload tcatbal posttran_tcatbal
python3 tools/fold.py 430 $R/vsam/dalyrejs.seq $R/out/posttran_dalyrejs.txt

# STEP INTCALC: CBACT04C PARM='2022071800'
DD_TCATBALF=$R/vsam/tcatbal DD_XREFFILE=$R/vsam/cardxref DD_ACCTFILE=$R/vsam/acctdata \
DD_DISCGRP=$R/vsam/discgrp DD_TRANSACT=$R/vsam/systran.seq \
  "$B/CBACT04C" CBACT04C 2022071800 >"$R/log/intcalc.log" 2>&1; echo "INTCALC rc=$?" | tee -a "$R/log/rc.txt"
unload acctdata intcalc_acctdata
python3 tools/fold.py 350 $R/vsam/systran.seq $R/out/intcalc_systran.txt

# STEP COMBTRAN: SORT (TRANSACT backup + SYSTRAN) by TRAN-ID, REPRO into a fresh TRANFILE
tr -d '\n' < $R/out/posttran_transact.txt > $R/vsam/transact.bkup
python3 tools/dfsort.py combtran $R/vsam/transact.combined $R/vsam/transact.bkup $R/vsam/systran.seq | tee -a "$R/log/sort.log"
python3 tools/fold.py 350 $R/vsam/transact.combined $R/vsam/transact.combined.txt
rm -f $R/vsam/transact; DD_INFILE=$R/vsam/transact.combined.txt DD_OUTFILE=$R/vsam/transact COB_LS_VALIDATE=false "$B/ld_transact" >>"$R/log/load.log"
unload transact combtran_transact

# STEP CREASTMT: SORT by card + TRAN-ID with OUTREC, REPRO into TRXFL (key 32), run CBSTM03A
python3 tools/dfsort.py creastmt $R/vsam/trxfl.seq $R/vsam/transact.combined | tee -a "$R/log/sort.log"
python3 tools/fold.py 350 $R/vsam/trxfl.seq $R/vsam/trxfl.txt
DD_INFILE=$R/vsam/trxfl.txt DD_OUTFILE=$R/vsam/trxfl COB_LS_VALIDATE=false "$B/ld_trxfl" >>"$R/log/load.log"
DD_TRNXFILE=$R/vsam/trxfl DD_XREFFILE=$R/vsam/cardxref DD_CUSTFILE=$R/vsam/custdata DD_ACCTFILE=$R/vsam/acctdata \
DD_STMTFILE=$R/vsam/stmt.seq DD_HTMLFILE=$R/vsam/html.seq \
  "$B/CBSTM03A" >"$R/log/creastmt.log" 2>&1; echo "CREASTMT rc=$?" | tee -a "$R/log/rc.txt"
python3 tools/fold.py 80 $R/vsam/stmt.seq $R/out/creastmt_statements.txt
python3 tools/fold.py 100 $R/vsam/html.seq $R/out/creastmt_statements_html.txt

# STEP TRANREPT: INCLUDE proc date in [start, end], SORT by card, run CBTRN03C with DATEPARM
START=2022-07-01; END=2022-07-31   # window chosen to contain the pinned run date 2022-07-18 (JCL sample: 2022-01-01..2022-07-06)
python3 tools/dfsort.py tranrept $R/vsam/transact.daly $R/vsam/transact.combined $START $END | tee -a "$R/log/sort.log"
printf '%-80s' "$START $END" > $R/vsam/dateparm.seq
DD_TRANFILE=$R/vsam/transact.daly DD_CARDXREF=$R/vsam/cardxref DD_TRANTYPE=$R/vsam/trantype DD_TRANCATG=$R/vsam/trancatg \
DD_DATEPARM=$R/vsam/dateparm.seq DD_TRANREPT=$R/vsam/tranrept.seq \
  "$B/CBTRN03C" >"$R/log/tranrept.log" 2>&1; echo "TRANREPT rc=$?" | tee -a "$R/log/rc.txt"
python3 tools/fold.py 133 $R/vsam/tranrept.seq $R/out/tranrept_report.txt
wc -l $R/out/*.txt
