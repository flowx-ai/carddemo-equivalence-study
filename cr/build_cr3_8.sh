#!/usr/bin/env bash
# Builds cr/<n>/bin for CR3-CR8 (A21 draft): the regular binaries from bin/ (build.sh) plus the one patched program,
# compiled with the build.sh flags. Sources come from cr/make_src_cr3_8.py.   usage: cr/build_cr3_8.sh
set -euo pipefail
cd "$(dirname "$0")/.."
F=(-std=ibm -fsign=EBCDIC -ftab-width=3 -I src)
python3 cr/make_src_cr3_8.py
for n in 3 4 5 6 7 8; do rm -rf cr/cr$n/bin; mkdir -p cr/cr$n/bin; cp bin/* cr/cr$n/bin/; done
cobc -x "${F[@]}" -o cr/cr3/bin/CBACT04C src/RUNPARM.cbl cr/cr3/src/CBACT04C.cbl src/CEE3ABD.cbl
cobc -x "${F[@]}" -o cr/cr4/bin/CBTRN02C cr/cr4/src/CBTRN02C.cbl src/CEE3ABD.cbl
cobc -x "${F[@]}" -o cr/cr5/bin/CBTRN02C cr/cr5/src/CBTRN02C.cbl src/CEE3ABD.cbl
cobc -x "${F[@]}" -o cr/cr6/bin/CBSTM03A cr/cr6/src/CBSTM03A.CBL src/CBSTM03B.CBL src/CEE3ABD.cbl
cobc -x "${F[@]}" -o cr/cr7/bin/CBTRN03C cr/cr7/src/CBTRN03C.cbl src/CEE3ABD.cbl
cobc -x "${F[@]}" -o cr/cr8/bin/CBSTM03A cr/cr8/src/CBSTM03A.CBL src/CBSTM03B.CBL src/CEE3ABD.cbl
echo built
