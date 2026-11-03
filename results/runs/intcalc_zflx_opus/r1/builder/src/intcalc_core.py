# CardDemo INTCALC (CBACT04C) interest calculation -- core logic.
#
# Single source of truth: this exact code is the body of the "Compute Interest"
# SCRIPT node (PYTHON) in the FlowX workflow `intcalc_batch` (with
# flowx_node_entry.py appended), and it is imported unchanged by the local
# runner run_intcalc.py. FlowX scripts may not import modules (sys, etc. are
# blocked), so this file is pure Python with no imports.
#
# All money is handled as integer cents to reproduce COBOL fixed-point
# arithmetic exactly. Decision references (A1, A2, ...) point to assumptions.md.

ACCT_LEN = 300     # CVACT01Y
TCATBAL_LEN = 50   # CVTRA01Y
DISCGRP_LEN = 50   # CVTRA02Y
XREF_LEN = 50      # CVACT03Y

# Zoned-decimal trailing sign overpunch (A14). EBCDIC-style characters as in
# the CardDemo ASCII data files, plus the GnuCOBOL ASCII negative convention.
_POS_OVERPUNCH = {"{": 0, "A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7, "H": 8, "I": 9}
_NEG_OVERPUNCH = {"}": 0, "J": 1, "K": 2, "L": 3, "M": 4, "N": 5, "O": 6, "P": 7, "Q": 8, "R": 9,
                  "p": 0, "q": 1, "r": 2, "s": 3, "t": 4, "u": 5, "v": 6, "w": 7, "x": 8, "y": 9}


def _lines(text, rec_len):
    out = []
    for raw in str(text or "").split("\n"):
        line = raw.rstrip("\r")
        if line.strip() == "":
            continue
        if len(line) < rec_len:
            line = line + " " * (rec_len - len(line))
        out.append(line)
    return out


def parse_zoned(field, scale=2):
    """Signed zoned decimal (implied decimal point) -> integer in 10**-scale units."""
    s = field.strip()
    if s == "":
        return 0
    sign = 1
    if s[0] in "+-":
        sign = -1 if s[0] == "-" else 1
        s = s[1:].strip()
    elif s[-1] in "+-":
        sign = -1 if s[-1] == "-" else 1
        s = s[:-1].strip()
    if s == "":
        return 0
    last = s[-1]
    if last in _POS_OVERPUNCH:
        s = s[:-1] + str(_POS_OVERPUNCH[last])
    elif last in _NEG_OVERPUNCH:
        s = s[:-1] + str(_NEG_OVERPUNCH[last])
        sign = -sign
    if "." in s:
        return sign * parse_decimal(s, scale)
    s = s.replace(" ", "0")
    if not s.isdigit():
        raise ValueError("invalid zoned decimal field: %r" % field)
    return sign * int(s)


def parse_decimal(value, scale=2):
    """'14.56' / '-500' / 14.56 -> integer in 10**-scale units (explicit point)."""
    s = str(value).strip()
    if s == "":
        return 0
    sign = 1
    if s[0] in "+-":
        sign = -1 if s[0] == "-" else 1
        s = s[1:]
    if "." in s:
        whole, frac = s.split(".", 1)
    else:
        whole, frac = s, ""
    frac = (frac + "0" * scale)[:scale]
    return sign * int((whole or "0") + frac)


def parse_unsigned(field):
    s = field.strip()
    if s == "":
        return 0
    return int(s)


def fmt_amount(cents):
    sign = "-" if cents < 0 else ""
    a = -cents if cents < 0 else cents
    return "%s%d.%02d" % (sign, a // 100, a % 100)


def _cobol_store(value, int_digits, scale=2):
    """Store into PIC S9(int_digits)V9(scale) without ON SIZE ERROR: high-order
    digits are lost (A11)."""
    limit = 10 ** (int_digits + scale)
    a = -value if value < 0 else value
    a = a % limit
    return -a if value < 0 else a


def _div_trunc(num, den):
    """COBOL COMPUTE without ROUNDED: truncate toward zero (A3)."""
    q = (-num if num < 0 else num) // den
    return -q if num < 0 else q


# ---------------------------------------------------------------- parsers --

def parse_accounts(text):
    accts = []
    for line in _lines(text, ACCT_LEN):
        accts.append({
            "acct_id": parse_unsigned(line[0:11]),
            "active_status": line[11:12].rstrip(),
            "curr_bal": parse_zoned(line[12:24]),
            "credit_limit": parse_zoned(line[24:36]),
            "cash_credit_limit": parse_zoned(line[36:48]),
            "open_date": line[48:58].rstrip(),
            "expiration_date": line[58:68].rstrip(),
            "reissue_date": line[68:78].rstrip(),
            "curr_cyc_credit": parse_zoned(line[78:90]),
            "curr_cyc_debit": parse_zoned(line[90:102]),
            "addr_zip": line[102:112].rstrip(),
            "group_id": line[112:122],          # kept padded: it is a key part
        })
    return accts


def parse_tcatbal(text):
    recs = []
    for line in _lines(text, TCATBAL_LEN):
        recs.append({
            "acct_id": parse_unsigned(line[0:11]),
            "type_cd": line[11:13],
            "cat_cd": parse_unsigned(line[13:17]),
            "bal": parse_zoned(line[17:28]),
        })
    return recs


def parse_discgrp(text):
    rates = {}
    for line in _lines(text, DISCGRP_LEN):
        key = (line[0:10], line[10:12], parse_unsigned(line[12:16]))
        if key not in rates:                     # KSDS: first load wins (A12)
            rates[key] = parse_zoned(line[16:22])
    return rates


def parse_xref(text):
    by_acct = {}
    for line in _lines(text, XREF_LEN):
        acct = parse_unsigned(line[25:36])
        if acct not in by_acct:                  # first card for account (A9)
            by_acct[acct] = line[0:16].rstrip()
    return by_acct


# ------------------------------------------------------------ processing --

def _pad(s, n):
    s = str(s or "")
    return (s + " " * n)[:n]


def run_intcalc(acct_text, tcatbal_text, xref_text, discgrp_text, parm_date,
                business_date="2022-07-18", post_last_account=False,
                accounts=None, tcatbal=None):
    """Return {"systran": [...], "accounts": [...], "warnings": [...],
    "last_account_id": int|None}. `accounts` / `tcatbal` may be passed
    pre-parsed (list of dicts, same keys as the parsers) instead of text."""
    warnings = []
    accts = accounts if accounts is not None else parse_accounts(acct_text)
    tcat = tcatbal if tcatbal is not None else parse_tcatbal(tcatbal_text)
    rates = parse_discgrp(discgrp_text)
    xref = parse_xref(xref_text)

    acct_by_id = {}
    for a in accts:
        a["group_id"] = _pad(a.get("group_id"), 10)
        if a["acct_id"] not in acct_by_id:
            acct_by_id[a["acct_id"]] = a

    # TCATBAL is a KSDS read sequentially -> ascending key order (A7).
    tcat = sorted(tcat, key=lambda r: (r["acct_id"], _pad(r["type_cd"], 2), r["cat_cd"]))

    parm = _pad(parm_date, 10)
    ts = _pad(business_date, 10) + "-00.00.00.000000"      # A10
    systran = []
    suffix = 0
    first_time = True
    last_acct = None
    cur_acct = None
    group_id = _pad("", 10)
    card_num = ""
    total_int = 0

    def update_account(acct, total):
        # 1050-UPDATE-ACCOUNT: add total interest, reset cycle totals (A4).
        if acct is None:
            return
        acct["curr_bal"] = _cobol_store(acct["curr_bal"] + total, 10)
        acct["curr_cyc_credit"] = 0
        acct["curr_cyc_debit"] = 0

    for rec in tcat:
        if rec["acct_id"] != last_acct:
            if not first_time:
                update_account(cur_acct, total_int)
            else:
                first_time = False
            total_int = 0
            last_acct = rec["acct_id"]
            cur_acct = acct_by_id.get(rec["acct_id"])
            if cur_acct is None:
                warnings.append("account %011d not found in account file (A12)" % rec["acct_id"])
            else:
                group_id = cur_acct["group_id"]
            card_num = xref.get(rec["acct_id"])
            if card_num is None:
                warnings.append("no card xref for account %011d (A12)" % rec["acct_id"])
                card_num = ""

        type_cd = _pad(rec["type_cd"], 2)
        rate = rates.get((group_id, type_cd, rec["cat_cd"]))
        if rate is None:                                    # A6: DEFAULT group
            rate = rates.get((_pad("DEFAULT", 10), type_cd, rec["cat_cd"]))
            if rate is None:
                warnings.append("no DEFAULT disclosure rate for type %s cat %04d (A12)"
                                % (type_cd, rec["cat_cd"]))
                rate = 0
        if rate == 0:
            continue

        # interest = (TRAN-CAT-BAL * DIS-INT-RATE) / 1200  (A2, A3)
        # cents * (rate% x100) / (100 * 1200) -> cents
        monthly = _cobol_store(_div_trunc(rec["bal"] * rate, 120000), 9)
        total_int = _cobol_store(total_int + monthly, 9)
        suffix = (suffix + 1) % 1000000
        systran.append({
            "tran_id": parm + "%06d" % suffix,
            "type_cd": "01",
            "cat_cd": 5,
            "source": "System",
            "desc": "Int. for a/c %011d" % rec["acct_id"],
            "amt": fmt_amount(monthly),
            "merchant_id": 0,
            "merchant_name": "",
            "merchant_city": "",
            "merchant_zip": "",
            "card_num": card_num,
            "orig_ts": ts,
            "proc_ts": ts,
        })

    # Legacy: the update in the EOF branch is unreachable, so the last account
    # read is never rewritten (A4). Optional switch for the wiki-literal reading.
    if not first_time and post_last_account:
        update_account(cur_acct, total_int)

    out_accts = []
    for a in accts:
        out_accts.append({
            "acct_id": a["acct_id"],
            "active_status": a["active_status"],
            "curr_bal": fmt_amount(a["curr_bal"]),
            "credit_limit": fmt_amount(a["credit_limit"]),
            "cash_credit_limit": fmt_amount(a["cash_credit_limit"]),
            "open_date": a["open_date"],
            "expiration_date": a["expiration_date"],
            "reissue_date": a["reissue_date"],
            "curr_cyc_credit": fmt_amount(a["curr_cyc_credit"]),
            "curr_cyc_debit": fmt_amount(a["curr_cyc_debit"]),
            "addr_zip": a["addr_zip"],
            "group_id": a["group_id"].rstrip(),
        })
    return {"systran": systran, "accounts": out_accts, "warnings": warnings,
            "last_account_id": last_acct}
