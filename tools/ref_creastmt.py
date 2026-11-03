# Independent Python model of CREASTMT (DFSORT STEP010 + CBSTM03A/CBSTM03B), written from the COBOL source and the
# JCL, used to cross-check the GnuCOBOL run. Step isolation: inputs are the oracle's COMBTRAN and INTCALC outputs in
# <out> plus CARDXREF and CUSTDATA from $INPUT. Rebuilds both statement files and compares them line by line.
# usage: INPUT=<in dir> python3 tools/ref_creastmt.py <golden out dir>
# With WRITE_TO=<dir> it writes its two outputs there and skips the comparison (adapter self-test, A13).
import sys, os, re, pathlib
from decimal import Decimal
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from ref_posttran_lib import zoned
HERE = pathlib.Path(__file__).parent.parent
I = pathlib.Path(os.environ.get("INPUT", HERE / "data/in")); out = pathlib.Path(sys.argv[1])
rd = lambda p: p.read_bytes().decode("latin-1").split("\n")[:-1]

# HTML literals: taken from the 88-level VALUE clauses of CBSTM03A (fixed format, cols 8-72, continuation in col 7)
def html_literals():
    src = (HERE / "src/CBSTM03A.CBL").read_text().split("\n")
    text, lits = "", {}
    for l in src:
        l = l.ljust(72)
        if l[6] == "*": continue
        body = l[7:72]
        if l[6] == "-":
            q = body.index("'"); text += body[q + 1:]  # continued literal resumes after the opening quote
        else:
            text += "\n" + body
    for name, lit in re.findall(r"88\s+(HTML-L[0-9A-Z-]+)\s+VALUE\s+'((?:[^']|'')*)'", text):
        lits[name] = lit.replace("''", "'")
    return lits
H = html_literals()
for need in ["HTML-L01", "HTML-L08", "HTML-L10", "HTML-L22-35", "HTML-L47", "HTML-L64", "HTML-L80"]:
    assert need in H, need

def ed_9_9_99_minus(v):          # PIC 9(9).99-   (high-order digits beyond 9 are truncated)
    n = int((abs(v) * 100).to_integral_value()) % 10**11
    s = str(n).zfill(11); return s[:9] + "." + s[9:] + ("-" if v < 0 else " ")
def ed_z9_99_minus(v):           # PIC Z(9).99-
    n = int((abs(v) * 100).to_integral_value()) % 10**11
    s = str(n).zfill(11); ip = s[:9].lstrip("0")
    return ip.rjust(9) + "." + s[9:] + ("-" if v < 0 and n else " ")
def upto(s, delim):              # STRING ... DELIMITED BY delim
    i = s.find(delim); return s if i < 0 else s[:i]

# CREASTMT STEP010: SORT FIELDS=(263,16,CH,A,1,16,CH,A); OUTREC FIELDS=(1:263,16,17:1,262,279:279,50);
# REPRO into TRXFL (key = card + tran id). OUTREC builds 328 bytes; bytes 329-350 are never read by CBSTM03A.
comb = rd(out / "combtran_transact.txt")
trnx = sorted(((r[262:278], r[0:16]), r[262:278] + r[0:262] + r[278:328]) for r in comb)
trnx = [t for _, t in trnx]

# CBSTM03A 8100/8500: load every TRNX record into WS-TRNX-TABLE (51 cards x 10 transactions, no bounds check).
# Modelled as the flat storage COBOL uses, so an 11th transaction for one card lands where COBOL puts it.
CARD_W, TRAN_W = 16, 16 + 318; ENTRY = CARD_W + 10 * TRAN_W
table = bytearray(b" " * (51 * ENTRY)); trct = [0] * 52
def off(c, t=None): return (c - 1) * ENTRY + (0 if t is None else CARD_W + (t - 1) * TRAN_W)
def put(o, s): table[o:o + len(s)] = s.encode("latin-1")
def get(o, n): return table[o:o + n].decode("latin-1")
cr, tr, save = 1, 0, trnx[0][0:16]
for rec in trnx:
    if save == rec[0:16]: tr += 1
    else: trct[cr] = tr; cr += 1; tr = 1
    put(off(cr), rec[0:16]); put(off(cr, tr), rec[16:32]); put(off(cr, tr) + 16, rec[32:350].ljust(318)[:318])
    save = rec[0:16]
trct[cr] = tr; cr_cnt = cr

xref = sorted(rd(I / "cardxref.dat"))                           # XREFFILE read sequentially = key (card) order
cust = {l[0:9]: l for l in rd(I / "custdata.dat")}
acct = {l[0:11]: l.ljust(300) for l in rd(out / "intcalc_acctdata.txt")}
st, ht, abend = [], [], None
def S(x): st.append(x.ljust(80)[:80])
def W(x): ht.append(x.ljust(100)[:100])
def F(*names):
    for n in names: W(H[n] if n.startswith("HTML-") else n)
