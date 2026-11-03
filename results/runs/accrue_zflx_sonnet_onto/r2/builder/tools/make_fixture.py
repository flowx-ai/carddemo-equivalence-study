#!/usr/bin/env python3
"""Generate a small synthetic ACCRUE fixture (fixed width, copybook layouts)
covering the acceptance scenarios: monthly interest (1000.00 @ 18.00 -> 15.00),
STANDARD fallback, ZEROAPR, rate-0 payment category, negative balance
truncation, an account with no balances, and the last-account rewrite.

Usage: python3 -I make_fixture.py <dir>
"""
import os
import sys

POS = "{ABCDEFGHI"
NEG = "}JKLMNOPQR"


def zoned(value_minor, digits):
    """PIC S9(n)V99 with EBCDIC-style trailing overpunch, `digits` bytes long."""
    s = str(abs(value_minor)).rjust(digits, "0")
    last = (NEG if value_minor < 0 else POS)[int(s[-1])]
    return s[:-1] + last


def x(v, n):
    return str(v).ljust(n)[:n]


def n9(v, n):
    return str(v).rjust(n, "0")


def account(acct, bal, cyc_cr, cyc_db, group):
    rec = (n9(acct, 11) + "Y" + zoned(bal, 12) + zoned(500000, 12) + zoned(100000, 12)
           + x("2014-11-20", 10) + x("2025-05-20", 10) + x("2025-05-20", 10)
           + zoned(cyc_cr, 12) + zoned(cyc_db, 12) + x("12345", 10) + x(group, 10))
    return x(rec, 300)


def main():
    d = sys.argv[1]
    os.makedirs(d, exist_ok=True)
    accounts = [
        account(1, 19400, 1200, 3400, "A000000000"),   # 194.00
        account(2, 5000, 0, 2500, "NOSUCHGRP"),        # STANDARD fallback
        account(3, 10000, 100, 200, "ZEROAPR"),        # all rates 0
        account(4, -7777, 11, 22, "A000000000"),       # no category balances, negative balance
        account(5, 2000, 300, 400, "A000000000"),      # last account in BALCAT order
    ]
    cards = [
        x("4000000000000002" + n9(9, 9) + n9(1, 11), 50),
        x("4000000000000001" + n9(9, 9) + n9(1, 11), 50),  # lower card number wins
        x("4000000000000022" + n9(8, 9) + n9(2, 11), 50),
        x("4000000000000033" + n9(7, 9) + n9(3, 11), 50),
        x("4000000000000055" + n9(6, 9) + n9(5, 11), 50),
    ]
    balcat = [
        x(n9(1, 11) + "01" + n9(1, 4) + zoned(100000, 11), 50),   # 1000.00 @ 18.00 -> 15.00
        x(n9(1, 11) + "01" + n9(2, 4) + zoned(-10005, 11), 50),   # -100.05 @ 24.99 -> -2.08
        x(n9(1, 11) + "02" + n9(1, 4) + zoned(50000, 11), 50),    # payment, rate 0
        x(n9(2, 11) + "01" + n9(1, 4) + zoned(50050, 11), 50),    # STANDARD 21.00 -> 8.75
        x(n9(3, 11) + "01" + n9(1, 4) + zoned(99999, 11), 50),    # ZEROAPR -> none
        x(n9(5, 11) + "01" + n9(1, 4) + zoned(33333, 11), 50),    # 333.33 @ 12.34 -> 3.42
    ]
    rategrp = [
        x("A000000000" + "01" + n9(1, 4) + zoned(1800, 6), 50),
        x("A000000000" + "01" + n9(2, 4) + zoned(2499, 6), 50),
        x("A000000000" + "02" + n9(1, 4) + zoned(0, 6), 50),
        x("STANDARD  " + "01" + n9(1, 4) + zoned(2100, 6), 50),
        x("ZEROAPR   " + "01" + n9(1, 4) + zoned(0, 6), 50),
    ]
    # Account 5 uses A000000000 01/0001 but at a different rate: give it its own group row.
    accounts[4] = account(5, 2000, 300, 400, "GRP5")
    rategrp.append(x("GRP5      " + "01" + n9(1, 4) + zoned(1234, 6), 50))
    for name, rows in (("ledgacc", accounts), ("cardlink", cards), ("balcat", balcat), ("rategrp", rategrp)):
        with open(os.path.join(d, name + ".dat"), "w", encoding="latin-1", newline="\n") as fh:
            fh.write("\n".join(rows) + "\n")


if __name__ == "__main__":
    main()
