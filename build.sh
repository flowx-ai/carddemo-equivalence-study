#!/usr/bin/env bash
# Builds the CardDemo batch programs off-mainframe with GnuCOBOL. Sources are unmodified copies from the clone.
set -euo pipefail
cd "$(dirname "$0")"
F=(-std=ibm -fsign=EBCDIC -ftab-width=3 -I src)
cobc -x "${F[@]}" -o bin/CBTRN02C src/CBTRN02C.cbl src/CEE3ABD.cbl
cobc -x "${F[@]}" -o bin/CBTRN03C src/CBTRN03C.cbl src/CEE3ABD.cbl
cobc -x "${F[@]}" -o bin/CBACT04C src/RUNPARM.cbl src/CBACT04C.cbl src/CEE3ABD.cbl
python3 patches/port_cbstm03a.py   # z/OS control-block walk commented out, see patch header
cobc -x "${F[@]}" -o bin/CBSTM03A ported/CBSTM03A.CBL src/CBSTM03B.CBL src/CEE3ABD.cbl
for f in loaders/ld_*.cbl loaders/ul_*.cbl; do b=$(basename "$f" .cbl); cobc -x -free -o "bin/$b" "$f"; done
echo built
