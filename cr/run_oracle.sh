#!/usr/bin/env bash
# Change-request oracles (A16 draft): runs run_chain.sh with BIN=cr/<n>/bin (one patched program, every other
# binary as built by build.sh) on base and c01-c04, and keeps the outputs of the changed step under golden/<n>/.
#   cr/run_oracle.sh cr1 intcalc   |   cr/run_oracle.sh cr2 posttran
# A21 draft (CR3-CR8): for the report steps (creastmt, tranrept) the upstream files their scorer and reference model
# read (combtran_transact, intcalc_acctdata) are kept next to the step's outputs. intcalc / posttran: unchanged.
set -euo pipefail
cd "$(dirname "$0")/.."
N=$1; STEP=$2; G=golden/$N; mkdir -p $G
run(){ BIN=$PWD/cr/$N/bin INPUT=$2 ./run_chain.sh run/$N-$1 >/dev/null; mkdir -p "$3"; cp run/$N-$1/out/${STEP}_*.txt "$3/"; case $STEP in creastmt|tranrept) cp run/$N-$1/out/{combtran_transact,intcalc_acctdata}.txt "$3/";; esac; grep "$(echo $STEP | tr a-z A-Z)" run/$N-$1/log/rc.txt; }
run base data/in $G
for c in c01 c02 c03 c04; do run $c cases/$c/in $G/cases/$c/out; done
(cd $G && find . -name '*.txt' | sort | xargs shasum -a 256 > SHA256SUMS)
