# Builds extra golden-test inputs on top of the shipped sample data. Each case is a full input directory
# cases/<id>/in (base files copied, then specific records added or changed). Deterministic: same base -> same cases.
# Every added record is described in cases/<id>/CASE.md with the rule it targets and the expected outcome.
import pathlib, shutil, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent / "tools"))
from ref_posttran_lib import zoned, enc
from decimal import Decimal
ROOT = pathlib.Path(__file__).parent; BASE = ROOT / "data/in"; GOLD = ROOT / "golden/v1"
rd = lambda p: p.read_text().split("\n")[:-1]
def fresh(cid):
    d = ROOT / "cases" / cid / "in"
    if d.parent.exists(): shutil.rmtree(d.parent)
    shutil.copytree(BASE, d); return d
def write(p, recs): p.write_text("".join(r + "\n" for r in recs))
base_daily = rd(BASE / "dailytran.dat"); TEMPLATE = base_daily[0]
xref = {l[0:16]: l for l in rd(BASE / "cardxref.dat")}
card_of = {l[25:36]: l[0:16] for l in xref.values()}
acct_post = {l[0:11]: l for l in rd(GOLD / "posttran_acctdata.txt")}     # account state after the base posting
acct_base = {l[0:11]: l for l in rd(BASE / "acctdata.dat")}
def daily(tid, card, amt, orig_date, typ="01", cat="0001", desc="Golden test record"):
    r = TEMPLATE
    r = tid.ljust(16)[:16] + typ + cat + r[22:32] + desc.ljust(100)[:100] + enc(Decimal(amt), 11, 2) + r[143:262] + card + (orig_date + r[288:304])[:26] + r[304:]
    assert len(r) == 350; return r
def headroom(a):  # credit limit - (cycle credit - cycle debit), after the base posting
    l = acct_post[a]; return zoned(l[24:36], 2) - (zoned(l[78:90], 2) - zoned(l[90:102], 2))

# ---------- c01: POSTTRAN validation coverage ----------
d = fresh("c01"); rows, doc = [], []
accts = sorted(acct_post)
exp_acct = min(accts, key=lambda a: acct_base[a][58:68])          # earliest expiry
exp_date = acct_base[exp_acct][58:68]
def add(tid, card, amt, date, rule, expect):
    rows.append(daily(tid, card, amt, date)); doc.append(f"| {tid} | {card} | {amt} | {date} | {rule} | {expect} |")
add("C01T000000000001", "9999999999999999", "10.00", "2022-06-10", "card not in CARDXREF", "reject 100")
add("C01T000000000003", card_of[exp_acct], "1.00", "2030-01-01", f"received after account expiry ({exp_acct} expires {exp_date})", "reject 103")
add("C01T000000000004", card_of[exp_acct], "99999999.99", "2030-01-01", "over limit AND after expiry: 103 overwrites 102", "reject 103")
add("C01T000000000005", card_of[exp_acct], "1.00", exp_date, "orig date == expiry date (>= passes)", "posted")
# boundary pair on two other accounts (their state is untouched by the records above)
a1, a2 = [a for a in accts if a != exp_acct][:2]
add("C01T000000000006", card_of[a1], str(headroom(a1)), "2022-06-10", f"amount == remaining headroom on {a1} (>= passes)", "posted")
add("C01T000000000007", card_of[a2], str(headroom(a2) + Decimal("0.01")), "2022-06-10", f"amount == headroom + 0.01 on {a2}", "reject 102")
a3 = [a for a in accts if a not in (exp_acct, a1, a2)][0]
add("C01T000000000008", card_of[a3], "-500.00", "2022-06-10", f"credit (negative amount) on {a3}: goes to cycle debit", "posted")
write(d / "dailytran.dat", base_daily + rows)
(d.parent / "CASE.md").write_text("# c01 — POSTTRAN validation coverage\n\nBase sample data plus the records below (appended after the 300 base daily transactions). Reason 101 lives in c03, because its orphan CARDXREF row makes CREASTMT abend..\n"
  "Headroom = credit limit − (cycle credit − cycle debit) after the base posting (golden/v1).\n\n| Tran ID | Card | Amount | Orig date | Rule targeted | Expected |\n|---|---|---|---|---|---|\n" + "\n".join(doc) + "\n")

