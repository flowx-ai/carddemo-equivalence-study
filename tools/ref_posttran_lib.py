# Independent Python model of CBTRN02C (POSTTRAN), written from the COBOL source, used to cross-check the
# GnuCOBOL run: same inputs -> must give the same rejects, account balances and category balances.
import sys, pathlib
from decimal import Decimal
I = pathlib.Path(__file__).parent.parent / "data/in"
POS = "{ABCDEFGHI"; NEG = "}JKLMNOPQR"
def zoned(s, scale):
    s = s.strip() or "0"; last = s[-1]
    if last in POS: d, sign = str(POS.index(last)), 1
    elif last in NEG: d, sign = str(NEG.index(last)), -1
    else: d, sign = last, 1
    return sign * Decimal(s[:-1] + d) / (10 ** scale)
def enc(v, digits, scale):  # back to zoned overpunch text
    n = int((abs(v) * 10 ** scale).to_integral_value()); s = str(n).zfill(digits)
    return s[:-1] + (POS if v >= 0 else NEG)[int(s[-1])]
