"""Build the inputBody for the FlowX workflow `interest-calculation` from a run's input directory.

Usage: python3 -I tools/make_input.py <input_dir> <out.json> [--parm 2022071800] [--date 2022-07-18]

Account and category-balance inputs: the oracle's POSTDAY outputs are preferred when present
(postday_ledgacc.json / .txt, postday_balcat.json / .txt), else ledgacc.dat / balcat.dat.
"""
import json
import os
import sys

CANDIDATES = {
    "ledgaccFile": ["postday_ledgacc.json", "postday_ledgacc.txt", "ledgacc.dat"],
    "balcatFile": ["postday_balcat.json", "postday_balcat.txt", "balcat.dat"],
    "rategrpFile": ["rategrp.dat"],
    "cardlinkFile": ["cardlink.dat"],
}


def pick(input_dir, names):
    for name in names:
        path = os.path.join(input_dir, name)
        if os.path.isfile(path):
            return path
    raise SystemExit("none of %s found in %s" % (names, input_dir))


def main(argv):
    args, opts, i = [], {}, 0
    while i < len(argv):
        if argv[i].startswith("--") and i + 1 < len(argv):
            opts[argv[i]] = argv[i + 1]
            i += 2
        else:
            args.append(argv[i])
            i += 1
    if len(args) != 2:
        raise SystemExit(__doc__)
    input_dir, out_path = args
    body = {
        "interestRunDate": opts.get("--parm", "2022071800"),
        "businessDate": opts.get("--date", "2022-07-18"),
    }
    for key, names in CANDIDATES.items():
        path = pick(input_dir, names)
        with open(path, encoding="latin-1") as f:
            body[key] = f.read()
        print("%-13s <- %s" % (key, path))
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(body, f)


if __name__ == "__main__":
    main(sys.argv[1:])
