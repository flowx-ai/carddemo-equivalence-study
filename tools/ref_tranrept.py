# Independent Python model of TRANREPT (DFSORT STEP05R + CBTRN03C), written from the COBOL source and the JCL, used
# to cross-check the GnuCOBOL run. Step isolation: input is the oracle's COMBTRAN output in <out> plus CARDXREF,
# TRANTYPE and TRANCATG from $INPUT. Rebuilds the report and compares it line by line.
# usage: INPUT=<in dir> python3 tools/ref_tranrept.py <golden out dir> [start end]
# With WRITE_TO=<dir> it writes its output there and skips the comparison (adapter self-test, A14).
import sys, os, pathlib
from decimal import Decimal
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from ref_posttran_lib import zoned
HERE = pathlib.Path(__file__).parent.parent
I = pathlib.Path(os.environ.get("INPUT", HERE / "data/in")); out = pathlib.Path(sys.argv[1])
START, END = (sys.argv[2], sys.argv[3]) if len(sys.argv) > 3 else ("2022-07-01", "2022-07-31")
rd = lambda p: p.read_bytes().decode("latin-1").split("\n")[:-1]

def edit(v, sign_char):
    # PIC -ZZZ,ZZZ,ZZZ.ZZ (sign_char '-') or +ZZZ,ZZZ,ZZZ.ZZ (sign_char '+'): fixed leading sign, zero suppression
    # through the integer part; a zero value with every digit position Z blanks the whole item.
    n = int((abs(v) * 100).to_integral_value()) % 10**11
    if n == 0: return " " * 15
    d = str(n).zfill(11); body, lead = "", True
    for i, ch in enumerate(d[:9]):
        if i in (3, 6): body += " " if lead else ","
        if lead and ch == "0": body += " "
        else: lead = False; body += ch
    body += "." + d[9:]
    sign = ("-" if v < 0 else " ") if sign_char == "-" else ("-" if v < 0 else "+")
    return sign + body

# TRANREPT STEP05R: INCLUDE COND=(TRAN-PROC-DT,GE,start,AND,TRAN-PROC-DT,LE,end); SORT FIELDS=(TRAN-CARD-NUM,A).
# Equal keys keep their input order (the input is COMBTRAN's output, in TRAN-ID order). DFSORT without EQUALS does
# not promise this; it is the oracle's documented assumption, shared here.
comb = rd(out / "combtran_transact.txt")
recs = sorted((r for r in comb if START <= r[304:314] <= END), key=lambda r: r[262:278])
xref = {l[0:16]: l for l in rd(I / "cardxref.dat")}
ttyp = {l[0:2]: l[2:52] for l in rd(I / "trantype.dat")}
tcat = {l[0:6]: l[6:56] for l in rd(I / "trancatg.dat")}

rep, notes = [], []
def put(s): rep.append(s.ljust(133)[:133])
lines = 0; first = True; page = acct_t = grand = Decimal(0); cur_card = " " * 16; xacct = None
H2 = "-" * 133
def headers():
    global lines
    put("DALYREPT".ljust(38) + "Daily Transaction Report".ljust(41) + "Date Range: " + START + " to " + END); lines += 1
    put(""); lines += 1
    put("Transaction ID".ljust(17) + "Account ID".ljust(12) + "Transaction Type".ljust(19) + "Tran Category".ljust(35)
        + "Tran Source".ljust(14) + " " + "        Amount".ljust(16)); lines += 1
    put(H2); lines += 1
def page_totals():
    global lines, page, grand
    put("Page Total".ljust(11) + "." * 86 + edit(page, "+")); grand += page; page = Decimal(0); lines += 1
    put(H2); lines += 1
def account_totals():
    global lines, acct_t
    put("Account Total".ljust(13) + "." * 84 + edit(acct_t, "+")); acct_t = Decimal(0); lines += 1
    put(H2); lines += 1

i, last = 0, None
while True:
    eof = i >= len(recs)
    rec = recs[i] if not eof else last; i += 1        # READ ... INTO leaves TRAN-RECORD unchanged at end of file
    if not (START <= rec[304:314] <= END):
        notes.append(f"NEXT SENTENCE on {rec[0:16]}: loop left without totals"); break
    if not eof:
        last = rec
        card, amt = rec[262:278], zoned(rec[132:143], 2)
        if cur_card != card:
            if not first: account_totals()
            cur_card = card
            if card not in xref: notes.append(f"abend: card {card} not in CARDXREF"); break
            xacct = xref[card][25:36]
        typ, cat = rec[16:18], rec[18:22]
        if typ not in ttyp: notes.append(f"abend: type {typ}"); break
        if typ + cat not in tcat: notes.append(f"abend: category {typ}{cat}"); break
        if first:
            first = False; headers()
        if lines % 20 == 0:
            page_totals(); headers()
        page += amt; acct_t += amt
        put(rec[0:16] + " " + xacct + " " + typ + "-" + ttyp[typ][:15] + " " + cat + "-" + tcat[typ + cat][:29] + " "
            + rec[22:32] + "    " + edit(amt, "-") + "  "); lines += 1
    else:
        amt = zoned(rec[132:143], 2)
        page += amt; acct_t += amt                      # the last transaction's amount is added a second time
        page_totals()
        put("Grand Total".ljust(11) + "." * 86 + edit(grand, "+"))
        break

if os.environ.get("WRITE_TO"):   # adapter self-test only: write the model's output and stop before the comparison
    w = pathlib.Path(os.environ["WRITE_TO"]); w.mkdir(parents=True, exist_ok=True)
    (w / "tranrept_report.txt").write_bytes(("\n".join(rep) + "\n").encode("latin-1")); sys.exit(0)
got = rd(out / "tranrept_report.txt")
diffs = [k for k in range(max(len(got), len(rep))) if (got[k] if k < len(got) else None) != (rep[k] if k < len(rep) else None)]
print(f"tranrept_report.txt ref {len(rep)} cobol {len(got)} diff lines {len(diffs)}")
for k in diffs[:6]:
    print("   line", k + 1); print("     ref  ", repr(rep[k]) if k < len(rep) else None); print("     cobol", repr(got[k]) if k < len(got) else None)
ties = len(recs) - len({r[262:278] for r in recs})
true_total = sum((zoned(r[132:143], 2) for r in recs), Decimal(0))
print(f"records in window {len(recs)}, equal sort keys {ties}; sum of amounts {true_total}, grand total printed {grand}"
      f" (difference {grand - true_total}; last transaction amount {zoned(recs[-1][132:143], 2)})")
print("notes:", notes or "none")
print("CROSS-CHECK", "PASS" if not diffs else "FAIL")
