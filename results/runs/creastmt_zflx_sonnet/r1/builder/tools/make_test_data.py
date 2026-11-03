"""Build small synthetic CardDemo input files (fixed width, copybook layouts) for a smoke run.

Usage: python3 -I make_test_data.py <out_dir>
Writes transact.dat, acctdata.dat, cardxref.dat, custdata.dat and run_input.json
(the workflow inputBody: one string per file).
"""
import json
import os
import sys


def x(v, n):
    return str(v).ljust(n)[:n]


def n9(v, n):
    return str(v).rjust(n, "0")[:n]


def zoned(cents, n):
    """S9(..)V99 DISPLAY with trailing overpunch sign, n bytes."""
    digits = str(abs(cents)).rjust(n, "0")
    last = int(digits[-1])
    sign = "{ABCDEFGHI"[last] if cents >= 0 else "}JKLMNOPQR"[last]
    return digits[:-1] + sign


def tran(tid, card, desc, cents):
    r = (x(tid, 16) + x("01", 2) + n9(1, 4) + x("POS TERM", 10) + x(desc, 100)
         + zoned(cents, 11) + n9(123456789, 9) + x("Merchant", 50) + x("City", 50)
         + x("12345", 10) + x(card, 16) + x("2022-07-18 10:00:00.000000", 26)
         + x("2022-07-18 10:00:00.000000", 26) + x("", 20))
    assert len(r) == 350
    return r


def acct(aid, bal_cents, limit_cents):
    r = (n9(aid, 11) + "Y" + zoned(bal_cents, 12) + zoned(limit_cents, 12) + zoned(100000, 12)
         + x("2014-11-20", 10) + x("2025-05-20", 10) + x("2025-05-20", 10)
         + zoned(0, 12) + zoned(0, 12) + x("12345", 10) + x("A000000000", 10) + x("", 178))
    assert len(r) == 300
    return r


def xref(card, cust, aid):
    r = x(card, 16) + n9(cust, 9) + n9(aid, 11) + x("", 14)
    assert len(r) == 50
    return r


def cust(cid, first, middle, last, a1, a2, a3, st, ctry, zipc, fico):
    r = (n9(cid, 9) + x(first, 25) + x(middle, 25) + x(last, 25) + x(a1, 50) + x(a2, 50)
         + x(a3, 50) + x(st, 2) + x(ctry, 3) + x(zipc, 10) + x("(908)119-8310", 15)
         + x("(373)693-8684", 15) + n9(20973888, 9) + x("000000000000493684371961316", 20)
         + x("1961-06-08", 10) + x("0053581756", 10) + "Y" + n9(fico, 3) + x("", 168))
    assert len(r) == 500
    return r


def main(out):
    os.makedirs(out, exist_ok=True)
    files = {
        # unsorted on purpose; card ...0002 has none; card ...9999 is not in the xref
        "transact": [
            tran("0000000000000003", "4111111111110001", "Purchase at Store C", 2500),
            tran("0000000000000001", "4111111111110001", "Purchase at Store A", 5045),
            tran("0000000000000010", "4111111111119999", "Orphan card transaction", 999),
            tran("0000000000000002", "4111111111110001", "Refund from Store B", -1250),
            tran("0000000000000004", "4111111111110003",
                 "A very long description that is longer than forty-nine characters for sure", 123456789),
        ],
        "acctdata": [
            acct(1, 194000, 2020000),
            acct(2, -5025, 500000),
        ],
        # out of card order on purpose; account 1 has two cards
        "cardxref": [
            xref("4111111111110003", 1, 1),
            xref("4111111111110001", 1, 1),
            xref("4111111111110002", 2, 2),
        ],
        "custdata": [
            cust(1, "Immanuel", "Madeline", "Kessler", "618 Deshaun Route", "Apt. 802",
                 "Altenwerthshire", "NC", "USA", "12546", 274),
            cust(2, "Mary Ann", "", "Smith", "1 Main  Street", "", "New York", "NY", "USA", "10001", 805),
        ],
    }
    body = {}
    for name, recs in files.items():
        text = "\n".join(recs) + "\n"
        with open(os.path.join(out, name + ".dat"), "w") as f:
            f.write(text)
        body[name] = text
    with open(os.path.join(out, "run_input.json"), "w") as f:
        json.dump(body, f)


if __name__ == "__main__":
    main(sys.argv[1])
