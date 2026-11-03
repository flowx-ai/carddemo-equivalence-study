# Disguise map D (protocol A5): one mechanical substitution table applied to the INTCALC COBOL sources, the rate
# data, both INTCALC wiki bundles and CONTRACT.md, so that a builder that recalls the public CardDemo source gets no
# cue and, on the five perturbed values, a wrong answer. Writes disguise/d1/ and disguise/d1/map.json (the table).
#   python3 disguise/apply.py            -> disguise/d1/{src,data,bundles,map.json} + residual report
import json, pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "disguise" / "d1"

# --- 1. names -----------------------------------------------------------------------------------------------
PRODUCT = [("CARD-DEMO", "LEDGER-LINE"), ("CARDDEMO", "LEDGERLINE"), ("CardDemo", "Ledgerline"), ("Card Demo", "Ledgerline"),
           ("carddemo", "ledgerline"), ("AWS ", ""), ("AWS.", "LEDGERLINE."), ("aws-", "")]
# JCL steps, datasets, DD names, VSAM files (whole uppercase tokens)
TOKENS = {"INTCALC": "ACCRUE", "POSTTRAN": "POSTDAY", "COMBTRAN": "MERGETXN", "CREASTMT": "MAKESTMT", "TRANREPT": "TXNREPT",
          "TCATBALF": "BALCATF", "TCATBAL": "BALCAT", "DISCGRP": "RATEGRP", "ACCTDAT": "LEDGACC", "ACCTFILE": "LEDGFILE",
          "CARDXREF": "CARDLINK", "XREFFILE": "LINKFILE", "CUSTDAT": "CLNTDAT", "CUSTFILE": "CLNTFILE", "CARDDAT": "CRDDAT",
          "CARDFILE": "CRDFILE", "DALYTRAN": "DAYTXN", "DALYREJS": "DAYREJ", "TRANSACT": "TXNFILE", "TRANFILE": "TXNFILEX",
          "TRANTYPE": "TXNTYPE", "TRANCATG": "TXNCATG", "TRANBKP": "TXNBKUP", "TRANIDX": "TXNIDX", "TRANEXTR": "TXNEXTR",
          "CXACAIX": "LKACAIX", "CARDAIX": "CRDAIX", "STMTFILE": "STMTDS", "HTMLFILE": "HTMLDS", "AUTHFRDS": "AUTHFRD",
          "USRSEC": "OPRSEC", "CLOSEFIL": "CLOSEDS", "OPENFIL": "OPENDS", "CARDDEMOPRODJCL": "LEDGERLINEJCL", "CCXREF": "CCLINK",
          "SYSTRAN": "SYSTXN", "EXPIRAION": "EXPIRY", "DEFAULT": "STANDARD"}
# components of hyphenated COBOL data names (TRAN-CAT-BAL -> TXN-CAT-BAL); applied only inside hyphenated tokens
COMPONENTS = {"TRANCAT": "BCAT", "TRAN": "TXN", "ACCT": "LACC", "XREF": "LINK", "DIS": "RG", "CDEMO": "LLINE",
              "CUST": "CLNT", "CARD": "CRD", "SEC": "OPR", "USR": "OP", "EXPIRAION": "EXPIRY", "DALYTRAN": "DAYTXN"}
# lowercase file / output names (whole words, also inside snake_case names and file names)
LOWER = {"intcalc": "accrue", "posttran": "postday", "combtran": "mergetxn", "creastmt": "makestmt", "tcatbal": "balcat",
         "discgrp": "rategrp", "acctdata": "ledgacc", "cardxref": "cardlink", "dailytran": "daytxn", "custdata": "clntrec",
         "carddata": "crdrec", "trantype": "txntype", "trancatg": "txncatg", "systran": "systxn", "dalyrejs": "dayrej",
         "transact": "txnfile"}
PROGRAM = re.compile(r"(?<![A-Za-z0-9-])((?:CB|CO|CS|CV|CI|CU)[A-Z]{1,4}[0-9][A-Z0-9]{0,3}|CUSTREC|PAUTSUM0|PAUTDTL1|DUSRSECJ|"
                     r"MNTTRDB2|COBSWAIT|COBTUPDT|COSTM01|RUNPARM|CEE3ABD)(?![A-Za-z0-9-])")

# --- 2. behaviour perturbations (source and every wiki statement of them) -------------------------------------
COBOL_PERTURB = [("MOVE '01'                 TO TXN-TYPE-CD", "MOVE '07'                 TO TXN-TYPE-CD"),
                 ("MOVE '05'                 TO TXN-CAT-CD", "MOVE '12'                 TO TXN-CAT-CD"),
                 ("MOVE 'System'             TO TXN-SOURCE", "MOVE 'Batch'              TO TXN-SOURCE"),
                 ("'Int. for a/c '", "'Accrued int '")]       # 'DEFAULT' -> 'STANDARD' comes from TOKENS
WIKI_PERTURB = [("type `01`, category `05`, source `System`, description `Int. for a/c <accountId>`",
                 "type `07`, category `12`, source `Batch`, description `Accrued int <accountId>`"),
                ("System transaction type 01, category 05", "Batch transaction type 07, category 12"),
                ("posts a system transaction (type 01, category 05)", "posts a batch transaction (type 07, category 12)")]

