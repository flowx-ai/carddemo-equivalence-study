#!/usr/bin/env python3
"""Write the CONTRACT.md outputs of the ACCRUE step from a workflow result.

Usage: python3 -I write_outputs.py <workflow_output.json> <out_dir>

<workflow_output.json> is the END-node output of `interest-calculation`
({"accrue_systxn": [...], "accrue_ledgacc": [...], "summary": {...}}).
Writes <out_dir>/accrue_systxn.json, accrue_ledgacc.json and run_summary.json.
"""
import json
import os
import sys


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        result = json.load(fh)
    # Accept either the bare END output or a wrapper that holds it under "output".
    if "accrue_systxn" not in result and isinstance(result.get("output"), dict):
        result = result["output"]
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for name in ("accrue_systxn", "accrue_ledgacc"):
        rows = result.get(name) or []
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=1)
        print("%s.json: %d records" % (name, len(rows)))
    with open(os.path.join(out_dir, "run_summary.json"), "w", encoding="utf-8") as fh:
        json.dump(result.get("summary") or {}, fh, indent=1)


if __name__ == "__main__":
    main()
