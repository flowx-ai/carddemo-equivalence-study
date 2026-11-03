#!/usr/bin/env python3
"""Split the END payload of `intcalc_interest_calculation` into the contract files.

Usage: split_output.py <end_payload.json> <output_dir>

Writes intcalc_systran.json and intcalc_acctdata.json (CONTRACT.md outputs).
The `summary` block (counts, warnings) is written to intcalc_summary.json.
"""
import json
import pathlib
import sys


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
    out = pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for key in ("intcalc_systran", "intcalc_acctdata"):
        (out / f"{key}.json").write_text(json.dumps(payload[key], indent=2))
    (out / "intcalc_summary.json").write_text(json.dumps(payload.get("summary", {}), indent=2))


if __name__ == "__main__":
    main()
