#!/usr/bin/env python3
"""Write the CONTRACT.md outputs from the END-node result of `accrue_interest_calculation`.

usage: python3 -I tools/split_outputs.py <end_output.json> <out_dir>

end_output.json is the END node payload ({accrue_systxn, accrue_ledgacc, warnings}) as returned by
run_workflow / get_workflow_run.
"""
import json
import os
import sys


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    with open(src, encoding="utf-8") as f:
        result = json.load(f)
    os.makedirs(out_dir, exist_ok=True)
    for name in ("accrue_systxn", "accrue_ledgacc"):
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(result[name], f, indent=1)
    for w in result.get("warnings", []):
        print("warning:", w, file=sys.stderr)


if __name__ == "__main__":
    main()
