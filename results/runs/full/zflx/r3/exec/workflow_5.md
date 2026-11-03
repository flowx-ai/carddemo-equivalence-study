# Workflow: batch_cbimport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Customer data import (CBIMPORT). Input export (JSON list). Outputs import_customers/accounts/card_xref/transactions/cards, import_errors, import_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902793695c563ea51c07e | <uuid> | (0, 0) | → Import (seq:<uuid>) |
| Import | SCRIPT | 6ae902883695c563ea51c089 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae902963695c563ea51c094 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Import (SCRIPT, id=6ae902883695c563ea51c089)

```javascript
// ---- common helpers ----
function getIn(base) {
  var names = [base, base + "_dat", base + ".dat", base + "_txt", base + ".txt", base + "_json", base + ".json"];
  for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; }
  var f = input.files; if (f) { for (var j = 0; j < names.length; j++) { var w = f[names[j]]; if (w !== undefined && w !== null) return w; } }
  return null;
}
var R = {};
function finish(step, sysout, rc) { R[step + "_sysout"] = sysout; if (rc) R[step + "_rc"] = rc; output.result = R; }
// ---- end common ----

// CBIMPORT - split export records into one list per record type; unknown types to the error output
var sysout = ["CBIMPORT: Starting Customer Data Import"];
var FIELDS = {
  C: ["cust_id", "first_name", "middle_name", "last_name", "addr_line_1", "addr_line_2", "addr_line_3", "addr_state_cd", "addr_country_cd", "addr_zip",
    "phone_num_1", "phone_num_2", "ssn", "govt_issued_id", "dob", "eft_account_id", "pri_card_holder_ind", "fico_credit_score"],
  A: ["acct_id", "active_status", "curr_bal", "credit_limit", "cash_credit_limit", "open_date", "expiration_date", "reissue_date", "curr_cyc_credit",
    "curr_cyc_debit", "addr_zip", "group_id"],
  X: ["card_num", "cust_id", "acct_id"],
  T: ["tran_id", "type_cd", "cat_cd", "source", "desc", "amt", "merchant_id", "merchant_name", "merchant_city", "merchant_zip", "card_num", "orig_ts", "proc_ts"],
  D: ["card_num", "acct_id", "cvv_cd", "embossed_name", "expiration_date", "active_status"]
};
var OUT = { C: "import_customers", A: "import_accounts", X: "import_card_xref", T: "import_transactions", D: "import_cards" };
var lists = { C: [], A: [], X: [], T: [], D: [] }, errors = [], total = 0, rc = 0;
var src = getIn("export");
if (src === null) { sysout.push("CBIMPORT: Error opening export file"); sysout.push("FILE STATUS IS: NNNN0035"); sysout.push("ABENDING PROGRAM"); rc = 999; }
else {
  if (typeof src === "string" || src instanceof String) src = JSON.parse(String(src));
  for (var i = 0; i < src.length; i++) {
    var r = src[i]; total++;
    var t = (r.rec_type === undefined || r.rec_type === null) ? "" : String(r.rec_type);
    if (FIELDS[t]) { var o = {}, f = FIELDS[t]; for (var j = 0; j < f.length; j++) o[f[j]] = (r[f[j]] === undefined) ? null : r[f[j]]; lists[t].push(o); }
    else errors.push({ rec_type: t, seq: (r.seq === undefined || r.seq === null) ? null : parseInt(r.seq, 10), message: "Unknown record type encountered" });
  }
  sysout.push("CBIMPORT: Total Records Read: " + total);
  sysout.push("CBIMPORT: Customers Imported: " + lists.C.length);
  sysout.push("CBIMPORT: Accounts Imported: " + lists.A.length);
  sysout.push("CBIMPORT: Cross-references Imported: " + lists.X.length);
  sysout.push("CBIMPORT: Transactions Imported: " + lists.T.length);
  sysout.push("CBIMPORT: Cards Imported: " + lists.D.length);
  sysout.push("CBIMPORT: Errors Found: " + errors.length);
  sysout.push("CBIMPORT: Import completed");
}
for (var k in OUT) R[OUT[k]] = lists[k];
R.import_errors = errors;
finish("import", sysout, rc);
```

_(server: 159 ms, 1 API call, 156 ms in API)_
