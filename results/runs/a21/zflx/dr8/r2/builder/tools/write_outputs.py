#!/usr/bin/env python3
"""Write the CONTRACT.md POSTTRAN outputs from a finished workflow run.

Usage: python3 -I tools/write_outputs.py <run_output.json> <out_dir>

<run_output.json> is the END-node output of `posttran_daily_transaction_posting`
(the object holding transactJson / dalyrejsJson / acctdataJson / tcatbalJson), optionally
wrapped as {"output": {...}}.
"""
import json
import os
import sys

OUTPUTS = {
    "transactJson": "posttran_transact.json",
    "dalyrejsJson": "posttran_dalyrejs.json",
    "acctdataJson": "posttran_acctdata.json",
    "tcatbalJson": "posttran_tcatbal.json",
}


def main():
    run_file, out_dir = sys.argv[1], sys.argv[2]
    with open(run_file, encoding="utf-8") as fh:
        run = json.load(fh)
    if "output" in run and isinstance(run["output"], dict):
        run = run["output"]

    os.makedirs(out_dir, exist_ok=True)
    for key, name in OUTPUTS.items():
        records = json.loads(run[key])
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as fh:
            json.dump(records, fh, indent=1, ensure_ascii=False)

    print("status=%s returnCode=%s read=%s posted=%s rejected=%s balanced=%s" % (
        run.get("status"), run.get("returnCode"), run.get("readCount"),
        run.get("processedCount"), run.get("rejectedCount"), run.get("countsBalanced")))


if __name__ == "__main__":
    main()