# ---------- c03: orphan cross-reference (reason 101 + downstream robustness) ----------
d = fresh("c03"); ghost = "8888888888888888"
xr = rd(d / "cardxref.dat"); xr.append((ghost + "000000999" + "99999999999").ljust(50)); write(d / "cardxref.dat", xr)
write(d / "dailytran.dat", base_daily + [daily("C03T000000000001", ghost, "10.00", "2022-06-10")])
(d.parent / "CASE.md").write_text("# c03 — orphan cross-reference\n\nBase sample data plus one CARDXREF row (card 8888888888888888 → customer 000000999, account 99999999999; neither exists) "
  "and one daily transaction on that card.\n\n| Tran ID | Card | Amount | Orig date | Rule targeted | Expected |\n|---|---|---|---|---|---|\n"
  "| C03T000000000001 | 8888888888888888 | 10.00 | 2022-06-10 | card in CARDXREF, account missing | reject 101 |\n\n"
  "Downstream (observed legacy behaviour): CREASTMT walks every CARDXREF row, fails to read customer 000000999 (status 23) and abends with RC 16 "
  "after writing 44 of the 50 statements (partial output: statements for cards that sort after 8888888888888888 are never produced). A migration has to reproduce, fix or flag this.\n")

# ---------- c02: INTCALC rate paths ----------
d = fresh("c02"); acc = rd(d / "acctdata.dat"); doc = []
def set_group(a, grp, why):
    for i, l in enumerate(acc):
        if l[0:11] == a: acc[i] = l[:112] + grp.ljust(10) + l[122:]; doc.append(f"| {a} | `{grp}` | {why} |")
dg = rd(d / "discgrp.dat")
dg.append(("C02GRP24  " + "01" + "0001" + enc(Decimal("24.00"), 6, 2)).ljust(50)); write(d / "discgrp.dat", dg)
set_group(accts[0], "C02GRP24", "group found in DISCGRP (row added: type 01 / cat 0001 at 24.00, vs DEFAULT 15.00): own rate used, no fallback; its type 03 balance has no C02GRP24 row, so that one falls back to DEFAULT")
set_group(accts[1], "ZEROAPR", "group rate is 0: no interest transaction written, account still closed (cycle totals reset)")
set_group(accts[2], "NOSUCHGRP", "group missing from DISCGRP: falls back to DEFAULT")
write(d / "acctdata.dat", acc)
(d.parent / "CASE.md").write_text("# c02 — INTCALC disclosure-group paths\n\nBase sample data with ACCT-GROUP-ID (bytes 113–122, blank in the shipped data) set on three accounts, and one DISCGRP row added (`C02GRP24`, type 01, category 0001, rate 24.00):\n\n| Account | Group | Path targeted |\n|---|---|---|\n" + "\n".join(doc) + "\n\nThe last-account defect (notebook §7) still applies to account 00000000050.\n")
# ---------- c04: INTCALC value partitions the base data never reaches (BRANCHES.md I11, I13, P11) ----------
d = fresh("c04"); rows, doc = [], []
def add4(tid, a, amt, typ, cat, rule, expect):
    rows.append(daily(tid, card_of[a], amt, "2022-06-10", typ, cat)); doc.append(f"| {tid} | {a} | {typ}/{cat} | {amt} | {rule} | {expect} |")
an, am, az = accts[3], accts[4], accts[5]
add4("C04T000000000001", an, "-123.45", "01", "0002", "I11: negative balance in a rated category (DEFAULT 01/0002 = 25.00)",
     "posted; interest = -123.45 x 25 / 1200 = -2.571875 -> **-2.57** (truncated toward zero; floor would give -2.58)")
add4("C04T000000000002", am, "200.00", "01", "0002", "I13: second rated category on one account (DEFAULT 25.00)",
     "posted; interest 200.00 x 25 / 1200 = 4.1666.. -> **4.16**")
add4("C04T000000000003", am, "300.00", "04", "0001", "I13: third rated category on the same account (DEFAULT 04/0001 = 15.00)",
     "posted; interest 300.00 x 15 / 1200 = **3.75**")
add4("C04T000000000004", az, "0.00", "01", "0001", "P11: amount exactly 0 (>= 0, so added to cycle credit)",
     "posted; no visible effect on balances (adding 0 to credit or debit is the same): P11 is unobservable in the outputs")
write(d / "dailytran.dat", base_daily + rows)
(d.parent / "CASE.md").write_text("# c04 — INTCALC value partitions\n\nBase sample data plus the daily transactions below (appended, orig date 2022-06-10). "
  "Expected outcomes written before the first run.\n\n| Tran ID | Account | Type/cat | Amount | Rule targeted | Expected |\n|---|---|---|---|---|---|\n" + "\n".join(doc) +
  f"\n\nExpected at INTCALC: account {an} has two rated categories (01/0001 from the base data, 01/0002 negative) -> two interest transactions on its card; "
  f"account {am} has three (01/0001, 01/0002, 04/0001) -> three interest transactions on one card, all summed into its balance; "
  "53 interest transactions in total (50 + 1 + 2). Interest IDs after these accounts shift by the extra transactions. The last-account defect still applies to account 00000000050.\n")
print("cases written:", ", ".join(sorted(p.name for p in (ROOT / "cases").iterdir())))
