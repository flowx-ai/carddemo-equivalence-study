#!/usr/bin/env python3
"""Build the run input for the FlowX workflow `intcalc_interest_calculation`.

Usage: make_input.py <input_dir> [PARM] > run_input.json

Reads acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat from <input_dir>
(fixed width, one record per line) and emits the workflow's INPUT slice as JSON.
PARM defaults to 2022071800 (CONTRACT.md run parameters).
"""
import json
import pathlib
import sys


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = pathlib.Path(sys.argv[1])
    parm = sys.argv[2] if len(sys.argv) > 2 else "2022071800"
    body = {"interestRunDate": parm}
    for name in ("acctdata", "tcatbal", "discgrp", "cardxref"):
        body[name] = (src / f"{name}.dat").read_text(encoding="latin-1")
    json.dump(body, sys.stdout)


if __name__ == "__main__":
    main()
