#!/usr/bin/env python3
"""File adapter for the FlowX workflow `posttran_daily_transaction_posting`.

It plays the role of the wiki's batch-file-transfer integration: it moves records between the
fixed-width files and the workflow. All parsing, validation, posting and formatting happens in the
FlowX workflow; this script never interprets a field.

  prepare  <input_dir> <request.json> [--business-date 2022-07-18] [--batch-id ID]
      Reads dailytran.dat, acctdata.dat, cardxref.dat, tcatbal.dat (one record per line) and writes
      the workflow input body.

  emit     <result.json> <output_dir>
      Takes the workflow's END output (the JSON run_workflow prints, or the bare END payload) and
      writes posttran_transact.json, posttran_dalyrejs.json, posttran_acctdata.json,
      posttran_tcatbal.json and posttran_run_summary.json.

Run with `python3 -I posttran_io.py ...`.
"""
import json
import os
import sys

INPUTS = {
    "dailytranLines": ("dailytran.dat", True),
    "acctdataLines": ("acctdata.dat", True),
    "cardxrefLines": ("cardxref.dat", True),
    "tcatbalLines": ("tcatbal.dat", False),
}
OUTPUTS = ["posttran_transact", "posttran_dalyrejs", "posttran_acctdata", "posttran_tcatbal"]


def read_lines(path):
    with open(path, "rb") as fh:
        text = fh.read().decode("latin-1")
    # split on newlines only: str.splitlines() would also split on bytes such as \x1c inside a record
    return [ln[:-1] if ln.endswith("\r") else ln for ln in text.split("\n")]


def prepare(input_dir, request_path, business_date, batch_id):
    body = {"batchId": batch_id, "businessDate": business_date, "feedReference": os.path.abspath(input_dir)}
    for key, (name, required) in INPUTS.items():
        path = os.path.join(input_dir, name)
        if not os.path.exists(path):
            if required:
                sys.exit(f"missing input file: {path}")
            body[key] = []
            continue
        body[key] = [ln for ln in read_lines(path) if ln.strip()]
    with open(request_path, "w", encoding="utf-8") as fh:
        json.dump(body, fh, ensure_ascii=False)
    print(f"wrote {request_path}: " + ", ".join(f"{k}={len(body[k])}" for k in INPUTS))


def find_result(obj):
    if isinstance(obj, dict):
        if all(k in obj for k in OUTPUTS):
            return obj
        for v in obj.values():
            found = find_result(v)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = find_result(v)
            if found is not None:
                return found
    return None


def emit(result_path, output_dir):
    with open(result_path, encoding="utf-8") as fh:
        result = find_result(json.load(fh))
    if result is None:
        sys.exit("no workflow result with " + ", ".join(OUTPUTS) + " found in " + result_path)
    os.makedirs(output_dir, exist_ok=True)
    for name in OUTPUTS:
        with open(os.path.join(output_dir, name + ".json"), "w", encoding="utf-8") as fh:
            json.dump(result[name] or [], fh, ensure_ascii=False, indent=1)
    if result.get("runSummary") is not None:
        with open(os.path.join(output_dir, "posttran_run_summary.json"), "w", encoding="utf-8") as fh:
            json.dump(result["runSummary"], fh, ensure_ascii=False, indent=1)
    print(json.dumps(result.get("runSummary"), ensure_ascii=False))


def main(argv):
    if len(argv) >= 3 and argv[0] == "prepare":
        opts = dict(zip(argv[3::2], argv[4::2]))
        prepare(argv[1], argv[2], opts.get("--business-date", "2022-07-18"), opts.get("--batch-id", "POSTTRAN"))
    elif len(argv) == 3 and argv[0] == "emit":
        emit(argv[1], argv[2])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
