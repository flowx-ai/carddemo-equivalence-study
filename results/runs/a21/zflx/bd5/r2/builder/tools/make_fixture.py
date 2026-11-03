"""Synthetic fixed-width inputs for the statement-generation acceptance scenarios.

Usage: python3 -I make_fixture.py <out_dir>
Writes transact.dat, acctdata.dat, cardxref.dat, custdata.dat and input_body.json
(the run_workflow inputBody: one string per file).

Note: not executed while building (no shell in that session). The fixture actually used was
produced by the same logic ported to JavaScript and run on FlowX via run_workflow_node.
"""
import json
import sys
from pathlib import Path


def x(s, n):
    return str(s)[:n].ljust(n)


def zoned(cents, digits):
    """Signed zoned decimal, sign overpunched on the last digit (EBCDIC-style)."""
    s = str(abs(cents)).rjust(digits, "0")
    d = int(s[-1])
    last = ("{ABCDEFGHI" if cents >= 0 else "}JKLMNOPQR")[d]
    return s[:-1] + last


def cust(cid, first, middle, last, a1, a2, a3, st, ctry, zipc, fico):
    r = (x(str(cid).rjust(9, "0"), 9) + x(first, 25) + x(middle, 25) + x(last, 25)
         + x(a1, 50) + x(a2, 50) + x(a3, 50) + x(st, 2) + x(ctry, 3) + x(zipc, 10)
         + x("(555)555-1234", 15) + x("", 15) + "123456789" + x("", 20)
         + "1980-01-01" + x("", 10) + "Y" + str(fico).rjust(3, "0"))
    return x(r, 500)


def acct(aid, bal):
    r = (str(aid).rjust(11, "0") + "Y" + zoned(bal, 12) + zoned(500000, 12) + zoned(100000, 12)
         + "2014-11-20" + "2025-05-20" + "2025-05-20" + zoned(0, 12) + zoned(0, 12)
         + x("98101", 10) + x("DEFAULT", 10))
    return x(r, 300)


def xref(card, cid, aid):
    return x(card + str(cid).rjust(9, "0") + str(aid).rjust(11, "0"), 50)


def tran(tid, desc, amt, card):
    r = (x(tid, 16) + "01" + "0001" + x("POS TERM", 10) + x(desc, 100) + zoned(amt, 11)
         + "000000001" + x("Merchant", 50) + x("Seattle", 50) + x("98101", 10) + x(card, 16)
         + x("2022-07-18 10:00:00.000000", 26) + x("2022-07-18 10:00:00.000000", 26))
    return x(r, 350)


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    c1, c2, c3 = "4111111111111111", "4222222222222222", "4333333333333333"
    files = {
        "custdata": [
            cust(1, "Immanuel", "Madeline", "Kessler", "618 Deshaun Route", "Apt. 802",
                 "Altenwerthshire", "NC", "USA", "12546", 274),
            cust(2, "Enrico", "", "Rosenbaum", "4917 Myrna Flats", "Apt. 453",
                 "West Bernita", "IN", "USA", "22770", 742),
        ],
        "acctdata": [acct(1, 19400), acct(2, -12550)],
        # card 3 points at a customer that does not exist
        "cardxref": [xref(c2, 2, 2), xref(c1, 1, 1), xref(c3, 9, 1)],
        "transact": [
            # card 1: purchases 100.00, 40.00, return -30.00 (out of id order on file)
            tran("0000000000000003", "Return of goods", -3000, c1),
            tran("0000000000000001", "Purchase at Store A " + "x" * 60, 10000, c1),
            tran("0000000000000002", "Purchase at Store B", 4000, c1),
            # card 2: no transactions
        ],
    }
    body = {}
    for name, recs in files.items():
        text = "\n".join(recs) + "\n"
        (out / f"{name}.dat").write_text(text)
        body[name] = text
    (out / "input_body.json").write_text(json.dumps(body))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
