# Workflow: ui_bill_payment

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** COBIL00C bill payment: validate account, confirm, write payment transaction and zero the balance. Returns UI state keys.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae399fe3695c563ea50ef75 | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae39a0d3695c563ea50ef7c | <uuid> | (500, 0) | → Read needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Read needed? | FORK | 6ae39a103695c563ea50ef7d | <uuid> | (1000, 0) | → Read ACCTDAT [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read ACCTDAT | DATA_SOURCE | 6ae39a143695c563ea50ef80 | <uuid> | (1500, 0) | → Evaluate confirm [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: acctRes, endpoint: <uuid> |
| Evaluate confirm | SCRIPT | 6ae39a153695c563ea50ef81 | <uuid> | (2000, 0) | → Pay? (seq:<uuid>) | lang: JAVASCRIPT |
| Pay? | FORK | 6ae39a163695c563ea50ef82 | <uuid> | (2500, 0) | → Read CXACAIX [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read CXACAIX | DATA_SOURCE | 6ae39a183695c563ea50ef85 | <uuid> | (3000, 0) | → Read last TRANSACT [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: xrefRes, endpoint: <uuid> |
| Read last TRANSACT | DATA_SOURCE | 6ae39a193695c563ea50ef88 | <uuid> | (3500, 0) | → Build transaction [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: lastRes, endpoint: <uuid> |
| Build transaction | SCRIPT | 6ae39a1b3695c563ea50ef8b | <uuid> | (4000, 0) | → Write TRANSACT (seq:<uuid>) | lang: JAVASCRIPT |
| Write TRANSACT | DATA_SOURCE | 6ae39a1c3695c563ea50ef8e | <uuid> | (4500, 0) | → Update ACCTDAT [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: insRes, endpoint: <uuid> |
| Update ACCTDAT | DATA_SOURCE | 6ae39a1d3695c563ea50ef8f | <uuid> | (5000, 0) | → Check update [SUCCESS] (seq:<uuid>), → Check update [FAIL] (seq:<uuid>) | responseKey: updRes, endpoint: <uuid> |
| Check update | SCRIPT | 6ae39a1f3695c563ea50ef90 | <uuid> | (5500, 0) | → Undo needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Undo needed? | FORK | 6ae39a203695c563ea50ef91 | <uuid> | (6000, 0) | → Delete TRANSACT (compensate) [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Delete TRANSACT (compensate) | DATA_SOURCE | 6ae39a213695c563ea50ef94 | <uuid> | (6500, 300) | → End [SUCCESS] (seq:<uuid>), → End [FAIL] (seq:<uuid>) | responseKey: undoRes, endpoint: <uuid> |
| File error | SCRIPT | 6ae39a233695c563ea50ef95 | <uuid> | (6500, 600) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae39a243695c563ea50ef96 | <uuid> | (7000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read ACCTDAT, Update ACCTDAT
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read CXACAIX
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read last TRANSACT, Write TRANSACT, Delete TRANSACT (compensate)

## Scripts

### Validate input (SCRIPT, id=6ae39a0d3695c563ea50ef7c)

```javascript
// COBIL00C PROCESS-ENTER-KEY. Input: type (pay | clear | back), acctId, confirm
var type = input.type ? String(input.type) : "pay";
var raw = input.acctId == null ? "" : String(input.acctId).trim();
var conf = input.confirm == null ? "" : String(input.confirm).trim();
var cleared = { screen: "BILL_PAYMENT", billAcctId: "", billConfirm: "", billBalance: "", billMessage: "", billMessageKind: "" };
function err(msg) {
  return { screen: "BILL_PAYMENT", billAcctId: raw, billConfirm: conf, billBalance: "", billMessage: msg, billMessageKind: "error" };
}
output.route = "END";
if (type === "back") {
  // F3 returns to the calling menu
  output.ui = { screen: "MAIN_MENU", menuMessage: "", menuSelection: "",
                billAcctId: "", billConfirm: "", billBalance: "", billMessage: "", billMessageKind: "" };
} else if (type === "clear") {
  // F4 clears the screen
  output.ui = cleared;
} else if (raw === "") {
  output.ui = err("Acct ID can NOT be empty...");
} else if (conf === "N" || conf === "n") {
  // N: clear the screen, nothing is paid
  output.ui = cleared;
} else if (conf !== "" && conf !== "Y" && conf !== "y") {
  output.ui = err("Invalid value. Valid values are (Y/N)...");
} else if (!/^[0-9]{1,11}$/.test(raw)) {
  // A key that is not numeric can never be on ACCTDAT
  output.ui = err("Account ID NOT found...");
} else {
  output.route = "READ";
  output.mode = (conf === "") ? "ASK" : "PAY";
  output.acctKey = raw;
  output.confKey = conf;
  output.acctNum = parseInt(raw, 10);
}
```

### Read needed? (FORK, id=6ae39a103695c563ea50ef7d)
  0. [IF] input.route == "READ"  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Evaluate confirm (SCRIPT, id=6ae39a153695c563ea50ef81)

```javascript
// COBIL00C after READ-ACCTDAT-FILE: not found, nothing to pay, ask for confirmation, or pay
function money(v) {
  var n = Number(v == null ? 0 : v); var neg = n < 0; n = Math.abs(n);
  var parts = n.toFixed(2).split(".");
  return (neg ? "-$ " : "$ ") + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1];
}
var a = (input.acctRes && input.acctRes.data && input.acctRes.data.acct_id != null) ? input.acctRes.data : null;
output.route = "END";
if (!a) {
  output.ui = { screen: "BILL_PAYMENT", billAcctId: input.acctKey, billConfirm: input.confKey, billBalance: "",
                billMessage: "Account ID NOT found...", billMessageKind: "error" };
} else {
  var bal = Number(a.curr_bal == null ? 0 : a.curr_bal);
  var shown = money(bal);
  if (bal <= 0) {
    output.ui = { screen: "BILL_PAYMENT", billAcctId: input.acctKey, billConfirm: input.confKey, billBalance: shown,
                  billMessage: "You have nothing to pay...", billMessageKind: "error" };
  } else if (input.mode === "ASK") {
    output.ui = { screen: "BILL_PAYMENT", billAcctId: input.acctKey, billConfirm: "", billBalance: shown,
                  billMessage: "Confirm to make a bill payment...", billMessageKind: "info" };
  } else {
    output.route = "PAY";
    output.oldBal = bal;
    output.newBal = Math.round((bal - bal) * 100) / 100;
    output.balShown = shown;
  }
}
```

### Pay? (FORK, id=6ae39a163695c563ea50ef82)
  0. [IF] input.route == "PAY"  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Build transaction (SCRIPT, id=6ae39a1b3695c563ea50ef8b)

```javascript
// COBIL00C: card number from the xref, tran id = highest tran id + 1, payment transaction record
function first(res) {
  var d = res ? res.data : null;
  if (d == null) return null;
  if (d.length !== undefined) return d.length > 0 ? d[0] : null;
  return d;
}
function incr(s) {
  // decimal string + 1 without losing precision on 16 digits
  var digits = s.replace(/[^0-9]/g, ""); if (digits === "") digits = "0";
  var out = ""; var carry = 1;
  for (var i = digits.length - 1; i >= 0; i--) {
    var d = digits.charCodeAt(i) - 48 + carry;
    carry = d > 9 ? 1 : 0; out = String(d % 10) + out;
  }
  if (carry) out = "1" + out;
  while (out.length < 16) out = "0" + out;
  return out;
}
function p2(n) { return n < 10 ? "0" + n : String(n); }
var x = first(input.xrefRes);
var last = first(input.lastRes);
var tranId = incr(last && last.tran_id != null ? String(last.tran_id) : "0");
var now = new Date();
var ms = String(now.getUTCMilliseconds()); while (ms.length < 3) ms = "0" + ms;
var ts = now.getUTCFullYear() + "-" + p2(now.getUTCMonth() + 1) + "-" + p2(now.getUTCDate()) + " " +
         p2(now.getUTCHours()) + ":" + p2(now.getUTCMinutes()) + ":" + p2(now.getUTCSeconds()) + "." + ms + "000";
output.tranId = tranId;
output.tran = {
  tran_id: tranId,
  type_cd: "02",
  cat_cd: 2,
  source: "POS TERM",
  desc: "BILL PAYMENT - ONLINE",
  amt: input.oldBal,
  merchant_id: 999999999,
  merchant_name: "BILL PAYMENT",
  merchant_city: "N/A",
  merchant_zip: "N/A",
  card_num: x && x.card_num != null ? String(x.card_num) : "",
  orig_ts: ts,
  proc_ts: ts
};
```

### Check update (SCRIPT, id=6ae39a1f3695c563ea50ef90)

```javascript
// UPDATE-ACCTDAT-FILE result. The update only matches while the balance is still the one read,
// so 0 documents modified means the account changed (or the update failed): undo the transaction.
var r = input.updRes;
var d = (r && r.data != null) ? r.data : r;
var n = null;
if (d != null && typeof d === "object") {
  var keys = ["modifiedCount", "matchedCount", "nModified", "n", "count"];
  for (var i = 0; i < keys.length && n == null; i++) if (d[keys[i]] != null) n = Number(d[keys[i]]);
} else if (d != null) { n = Number(d); }
if (n != null && n > 0) {
  output.route = "END";
  // Success: fields re-initialised, confirmation in green
  output.ui = { screen: "BILL_PAYMENT", billAcctId: "", billConfirm: "", billBalance: "",
                billMessage: "Payment successful. Your Transaction ID is " + input.tranId + ".", billMessageKind: "success" };
} else {
  output.route = "UNDO";
  output.ui = { screen: "BILL_PAYMENT", billAcctId: input.acctKey, billConfirm: input.confKey, billBalance: input.balShown,
                billMessage: "Unable to Update Account...", billMessageKind: "error" };
}
```

### Undo needed? (FORK, id=6ae39a203695c563ea50ef91)
  0. [IF] input.route == "UNDO"  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### File error (SCRIPT, id=6ae39a233695c563ea50ef95)

```javascript
// Store errors other than not-found, with the COBIL00C message of the step that failed
function has(r) { return r != null && r.data != null; }
var msg;
if (!has(input.acctRes)) msg = "Unable to lookup Account...";
else if (!has(input.xrefRes)) msg = "Unable to lookup XREF AIX file...";
else if (!has(input.lastRes)) msg = "Unable to lookup Transaction...";
else msg = "Unable to Add Bill pay Transaction...";
output.ui = { screen: "BILL_PAYMENT", billAcctId: input.acctKey, billConfirm: input.confKey,
              billBalance: input.balShown ? input.balShown : "", billMessage: msg, billMessageKind: "error" };
```

## Data source bindings

### Read ACCTDAT (DATA_SOURCE, id=6ae39a143695c563ea50ef80)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctRes
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctNum}`

### Read CXACAIX (DATA_SOURCE, id=6ae39a183695c563ea50ef85)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefRes
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctNum}`

### Read last TRANSACT (DATA_SOURCE, id=6ae39a193695c563ea50ef88)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** findLastTran — flowxUuid <uuid>
- **responseKey:** lastRes
- **variables:** _(none bound)_

### Write TRANSACT (DATA_SOURCE, id=6ae39a1c3695c563ea50ef8e)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insertTran — flowxUuid <uuid>
- **responseKey:** insRes
- **variables:**
  - tran [DB operation param] <uuid> ← `${tran}`

### Update ACCTDAT (DATA_SOURCE, id=6ae39a1d3695c563ea50ef8f)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** updateBalance — flowxUuid <uuid>
- **responseKey:** updRes
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctNum}`
  - expectedBal [DB operation param] <uuid> ← `${oldBal}`
  - newBal [DB operation param] <uuid> ← `${newBal}`

### Delete TRANSACT (compensate) (DATA_SOURCE, id=6ae39a213695c563ea50ef94)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** deleteTranById — flowxUuid <uuid>
- **responseKey:** undoRes
- **variables:**
  - tranId [DB operation param] <uuid> ← `${tranId}`

_(server: 624 ms, 5 API calls, 619 ms in API)_
