#!/usr/bin/env python3
"""Checks every committed flags.json against the hashes recorded before scoring (results/summaries/FLAGS_*.sha256 and
results/runs/**/FLAGS*.sha256). Where a hash file lists a path twice (a revision before execution, or a retried
build), the last line is the one in force and both are reported in that arm's PRESCORE or retries log.
    python3 tools/check_flag_hashes.py"""
import hashlib, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent / "results"
last = {}
for f in sorted(list((R / "summaries").glob("FLAGS_*.sha256")) + list((R / "runs").rglob("FLAGS*.sha256"))):
    for line in f.read_text().splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[1].endswith("flags.json"):
            last[parts[1]] = parts[0]
bad = [p for p, h in sorted(last.items())
       if not (R / p).exists() or hashlib.sha256((R / p).read_bytes()).hexdigest() != h]
print(f"flags.json files checked: {len(last)}; mismatched or missing: {len(bad)}")
for p in bad:
    print("  FAIL", p)
sys.exit(1 if bad else 0)
