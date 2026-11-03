"""Split the END payload of a FlowX `interest-calculation` run into the CONTRACT.md output files.

Usage: python3 -I tools/split_output.py <end_payload.json> <output_dir>
"""
import json
import os
import sys


def main(argv):
    if len(argv) != 2:
        raise SystemExit(__doc__)
    payload_path, out_dir = argv
    with open(payload_path, encoding="utf-8") as f:
        payload = json.load(f)
    for name in ("accrue_systxn", "accrue_ledgacc"):
        records = payload[name]
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)
        print("%s.json: %d records" % (name, len(records)))
    print("summary:", json.dumps(payload.get("summary")))


if __name__ == "__main__":
    main(sys.argv[1:])
