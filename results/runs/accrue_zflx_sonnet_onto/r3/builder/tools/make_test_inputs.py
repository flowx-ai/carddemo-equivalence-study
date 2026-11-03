"""Write a small synthetic ACCRUE input set (fixed-width, copybook layouts) for smoke-testing the
FlowX workflow. Usage: python3 -I tools/make_test_inputs.py <out_dir>"""
import os
import sys

POS, NEG = "{ABCDEFGHI", "}JKLMNOPQR"


def zoned(cents, length):
    """Signed zoned decimal with trailing overpunch, e.g. zoned(1500, 6) -> '00150{'."""
    digits = str(abs(cents)).rjust(length, "0")
    last = int(digits[-1])
    return digits[:-1] + (NEG[last] if cents < 0 else POS[last])


def account(acct_id, bal, cyc_credit, cyc_debit, group):
    rec = (str(acct_id).rjust(11, "0") + "Y" + zoned(bal, 12) + zoned(500000, 12) + zoned(100000, 12)
           + "2014-11-20" + "2025-05-20" + "2025-05-20" + zoned(cyc_credit, 12) + zoned(cyc_debit, 12)
           + "A1B 2C3".ljust(10) + group.ljust(10))
    return rec.ljust(300)


def balance(acct_id, type_cd, cat_cd, bal):
    return (str(acct_id).rjust(11, "0") + type_cd + str(cat_cd).rjust(4, "0") + zoned(bal, 11)).ljust(50)


def rate(group, type_cd, cat_cd, rate_hundredths):
    return (group.ljust(10) + type_cd + str(cat_cd).rjust(4, "0") + zoned(rate_hundredths, 6)).ljust(50)


def xref(card, cust, acct_id):
    return (card + str(cust).rjust(9, "0") + str(acct_id).rjust(11, "0")).ljust(50)


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    files = {
        "ledgacc.dat": [
            account(1, 194000, 12000, 3400, "A000000000"),
            account(2, 5000000, 0, 77700, "GOLDXX"),      # group without rate rows -> STANDARD
            account(3, 100000, 500, 600, "ZEROAPR"),       # zero rate -> no interest, cycle reset
            account(4, 25000, 900, 900, "A000000000"),     # no category balance -> untouched
            account(5, 80000, 100, 200, "A000000000"),     # last account in balcat
        ],
        "balcat.dat": [
            balance(1, "01", 1, 100000),     # 1000.00 @ 18.00 -> 15.00 (acceptance scenario 1)
            balance(1, "01", 2, 123456),     # 1234.56 @ 19.99 -> 20.56 truncated (20.57 if ROUNDED)
            balance(1, "02", 1, 50000),      # payment category, rate 0
            balance(1, "01", 3, -12345),     # -123.45 @ 24.99 -> -2.57
            balance(2, "01", 1, 200000),     # STANDARD 01/0001 21.00 -> 35.00
            balance(3, "01", 1, 100000),
            balance(5, "01", 1, 60000),      # 600.00 @ 18.00 -> 9.00
        ],
        "rategrp.dat": [
            rate("A000000000", "01", 1, 1800), rate("A000000000", "01", 2, 1999),
            rate("A000000000", "01", 3, 2499), rate("A000000000", "02", 1, 0),
            rate("STANDARD", "01", 1, 2100), rate("STANDARD", "02", 1, 0),
            rate("ZEROAPR", "01", 1, 0),
        ],
        "cardlink.dat": [
            xref("4000000000000009", 1, 1), xref("4000000000000001", 1, 1),
            xref("4000000000000002", 2, 2), xref("4000000000000003", 3, 3),
            xref("4000000000000004", 4, 4), xref("4000000000000005", 5, 5),
        ],
    }
    for name, recs in files.items():
        with open(os.path.join(out_dir, name), "w") as f:
            f.write("\n".join(recs) + "\n")


if __name__ == "__main__":
    main(sys.argv[1])