names = {}
def program(m):
    t = m.group(1)
    if t not in names: names[t] = None
    return f"@@P{t}@@"

def disguise(text, cobol=False):
    for a, b in (WIKI_PERTURB if not cobol else []): text = text.replace(a, b)
    for a, b in PRODUCT: text = text.replace(a, b)
    text = PROGRAM.sub(program, text)
    def hyph(m):
        tok = m.group(0)
        if tok in TOKENS: return TOKENS[tok]
        if "-" not in tok: return tok
        return "-".join(TOKENS.get(c, COMPONENTS.get(c, c)) for c in tok.split("-"))
    text = re.sub(r"(?<![A-Za-z0-9@])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*(?![A-Za-z0-9@])", hyph, text)
    text = re.sub(r"(?<![A-Za-z0-9])(" + "|".join(sorted(LOWER, key=len, reverse=True)) + r")(?![a-z])",
                  lambda m: LOWER[m.group(1)], text)
    if cobol:
        for a, b in COBOL_PERTURB: text = text.replace(a, b)
    return text

def finish(text):  # program pseudonyms: sorted order -> stable, length-preserving-ish names
    order = {t: f"LX{['B','O','S','V','I','U'][['CB','CO','CS','CV','CI','CU'].index(t[:2])] if t[:2] in ['CB','CO','CS','CV','CI','CU'] else 'Z'}{i:03d}{t[-1]}"
             for i, t in enumerate(sorted(names))}
    return re.sub(r"@@P([A-Z0-9]+)@@", lambda m: order[m.group(1)], text), order

# --- 3. apply ---------------------------------------------------------------------------------------------------
if OUT.exists(): shutil.rmtree(OUT)
staged = {}
SRC = ["CBACT04C.cbl", "RUNPARM.cbl", "CEE3ABD.cbl", "CVTRA01Y.cpy", "CVTRA02Y.cpy", "CVACT01Y.cpy", "CVACT03Y.cpy", "CVTRA05Y.cpy"]
for f in SRC:
    staged[("src", f)] = disguise((ROOT / "src" / f).read_text(errors="replace"), cobol=True)
for wiki in ("sonnet", "opus"):
    b = ROOT / "builds/inputs" / f"intcalc-{wiki}"
    for p in sorted(b.rglob("*.md")):
        staged[("bundles", f"accrue-{wiki}/{p.relative_to(b)}")] = disguise(p.read_text())
data = {"base": ROOT / "data/in"} | {c: ROOT / "cases" / c / "in" for c in ("c01", "c02", "c03", "c04")}
for k, d in data.items():
    for f in ("discgrp.dat",):
        staged[("data", f"{k}/rategrp.dat")] = re.sub(r"^DEFAULT   ", "STANDARD  ", (d / f).read_text(), flags=re.M)

for (kind, rel), text in staged.items():
    text, order = finish(text)
    if kind == "src":   # copybook / program files take their pseudonym as file name
        stem, ext = rel.rsplit(".", 1); rel = f"{order.get(stem, stem)}.{ext}"
    p = OUT / kind / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text)

_, order = finish("")
(OUT / "map.json").write_text(json.dumps({"product": PRODUCT, "tokens": TOKENS, "components": COMPONENTS, "lower": LOWER,
    "programs": order, "cobol_perturbations": COBOL_PERTURB, "wiki_perturbations": WIKI_PERTURB,
    "data": "rate rows: group 'DEFAULT   ' -> 'STANDARD  '"}, indent=1))

# --- 4. residual check: no CardDemo fingerprint left, every perturbation landed ----------------------------------
FP = re.compile(r"CardDemo|carddemo|CARDDEMO|\bAWS\b|CBACT|CVTRA|CVACT|CBTRN|INTCALC|POSTTRAN|TCATBAL|DISCGRP|EXPIRAION|"
                r"\bDEFAULT\b|Int\. for a/c|source `System`|ACCTDAT|CARDXREF|DALYTRAN|intcalc|posttran|tcatbal|discgrp|acctdata|cardxref")
bad = [(str(p.relative_to(OUT)), i + 1, l.strip()[:120]) for p in OUT.rglob("*") if p.is_file() and p.name != "map.json"
       for i, l in enumerate(p.read_text(errors="replace").split("\n")) if FP.search(l)]
print(f"programs renamed: {len(order)}; files written: {sum(1 for p in OUT.rglob('*') if p.is_file())}; residual fingerprints: {len(bad)}")
for b in bad[:40]: print("  ", *b)
src = (OUT / "src" / f"{order['CBACT04C']}.cbl").read_text()
for a, b in COBOL_PERTURB + [("", "'STANDARD'")]:
    if b not in src: print("  MISSING cobol perturbation:", b)
for w in ("sonnet",):
    t = "".join(p.read_text() for p in (OUT / "bundles" / f"accrue-{w}").rglob("*.md"))
    for a, b in WIKI_PERTURB:
        if b not in t: print(f"  MISSING wiki perturbation ({w}):", b[:60])
