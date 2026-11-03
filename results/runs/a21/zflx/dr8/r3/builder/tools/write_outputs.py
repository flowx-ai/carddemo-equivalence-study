"""Split the workflow result into the CONTRACT.md output files.

Usage: python3 -I tools/write_outputs.py <result.json> <output_dir>

<result.json> is the END-node output of posttran_daily_transaction_posting (the object holding
posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal and the run summary).
Writes one JSON list per output file plus posttran_run_summary.json.
"""
import json
import os
import sys

OUTPUTS = ["posttran_transact", "posttran_dalyrejs", "posttran_acctdata", "posttran_tcatbal"]


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8") as fh:
        result = json.load(fh)
    # Accept either the bare END output or a wrapper that holds it under "output".
    if "posttran_transact" not in result and isinstance(result.get("output"), dict):
        result = result["output"]
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for name in OUTPUTS:
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as fh:
            json.dump(result.get(name, []), fh, indent=1)
    summary = {k: v for k, v in result.items() if k not in OUTPUTS}
    with open(os.path.join(out_dir, "posttran_run_summary.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=1)


if __name__ == "__main__":
    main()
