"""Write a small synthetic ACCRUE input set (fixed width, copybook layouts) to test/fixture/."""
import os
import sys

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "fixture")
os.makedirs(out, exist_ok=True)


def acct(id_, status, bal, cl, ccl, opn, exp, reis, cyc_cr, cyc_db, zip_, grp):
    r = f"{id_:011d}{status}{bal}{cl}{ccl}{opn}{exp}{reis}{cyc_cr}{cyc_db}{zip_:<10}{grp:<10}"
    assert len(r) == 122, len(r)
    return r.ljust(300)


ledgacc = [
    acct(1, "Y", "000000194000", "000000500000", "000000150000", "2014-11-20", "2025-05-20",
         "2025-05-20", "00000000000{", "00000001000{", "11111", "A000000000"),
    acct(2, "Y", "00000000502N", "000000200000", "000000050000", "2013-06-19", "2024-08-11",
         "2024-08-11", "00000000250E", "000000000000", "22222", "ZZZ"),
    acct(3, "N", "000000000000", "000000100000", "000000010000", "2012-01-01", "2023-01-01",
         "2023-01-01", "000000001000", "000000002000", "33333", "A000000000"),
]
balcat = [  # deliberately out of key order
    f"{2:011d}010001" + "0000000502N",
    f"{1:011d}010002" + "00000033333",
    f"{1:011d}010001" + "00000100000",
    f"{1:011d}020001" + "00000010000",
]
balcat = [r.ljust(50) for r in balcat]
cardlink = [
    "4111111111111111" + f"{1:09d}" + f"{1:011d}",
    "5222222222222222" + f"{2:09d}" + f"{2:011d}",
    "4222222222222222" + f"{2:09d}" + f"{2:011d}",
]
cardlink = [r.ljust(50) for r in cardlink]
rategrp = [
    "A000000000" + "01" + "0001" + "00150{",
    "A000000000" + "01" + "0002" + "00249I",
    "A000000000" + "02" + "0001" + "00000{",
    "DEFAULT   " + "01" + "0001" + "001200",
]
rategrp = [r.ljust(50) for r in rategrp]

for name, rows in [("ledgacc.dat", ledgacc), ("balcat.dat", balcat),
                   ("cardlink.dat", cardlink), ("rategrp.dat", rategrp)]:
    with open(os.path.join(out, name), "w") as f:
        f.write("\n".join(rows) + "\n")
print(out)
