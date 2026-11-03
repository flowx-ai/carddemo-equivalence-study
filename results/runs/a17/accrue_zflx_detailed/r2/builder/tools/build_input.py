"""Build the accrue_interest_calculation workflow input from a directory of .dat files.

usage: python3 -I tools/build_input.py <input_dir> [interestRunDate] [businessDate] > input.json
"""
import json
import sys


def read(path):
    with open(path, encoding="latin-1") as f:
        return f.read()


def main():
    src = sys.argv[1]
    body = {
        "ledgacc": read(f"{src}/ledgacc.dat"),
        "balcat": read(f"{src}/balcat.dat"),
        "rategrp": read(f"{src}/rategrp.dat"),
        "cardlink": read(f"{src}/cardlink.dat"),
        "interestRunDate": sys.argv[2] if len(sys.argv) > 2 else "2022071800",
        "businessDate": sys.argv[3] if len(sys.argv) > 3 else "2022-07-18",
    }
    json.dump(body, sys.stdout)


if __name__ == "__main__":
    main()
