# Writes the edited Sonnet-wiki bundles for CR3-CR8 (A21 draft): each is a copy of the frozen <step>-sonnet bundle with
# only the edits below. The new rule is stated as the rule, with no change marker; table rows that would contradict it
# are removed. Folder names are neutral (<step>-sonnet-<random>). Each edit must match exactly once.
#   python3 cr/make_wiki_cr3_8.py
import pathlib, shutil
B = pathlib.Path(__file__).resolve().parent.parent / "builds/inputs"
P = "02-processes/"; AC = "10-acceptance-criteria/"; DM = "01-data-model/project-data-model.md"

def bundle(src, dst, edits):
    d = B / dst
    if d.exists(): shutil.rmtree(d)
    shutil.copytree(B / src, d)
    (d / "SHA256SUMS").unlink()                   # rewritten after the edits (see cr/render_bundles.sh)
    for page, old, new in edits:
        f = d / page; t = f.read_text()
        assert t.count(old) == 1, (dst, page, old[:60], t.count(old))
        f.write_text(t.replace(old, new))
    print("wrote", dst)

ROW = lambda after, new: (after, after + "\n" + new)   # insert a table row after an existing one

# CR3, INTCALC: long-standing accounts pay the group rate minus 2.00
bundle("intcalc-sonnet", "intcalc-sonnet-ni2", [
    (P + "process-interest-calculation.md",
     "| BR-03 | If rate ≠ 0: `monthlyInterest = (categoryBalance × rate) / 1200` |",
     "| BR-03 | Effective rate: the disclosure-group rate, reduced by 2.00 for an account opened (`openDate`) on or before "
     "the same calendar date ten years before the run date (the date in `PARM`: 2022071800 → 2022-07-18, so opened on or "
     "before 2012-07-18), never below 0.00. If the effective rate ≠ 0: "
     "`monthlyInterest = (categoryBalance × effectiveRate) / 1200` |"),
    (AC + "acceptance-criteria-interest-calculation.md", *ROW(
     "| 7 | Fees | 1. Run | No fee created (legacy stub F-12) {{DECISION: implement fees in FlowX or keep stub}} | @manual |",
     "| 8 | Long-standing account | 1. Account opened 2010-02-13, group rate 15.00, run date 2022071800, category balance "
     "1000.00 | Effective rate 13.00; interest 10.83 (1000.00 × 13.00 / 1200) | @regression |\n"
     "| 9 | Account under ten years | 1. Account opened 2012-07-19, group rate 15.00, run date 2022071800 | Rate 15.00 "
     "unchanged | @regression |")),
    (AC + "acceptance-criteria-interest-calculation.md", "| Formula | bal × rate / 1200 | same | Same |\n", ""),
])

# CR4, POSTTRAN: at most four purchases per card per run, a further one rejected 104
bundle("posttran-sonnet", "posttran-sonnet-va7", [
    (P + "process-daily-transaction-posting.md", *ROW(
     "| BR-09 | Legacy has no commit/restart. FlowX: each record is idempotent via `transactionId`; restart resumes after "
     "the last processed index (FI-11; legacy finding F-08) | — |",
     "| BR-10 | Daily purchase limit: a card may have at most four purchases (amount > 0) posted in one run, counted in feed "
     "order. A further purchase that passes BR-01–BR-04 is rejected **104** \"DAILY PURCHASE LIMIT EXCEEDED\". Credits and "
     "zero amounts are not counted and never get 104. | `CBTRN02C` |")),
    (AC + "acceptance-criteria-daily-transaction-posting.md", *ROW(
     "| 10 | Restart after failure | 1. Fail mid-run 2. Restart | No duplicate postings `{{DECISION: restart strategy — see "
     "process spec}}` | @integration |",
     "| 11 | Daily purchase limit | 1. Five purchases on one card in one run, all within the credit limit | First four "
     "posted; the fifth rejected, reason 104 `DAILY PURCHASE LIMIT EXCEEDED` | @regression |")),
    (AC + "acceptance-criteria-daily-transaction-posting.md", *ROW(
     "      | account expired before the date    | 103  |",
     "      | fifth purchase on the card this run | 104  |")),
    (AC + "acceptance-criteria-daily-transaction-posting.md",
     "| Validation order | xref → account → limit → expiry | same | Same |\n", ""),
    (DM, "| `WS-VALIDATION-FAIL-REASON` 9(4) | 100-103 |", "| `WS-VALIDATION-FAIL-REASON` 9(4) | 100-104 |"),
])

