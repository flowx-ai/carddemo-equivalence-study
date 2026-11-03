"""File I/O around the FlowX workflow `accrue_interest_calculation`.

The interest logic lives entirely in the FlowX workflow; this helper only moves files in and out.

  pack   <input_dir> <input_body.json> [accrue_parm] [business_date]
      Reads ledgacc / balcat / cardlink / rategrp from <input_dir> and writes the workflow's
      START input body. For step isolation the account and category-balance inputs may be the
      oracle's POSTDAY outputs instead of .dat files; they are picked in this order:
        ledgacc.dat | postday_ledgacc.json | postday_ledgacc.txt
        balcat.dat  | postday_balcat.json  | postday_balcat.txt
      (.dat/.txt are fixed width; .json is the CONTRACT.md list of objects.)

  unpack <end_output.json> <output_dir>
      Takes the workflow's END output (run_workflow / get_workflow_run) and writes
      accrue_systxn.json, accrue_ledgacc.json and flags.json, plus a copy of assumptions.md.

Run the workflow between the two (FlowX Designer "Run", or the zflx MCP `run_workflow` with
the packed body as inputBody).
"""
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSUMPTIONS = os.path.join(os.path.dirname(HERE), "out", "assumptions.md")

CANDIDATES = {
    "ledgaccData": ["ledgacc.dat", "postday_ledgacc.json", "postday_ledgacc.txt"],
    "balcatData": ["balcat.dat", "postday_balcat.json", "postday_balcat.txt"],
    "cardlinkData": ["cardlink.dat"],
    "rategrpData": ["rategrp.dat"],
}

FLAGS = [
    {"rule": "R-INT-TRUNC", "source": "out/assumptions.md A5 (flowx/scripts/2_compute_interest.js monthlyInterest)"},
    {"output": "accrue_systxn.json", "key": "orig_ts", "source": "out/assumptions.md A9"},
    {"output": "accrue_systxn.json", "key": "proc_ts", "source": "out/assumptions.md A9"},
]


def read_first(input_dir, names):
    for name in names:
        path = os.path.join(input_dir, name)
        if os.path.exists(path):
            with open(path, encoding="latin-1") as f:
                return f.read()
    raise SystemExit(f"none of {names} found in {input_dir}")


def pack(input_dir, body_path, parm="2022071800", business_date="2022-07-18"):
    body = {key: read_first(input_dir, names) for key, names in CANDIDATES.items()}
    body["accrueParm"] = parm
    body["businessDate"] = business_date
    with open(body_path, "w") as f:
        json.dump(body, f)


def unpack(end_output_path, output_dir):
    with open(end_output_path) as f:
        end = json.load(f)
    end = end.get("output", end)
    os.makedirs(output_dir, exist_ok=True)
    for key, name in [("accrueSystxn", "accrue_systxn.json"), ("accrueLedgacc", "accrue_ledgacc.json")]:
        value = end[key]
        rows = json.loads(value) if isinstance(value, str) else value
        with open(os.path.join(output_dir, name), "w") as f:
            json.dump(rows, f, indent=2)
    with open(os.path.join(output_dir, "flags.json"), "w") as f:
        json.dump(FLAGS, f, indent=2)
    target = os.path.join(output_dir, "assumptions.md")
    if os.path.abspath(target) != os.path.abspath(ASSUMPTIONS):
        shutil.copyfile(ASSUMPTIONS, target)


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "pack":
        pack(*sys.argv[2:6])
    elif len(sys.argv) == 4 and sys.argv[1] == "unpack":
        unpack(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit(__doc__)
