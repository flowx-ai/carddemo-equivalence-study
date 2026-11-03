"""Write the CONTRACT.md output files from the workflow's End-node payload.

usage: python3 -I tools/write_outputs.py <end_payload.json> <output_dir>
Writes accrue_systxn.json and accrue_ledgacc.json (and run_summary.json for information).
"""
import json
import sys


def main():
    with open(sys.argv[1]) as f:
        payload = json.load(f)
    out = sys.argv[2]
    for key, name in (("accrue_systxn", "accrue_systxn.json"),
                      ("accrue_ledgacc", "accrue_ledgacc.json"),
                      ("runSummary", "run_summary.json")):
        with open(f"{out}/{name}", "w") as f:
            json.dump(payload.get(key, []), f, indent=1)


if __name__ == "__main__":
    main()
