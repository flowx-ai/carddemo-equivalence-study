#!/usr/bin/env python3
"""Split the END output of the FlowX workflow accrue_interest_calculation into the CONTRACT.md files.

Usage: python3 -I tools/unpack_outputs.py <workflow_result.json> [output_dir]

<workflow_result.json> is the END node output ({"accrue_systxn": [...], "accrue_ledgacc": [...], "runLog": [...]}),
optionally wrapped in an object that holds it under "result" or "output".
Writes accrue_systxn.json, accrue_ledgacc.json and accrue_runlog.txt.
"""
import json
import os
import sys


def find_result(obj):
    if isinstance(obj, dict):
        if "accrue_systxn" in obj and "accrue_ledgacc" in obj:
            return obj
        for key in ("result", "output", "outputs"):
            if key in obj:
                found = find_result(obj[key])
                if found is not None:
                    return found
    return None


def main(argv):
    if not argv:
        raise SystemExit(__doc__)
    out_dir = argv[1] if len(argv) > 1 else "."
    with open(argv[0], encoding="utf-8") as f:
        result = find_result(json.load(f))
    if result is None:
        raise SystemExit("no accrue_systxn / accrue_ledgacc found in " + argv[0])

    os.makedirs(out_dir, exist_ok=True)
    for name in ("accrue_systxn", "accrue_ledgacc"):
        path = os.path.join(out_dir, name + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result[name], f, indent=1)
        print("%s: %d records" % (path, len(result[name])), file=sys.stderr)
    with open(os.path.join(out_dir, "accrue_runlog.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(result.get("runLog") or []) + "\n")


if __name__ == "__main__":
    main(sys.argv[1:])
