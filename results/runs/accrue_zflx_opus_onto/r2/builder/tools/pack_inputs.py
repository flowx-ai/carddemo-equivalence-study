#!/usr/bin/env python3
"""Pack the ACCRUE input files into the input body of the FlowX workflow accrue_interest_calculation.

Usage: python3 -I tools/pack_inputs.py <input_dir> [output.json] [--parm 2022071800] [--run-timestamp TS]

Account and category-balance inputs follow CONTRACT.md step isolation: the POSTDAY outputs
(postday_*.json, then postday_*.txt) are preferred over ledgacc.dat / balcat.dat.
"""
import json
import os
import sys

CANDIDATES = {
    "ledgacc": ["postday_ledgacc.json", "postday_ledgacc.txt", "ledgacc.dat"],
    "balcat": ["postday_balcat.json", "postday_balcat.txt", "balcat.dat"],
    "cardlink": ["cardlink.dat"],
    "rategrp": ["rategrp.dat"],
}


def read_first(input_dir, names):
    for name in names:
        path = os.path.join(input_dir, name)
        if os.path.isfile(path):
            with open(path, encoding="latin-1") as f:
                return name, f.read()
    raise SystemExit("none of %s found in %s" % (", ".join(names), input_dir))


def main(argv):
    args = [a for a in argv]
    parm = "2022071800"
    run_ts = None
    if "--parm" in args:
        i = args.index("--parm")
        parm = args[i + 1]
        del args[i:i + 2]
    if "--run-timestamp" in args:
        i = args.index("--run-timestamp")
        run_ts = args[i + 1]
        del args[i:i + 2]
    if not args:
        raise SystemExit(__doc__)
    input_dir = args[0]
    out_path = args[1] if len(args) > 1 else "accrue_input.json"

    body = {"parmDate": parm}
    for key, names in CANDIDATES.items():
        name, content = read_first(input_dir, names)
        body[key] = content
        print("%-8s <- %s" % (key, name), file=sys.stderr)
    if run_ts:
        body["runTimestamp"] = run_ts

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(body, f)
    print("wrote " + out_path, file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1:])