# CR5, POSTTRAN: the run posts in ascending amount order, equal amounts in feed order
bundle("posttran-sonnet", "posttran-sonnet-dr8", [
    (P + "process-daily-transaction-posting.md", *ROW(
     "| BR-09 | Legacy has no commit/restart. FlowX: each record is idempotent via `transactionId`; restart resumes after "
     "the last processed index (FI-11; legacy finding F-08) | — |",
     "| BR-10 | Posting order: the run processes the day's transactions in ascending order of amount, smallest first "
     "(credits, which carry negative amounts, come first); transactions with equal amounts keep their order in the daily "
     "feed. Every check (BR-01–BR-04) and every posting (BR-05) happens in that order. | `CBTRN02C` |")),
    (P + "process-daily-transaction-posting.md",
     "| StartSubProcessHandler | One iteration per record |",
     "| StartSubProcessHandler | One iteration per record, in posting order (BR-10) |"),
    (AC + "acceptance-criteria-daily-transaction-posting.md", *ROW(
     "| 10 | Restart after failure | 1. Fail mid-run 2. Restart | No duplicate postings `{{DECISION: restart strategy — see "
     "process spec}}` | @integration |",
     "| 11 | Posting order | 1. Feed with, in this order, purchases of 300.00 and 120.00 and a credit of −50.00 on one "
     "card | Processed as −50.00, 120.00, 300.00; each check sees the cycle totals left by the transactions before it "
     "| @regression |")),
])

# CR6, CREASTMT: Total EXP sums the charges only
bundle("creastmt-sonnet", "creastmt-sonnet-bd5", [
    (P + "process-statement-generation.md", "total expenditure = sum of amounts",
     "total expenditure (`Total EXP`) = sum of the charges listed (amounts above zero: purchases, interest); credits and "
     "returns are listed with their amounts but not subtracted"),
    (AC + "acceptance-criteria-statement-generation.md", "| 3 lines, total equals the sum of the amounts |",
     "| 3 lines, total equals the sum of the amounts above zero |"),
    (AC + "acceptance-criteria-statement-generation.md", *ROW(
     "| 6 | PDF statement | 1. Request PDF | Not available in legacy (FI-09) | @manual |",
     "| 7 | Credits on the statement | 1. Card with purchases 100.00 and 40.00 and a return of −30.00 | 3 lines; total "
     "140.00 (the return is listed, not subtracted) | @regression |")),
    (AC + "acceptance-criteria-statement-generation.md", "And the total equals the sum of the three amounts",
     "And the total equals the sum of the amounts above zero"),
    ("07-plugins/plugin-statement-document.md", "total expenses (sum of transaction amounts)",
     "total expenses (sum of the amounts above zero; credits and returns are not subtracted)"),
    (DM, "| totalExpenditure | Number | computed | Sum of lines |",
     "| totalExpenditure | Number | computed | Sum of the lines with an amount above zero |"),
])

# CR7, TRANREPT: interest postings left out of the report
bundle("tranrept-sonnet", "tranrept-sonnet-ix3", [
    (P + "process-transaction-report.md", *ROW(
     "| BR-06 | Report width 133 columns | `TRANREPT.jcl` |",
     "| BR-07 | Interest postings (type `01`, category `0005` Interest Amount) are left out of the report: no detail line, "
     "and not counted in any page, card or grand total | `CBTRN03C` |")),
    (AC + "acceptance-criteria-transaction-report.md", *ROW(
     "| 6 | Report ready notification | 1. Run from online request | User is informed (FI-08) | @manual |",
     "| 7 | Interest postings | 1. Range holds a card's purchases and its interest posting (type 01, category 0005) | "
     "Only the purchases are listed; the card total and the grand total leave the interest out | @regression |")),
])

# CR8, CREASTMT: the statement shows the FICO score band
BAND = "below 580 `Poor`, 580–669 `Fair`, 670–739 `Good`, 740–799 `Very Good`, 800 and above `Exceptional`"
bundle("creastmt-sonnet", "creastmt-sonnet-yx3", [
    (P + "process-statement-generation.md", "address, balances, FICO score and the list",
     "address, balances, FICO score band and the list"),
    (P + "process-statement-generation.md", *ROW(
     "| BR-06 | The legacy driver uses ALTER/GO TO, a 2-D array and control-block addressing; FlowX replaces it with a loop "
     "subprocess | `CBSTM03A` |",
     "| BR-07 | The statement shows the customer's FICO score band in place of the score: " + BAND + ". It goes in the FICO "
     "Score field of the text and the HTML statement | `CBSTM03A` |")),
    (AC + "acceptance-criteria-statement-generation.md", "account id, balance, FICO score |",
     "account id, balance, FICO score band |"),
    (AC + "acceptance-criteria-statement-generation.md", *ROW(
     "| 6 | PDF statement | 1. Request PDF | Not available in legacy (FI-09) | @manual |",
     "| 7 | FICO score band | 1. Customers with scores 623, 711 and 793 | Statements show `Fair`, `Good` and `Very Good` "
     "in the FICO Score field | @regression |")),
    ("07-plugins/plugin-statement-document.md", "cycle credit/debit, FICO score |", "cycle credit/debit, FICO score band |"),
    (DM, "| ficoScore | Integer | Customer | Printed on statement |",
     "| ficoScore | Integer | Customer | Printed on the statement as its band: " + BAND + " |"),
])
