# Workflow: ui_bill_payment

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo COBIL00C bill payment: pay full balance (Y/N confirm), clear, back.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3a50e3695c563ea50f88a | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae3a5113695c563ea50f88d | <uuid> | (500, 0) | → Lookup needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Lookup needed? | FORK | 6ae3a5143695c563ea50f88e | <uuid> | (1000, 0) | → Read ACCTDAT [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read ACCTDAT | DATA_SOURCE | 6ae3a5163695c563ea50f88f | <uuid> | (1500, 0) | → Decide [SUCCESS] (seq:<uuid>), → Payment error [FAIL] (seq:<uuid>) | responseKey: acctRecord, endpoint: <uuid> |
| Decide | SCRIPT | 6ae3a5173695c563ea50f892 | <uuid> | (2000, 0) | → Pay? (seq:<uuid>) | lang: JAVASCRIPT |
| Pay? | FORK | 6ae3a5183695c563ea50f893 | <uuid> | (2500, 0) | → Read CXACAIX [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read CXACAIX | DATA_SOURCE | 6ae3a51a3695c563ea50f894 | <uuid> | (3000, 0) | → Read last TRANSACT [SUCCESS] (seq:<uuid>), → Payment error [FAIL] (seq:<uuid>) | responseKey: xrefRecords, endpoint: <uuid> |
| Read last TRANSACT | DATA_SOURCE | 6ae3a51b3695c563ea50f897 | <uuid> | (3500, 0) | → Build transaction [SUCCESS] (seq:<uuid>), → Payment error [FAIL] (seq:<uuid>) | responseKey: lastTran, endpoint: <uuid> |
| Build transaction | SCRIPT | 6ae3a51d3695c563ea50f898 | <uuid> | (4000, 0) | → Ready to post? (seq:<uuid>) | lang: JAVASCRIPT |
| Ready to post? | FORK | 6ae3a51e3695c563ea50f899 | <uuid> | (4500, 0) | → Update ACCTDAT balance [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Update ACCTDAT balance | DATA_SOURCE | 6ae3a51f3695c563ea50f89a | <uuid> | (5000, 0) | → Balance updated? [SUCCESS] (seq:<uuid>), → Payment error [FAIL] (seq:<uuid>) | responseKey: balanceUpdate, endpoint: <uuid> |
| Balance updated? | FORK | 6ae3a5203695c563ea50f89b | <uuid> | (5500, 0) | → Write TRANSACT [cond:<uuid>] (seq:<uuid>), → Payment error [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Write TRANSACT | DATA_SOURCE | 6ae3a5223695c563ea50f89e | <uuid> | (6000, 0) | → Payment done [SUCCESS] (seq:<uuid>), → Restore balance [FAIL] (seq:<uuid>) | responseKey: tranInsert, endpoint: <uuid> |
| Payment done | SCRIPT | 6ae3a5233695c563ea50f89f | <uuid> | (6500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Restore balance | DATA_SOURCE | 6ae3a5243695c563ea50f8a2 | <uuid> | (6000, 300) | → Payment error [SUCCESS] (seq:<uuid>), → Payment error [FAIL] (seq:<uuid>) | responseKey: balanceRestore, endpoint: <uuid> |
| Payment error | SCRIPT | 6ae3a5263695c563ea50f8a3 | <uuid> | (6500, 300) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae3a5263695c563ea50f8a4 | <uuid> | (7000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read ACCTDAT, Update ACCTDAT balance, Restore balance
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read CXACAIX
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read last TRANSACT, Write TRANSACT

## Scripts

### Validate input (SCRIPT, id=6ae3a5113695c563ea50f88d)

```javascript
// COBIL00C: PF3 (back), PF4 (clear) and the first half of PROCESS-ENTER-KEY (account id + confirm edits).
function str(v) { return v == null ? "" : String(v); }
var acctIn = str(input.acctIdInput).trim();
var confirm = str(input.confirm).trim();
output.lookupAcctId = 0;
output.payRequested = false;
output.enteredAcctId = acctIn;

function bill(o) {
  return { acctIdInput: o.acctIdInput || "", balance: o.balance || "", confirm: o.confirm || "",
           error: o.error || "", prompt: o.prompt || "", success: o.success || "" };
}

var type = str(input.type);
if (type === "back") {
  output.result = { screen: "MAIN_MENU", menu: { option: "", message: "" }, bill: bill({}) };
} else if (type === "clear") {
  output.result = { screen: "BILL_PAYMENT", bill: bill({}) };
} else if (acctIn === "") {
  output.result = { screen: "BILL_PAYMENT", bill: bill({ confirm: confirm, error: "Acct ID can NOT be empty..." }) };
} else if (confirm === "N" || confirm === "n") {
  // CLEAR-CURRENT-SCREEN, no message.
  output.result = { screen: "BILL_PAYMENT", bill: bill({}) };
} else if (confirm !== "" && confirm !== "Y" && confirm !== "y") {
  output.result = { screen: "BILL_PAYMENT", bill: bill({ acctIdInput: acctIn, confirm: confirm,
    error: "Invalid value. Valid values are (Y/N)..." }) };
} else if (!/^[0-9]{1,11}$/.test(acctIn) || parseInt(acctIn, 10) === 0) {
  // A key that cannot exist reads as NOTFND in the legacy program.
  output.result = { screen: "BILL_PAYMENT", bill: bill({ acctIdInput: acctIn, confirm: confirm, error: "Account ID NOT found..." }) };
} else {
  output.lookupAcctId = parseInt(acctIn, 10);
  output.payRequested = (confirm === "Y" || confirm === "y");
  output.result = { screen: "BILL_PAYMENT", bill: bill({ acctIdInput: acctIn, confirm: confirm }) };
}
```

### Lookup needed? (FORK, id=6ae3a5143695c563ea50f88e)
  0. [IF] input.lookupAcctId != null && input.lookupAcctId > 0  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Decide (SCRIPT, id=6ae3a5173695c563ea50f892)

```javascript
// COBIL00C after READ-ACCTDAT-FILE: not found, balance display, nothing-to-pay, confirm prompt or pay.
function str(v) { return v == null ? "" : String(v); }
function money(v) {
  var n = Number(v == null || v === "" ? 0 : v);
  var neg = n < 0; n = Math.abs(n);
  var parts = n.toFixed(2).split(".");
  return (neg ? "-$ " : "$ ") + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1];
}
var acctIn = str(input.enteredAcctId);
var confirm = input.payRequested === true ? "Y" : "";
var acct = input.acctRecord && input.acctRecord.data;
output.doPay = false;

function bill(o) {
  return { acctIdInput: acctIn, balance: o.balance || "", confirm: o.confirm == null ? confirm : o.confirm,
           error: o.error || "", prompt: o.prompt || "", success: "" };
}

if (!acct || acct.acct_id == null) {
  output.result = { screen: "BILL_PAYMENT", bill: bill({ error: "Account ID NOT found..." }) };
} else {
  var bal = Number(acct.curr_bal == null ? 0 : acct.curr_bal);
  var shown = money(bal);
  if (bal <= 0) {
    output.result = { screen: "BILL_PAYMENT", bill: bill({ balance: shown, error: "You have nothing to pay..." }) };
  } else if (input.payRequested === true) {
    // Payment amount is always the full current balance (no partial payment).
    output.doPay = true;
    output.oldBal = bal;
    output.payAmount = bal;
    output.newBal = Math.round((bal - bal) * 100) / 100;
    output.result = { screen: "BILL_PAYMENT", bill: bill({ balance: shown }) };
  } else {
    output.result = { screen: "BILL_PAYMENT", bill: bill({ balance: shown, prompt: "Confirm to make a bill payment..." }) };
  }
}
```

### Pay? (FORK, id=6ae3a5183695c563ea50f893)
  0. [IF] input.doPay === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Build transaction (SCRIPT, id=6ae3a51d3695c563ea50f898)

```javascript
// COBIL00C: card from CXACAIX, next transaction id = highest TRAN-ID + 1, bill-payment transaction record.
function str(v) { return v == null ? "" : String(v); }
function pad(v, n) { var s = str(v); while (s.length < n) s = "0" + s; return s; }
function two(n) { return n < 10 ? "0" + n : "" + n; }
// Decimal-string increment: 16-digit ids exceed JavaScript's exact integer range.
function incr(s) {
  var d = s.split(""), i = d.length - 1, carry = 1;
  while (i >= 0 && carry) { var x = d[i].charCodeAt(0) - 48 + carry; carry = x > 9 ? 1 : 0; d[i] = String.fromCharCode(48 + (x % 10)); i--; }
  return (carry ? "1" : "") + d.join("");
}
output.ready = false;
var xref = input.xrefRecords && input.xrefRecords.data;
if (!xref || xref.length === 0 || !xref[0].card_num) {
  var prev = input.result && input.result.bill ? input.result.bill : {};
  output.result = { screen: "BILL_PAYMENT", bill: { acctIdInput: str(input.enteredAcctId), balance: str(prev.balance),
    confirm: "Y", error: "Account ID NOT found...", prompt: "", success: "" } };
} else {
  var last = input.lastTran && input.lastTran.data && input.lastTran.data.length > 0 ? str(input.lastTran.data[0].tran_id) : "";
  var digits = last.replace(/[^0-9]/g, "");
  if (digits === "") digits = "0";
  var tranId = pad(incr(digits), 16);
  var d = new Date();
  var ts = d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1) + "-" + two(d.getUTCDate()) + " " +
           two(d.getUTCHours()) + ":" + two(d.getUTCMinutes()) + ":" + two(d.getUTCSeconds()) + ".000000";
  output.tranId = tranId;
  output.tran = {
    tran_id: tranId,
    type_cd: "02",
    cat_cd: 2,
    source: "POS TERM",
    desc: "BILL PAYMENT - ONLINE",
    amt: input.payAmount,
    merchant_id: 999999999,
    merchant_name: "BILL PAYMENT",
    merchant_city: "N/A",
    merchant_zip: "N/A",
    card_num: str(xref[0].card_num),
    orig_ts: ts,
    proc_ts: ts
  };
  output.ready = true;
}
```

### Ready to post? (FORK, id=6ae3a51e3695c563ea50f899)
  0. [IF] input.ready === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Balance updated? (FORK, id=6ae3a5203695c563ea50f89b)
  0. [IF] input.balanceUpdate != null && input.balanceUpdate.data != null && input.balanceUpdate.data.matchedCount == 1  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Payment done (SCRIPT, id=6ae3a5233695c563ea50f89f)

```javascript
// COBIL00C success: fields initialised, confirmation with the new transaction id.
output.result = { screen: "BILL_PAYMENT", bill: { acctIdInput: "", balance: "", confirm: "", error: "", prompt: "",
  success: "Payment successful. Your Transaction ID is " + input.tranId + "." } };
output.acctRecord = null; output.xrefRecords = null; output.lastTran = null; output.tran = null;
```

### Payment error (SCRIPT, id=6ae3a5263695c563ea50f8a3)

```javascript
// A store call failed, or the balance changed between read and update. Messages follow COBIL00C's per-file errors.
function str(v) { return v == null ? "" : String(v); }
function has(k) { return input[k] != null && input[k].data != null; }
var msg;
if (!has("acctRecord")) msg = "Unable to lookup Account...";
else if (!has("xrefRecords")) msg = "Unable to lookup XREF AIX file...";
else if (!has("lastTran")) msg = "Unable to lookup Transaction...";
else if (!has("balanceUpdate") || input.balanceUpdate.data.matchedCount != 1) msg = "Unable to Update Account...";
else msg = "Unable to Add Bill pay Transaction...";
var prev = input.result && input.result.bill ? input.result.bill : {};
output.result = { screen: "BILL_PAYMENT", bill: { acctIdInput: str(input.enteredAcctId), balance: str(prev.balance),
  confirm: "", error: msg, prompt: "", success: "" } };
```

## Data source bindings

### Read ACCTDAT (DATA_SOURCE, id=6ae3a5163695c563ea50f88f)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctRecord
- **variables:**
  - acctId [DB operation param] <uuid> ← `${lookupAcctId}`

### Read CXACAIX (DATA_SOURCE, id=6ae3a51a3695c563ea50f894)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefRecords
- **variables:**
  - acctId [DB operation param] <uuid> ← `${lookupAcctId}`

### Read last TRANSACT (DATA_SOURCE, id=6ae3a51b3695c563ea50f897)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** findLastTransaction — flowxUuid <uuid>
- **responseKey:** lastTran
- **variables:** _(none bound)_

### Update ACCTDAT balance (DATA_SOURCE, id=6ae3a51f3695c563ea50f89a)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** setBalanceIfUnchanged — flowxUuid <uuid>
- **responseKey:** balanceUpdate
- **variables:**
  - acctId [DB operation param] <uuid> ← `${lookupAcctId}`
  - expectedBal [DB operation param] <uuid> ← `${oldBal}`
  - newBal [DB operation param] <uuid> ← `${newBal}`

### Write TRANSACT (DATA_SOURCE, id=6ae3a5223695c563ea50f89e)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insertTransaction — flowxUuid <uuid>
- **responseKey:** tranInsert
- **variables:**
  - tran [DB operation param] <uuid> ← `${tran}`

### Restore balance (DATA_SOURCE, id=6ae3a5243695c563ea50f8a2)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** setBalanceIfUnchanged — flowxUuid <uuid>
- **responseKey:** balanceRestore
- **variables:**
  - acctId [DB operation param] <uuid> ← `${lookupAcctId}`
  - expectedBal [DB operation param] <uuid> ← `${newBal}`
  - newBal [DB operation param] <uuid> ← `${oldBal}`

_(server: 583 ms, 5 API calls, 578 ms in API)_