for x in xref:
    card, cid, aid = x[0:16], x[16:25], x[25:36]
    if cid not in cust: abend = f"customer {cid} not found (card {card})"; break
    if aid not in acct: abend = f"account {aid} not found (card {card})"; break
    c, a = cust[cid], acct[aid]
    first, mid, last = c[9:34], c[34:59], c[59:84]
    add1, add2, add3, state, ctry, zip_ = c[84:134], c[134:184], c[184:234], c[234:236], c[236:239], c[239:249]
    fico = c[329:332]
    # 5000-CREATE-STATEMENT (statement lines are written after the HTML header and name/address block)
    name = (upto(first, " ") + " " + upto(mid, " ") + " " + upto(last, " ") + " ")[:75].ljust(75)
    st_add3 = (upto(add3, " ") + " " + upto(state, " ") + " " + upto(ctry, " ") + " " + upto(zip_, " ") + " ")[:80].ljust(80)
    st_acct = aid.ljust(20); bal = ed_9_9_99_minus(zoned(a[12:24], 2)); st_fico = fico.ljust(20)
    S("*" * 31 + "START OF STATEMENT" + "*" * 31)
    # 5100-WRITE-HTML-HEADER
    F("HTML-L01", "HTML-L02", "HTML-L03", "HTML-L04", "HTML-L05", "HTML-L06", "HTML-L07", "HTML-L08", "HTML-LTRS", "HTML-L10")
    W("<h3>Statement for Account Number: " + aid.ljust(20) + "</h3>")
    F("HTML-LTDE", "HTML-LTRE", "HTML-LTRS", "HTML-L15", "HTML-L16", "HTML-L17", "HTML-L18", "HTML-LTDE", "HTML-LTRE",
      "HTML-LTRS", "HTML-L22-35")
    # 5200-WRITE-HTML-NMADBS
    W('<p style="font-size:16px">' + upto(name[:50], "  ") + "  " + "</p>")
    for ad in (add1, add2, st_add3):
        W("<p>" + upto(ad, "  ") + "  " + "</p>")
    F("HTML-LTDE", "HTML-LTRE", "HTML-LTRS", "HTML-L30-42", "HTML-L31", "HTML-LTDE", "HTML-LTRE", "HTML-LTRS", "HTML-L22-35")
    W("<p>Account ID         : " + st_acct + "</p>")
    W("<p>Current Balance    : " + bal + "</p>")
    W("<p>FICO Score         : " + st_fico + "</p>")
    F("HTML-LTDE", "HTML-LTRE", "HTML-LTRS", "HTML-L30-42", "HTML-L43", "HTML-LTDE", "HTML-LTRE", "HTML-LTRS", "HTML-L47",
      "HTML-L48", "HTML-LTDE", "HTML-L50", "HTML-L51", "HTML-LTDE", "HTML-L53", "HTML-L54", "HTML-LTDE", "HTML-LTRE")
    S(name + " " * 5); S(add1 + " " * 30); S(add2 + " " * 30); S(st_add3.ljust(80))
    S("-" * 80); S(" " * 33 + "Basic Details " + " " * 33); S("-" * 80)
    S("Account ID         :" + st_acct); S("Current Balance    :" + bal); S("FICO Score         :" + st_fico)
    S("-" * 80); S(" " * 30 + "TRANSACTION SUMMARY " + " " * 30); S("-" * 80)
    S("Tran ID         " + "Tran Details    ".ljust(51) + "  Tran Amount"); S("-" * 80)
    # 4000-TRNXFILE-GET: scan the table from the start until the card is found or passed
    total = Decimal(0)
    for crj in range(1, cr_cnt + 1):
        if get(off(crj), 16) > card: break
        if get(off(crj), 16) != card: continue
        for trj in range(1, trct[crj] + 1):
            tid, rest = get(off(crj, trj), 16), get(off(crj, trj) + 16, 318)
            desc, amt = rest[16:116], zoned(rest[116:127], 2)
            S(tid + " " + desc[:49] + "$" + ed_z9_99_minus(amt))
            F("HTML-LTRS", "HTML-L58"); W("<p>" + tid + "</p>"); F("HTML-LTDE", "HTML-L61")
            W("<p>" + desc[:49] + "</p>"); F("HTML-LTDE", "HTML-L64"); W("<p>" + ed_z9_99_minus(amt) + "</p>")
            F("HTML-LTDE", "HTML-LTRE")
            total += amt
    S("-" * 80); S("Total EXP:" + " " * 56 + "$" + ed_z9_99_minus(total)); S("*" * 32 + "END OF STATEMENT" + "*" * 32)
    F("HTML-LTRS", "HTML-L10", "HTML-L75", "HTML-LTDE", "HTML-LTRE", "HTML-L78", "HTML-L79", "HTML-L80")

if os.environ.get("WRITE_TO"):   # adapter self-test only: write the model's outputs and stop before the comparison
    w = pathlib.Path(os.environ["WRITE_TO"]); w.mkdir(parents=True, exist_ok=True)
    for fname, mine in (("creastmt_statements.txt", st), ("creastmt_statements_html.txt", ht)):
        (w / fname).write_bytes(("\n".join(mine) + "\n").encode("latin-1"))
    sys.exit(0)
ok = True
for fname, mine in (("creastmt_statements.txt", st), ("creastmt_statements_html.txt", ht)):
    got = rd(out / fname)
    diffs = [i for i in range(max(len(got), len(mine))) if (got[i] if i < len(got) else None) != (mine[i] if i < len(mine) else None)]
    print(f"{fname:30s} ref {len(mine):5d} cobol {len(got):5d} diff lines {len(diffs)}")
    for i in diffs[:6]:
        print("   line", i + 1); print("     ref  ", repr(mine[i]) if i < len(mine) else None); print("     cobol", repr(got[i]) if i < len(got) else None)
    ok &= not diffs
over = [(c, trct[c]) for c in range(1, cr_cnt + 1) if trct[c] > 10]
print("cards", cr_cnt, "max transactions per card", max(trct), "table overflow (>10):", over or "none")
print("abend:", abend or "none (expected RC 0)")
print("CROSS-CHECK", "PASS" if ok else "FAIL")
