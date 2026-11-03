# Workflow: ui_bill_payment

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo bill payment (COBIL00C): validate, show balance, confirm Y/N, pay full balance (update balance + write transaction).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae44f5c3695c563ea512282 | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae44f613695c563ea512283 | <uuid> | (500, 0) | → Read account? (seq:<uuid>) | lang: JAVASCRIPT |
| Read account? | FORK | 6ae44f623695c563ea512284 | <uuid> | (1000, 0) | → Read account [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read account | DATA_SOURCE | 6ae44f643695c563ea512285 | <uuid> | (1500, 0) | → Read xref [SUCCESS] (seq:<uuid>), → Read xref [FAIL] (seq:<uuid>) | responseKey: acctRec, endpoint: <uuid> |
| Read xref | DATA_SOURCE | 6ae44f653695c563ea512288 | <uuid> | (2000, 0) | → Decide [SUCCESS] (seq:<uuid>), → Decide [FAIL] (seq:<uuid>) | responseKey: xrefRec, endpoint: <uuid> |
| Decide | SCRIPT | 6ae44f663695c563ea512289 | <uuid> | (2500, 0) | → Pay? (seq:<uuid>) | lang: JAVASCRIPT |
| Pay? | FORK | 6ae44f683695c563ea51228a | <uuid> | (3000, 0) | → Read last transaction [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read last transaction | DATA_SOURCE | 6ae44f693695c563ea51228d | <uuid> | (3500, 0) | → Build transaction [SUCCESS] (seq:<uuid>), → Build transaction [FAIL] (seq:<uuid>) | responseKey: lastTranRec, endpoint: <uuid> |
| Build transaction | SCRIPT | 6ae44f6a3695c563ea51228e | <uuid> | (4000, 0) | → Update balance (seq:<uuid>) | lang: JAVASCRIPT |
| Update balance | DATA_SOURCE | 6ae44f6c3695c563ea51228f | <uuid> | (4500, 0) | → Check update [SUCCESS] (seq:<uuid>), → Check update [FAIL] (seq:<uuid>) | responseKey: updRec, endpoint: <uuid> |
| Check update | SCRIPT | 6ae44f6d3695c563ea512290 | <uuid> | (5000, 0) | → Updated? (seq:<uuid>) | lang: JAVASCRIPT |
| Updated? | FORK | 6ae44f6e3695c563ea512291 | <uuid> | (5500, 0) | → Insert transaction [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Insert transaction | DATA_SOURCE | 6ae44f6f3695c563ea512292 | <uuid> | (6000, 0) | → Payment done [SUCCESS] (seq:<uuid>), → Restore balance [FAIL] (seq:<uuid>) | responseKey: insRec, endpoint: <uuid> |
| Payment done | SCRIPT | 6ae44f713695c563ea512293 | <uuid> | (6500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Restore balance | DATA_SOURCE | 6ae44f723695c563ea512294 | <uuid> | (6000, 300) | → Insert failed [SUCCESS] (seq:<uuid>), → Insert failed [FAIL] (seq:<uuid>) | responseKey: restoreRec, endpoint: <uuid> |
| Insert failed | SCRIPT | 6ae44f733695c563ea512295 | <uuid> | (6500, 300) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae44f743695c563ea512296 | <uuid> | (7000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read account, Update balance, Restore balance
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read xref
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read last transaction, Insert transaction

## Scripts

### Validate input (SCRIPT, id=6ae44f613695c563ea512283)

```javascript
function s(v) { return (v === null || v === undefined) ? "" : String(v); }
var raw = s(input.accountId).trim();
var confRaw = s(input.confirm).trim();
var conf = confRaw.toUpperCase();
output.readOk = false;
output.payYes = false;
if (raw === "") {
  output.vm = { screen: "BILL", bill: { accountId: "", confirm: confRaw },
                billMsg: "Acct ID can NOT be empty...", billMsgType: "error" };
} else if (conf === "N") {
  output.vm = { screen: "BILL", bill: { accountId: "", confirm: "" },
                billBalance: "", billMsg: "", billMsgType: "" };
} else if (conf !== "" && conf !== "Y") {
  output.vm = { screen: "BILL", bill: { accountId: raw, confirm: confRaw },
                billMsg: "Invalid value. Valid values are (Y/N)...", billMsgType: "error" };
} else if (!/^[0-9]{1,11}$/.test(raw)) {
  output.vm = { screen: "BILL", bill: { accountId: raw, confirm: confRaw }, billBalance: "",
                billMsg: "Account ID NOT found...", billMsgType: "error" };
} else {
  output.readOk = true;
  output.payYes = (conf === "Y");
  output.acctIdNum = parseInt(raw, 10);
  output.acctIdText = raw;
  output.confText = confRaw;
}
```

### Read account? (FORK, id=6ae44f623695c563ea512284)
  0. [IF] input.readOk === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Decide (SCRIPT, id=6ae44f663695c563ea512289)

```javascript
function s(v) { return (v === null || v === undefined) ? "" : String(v); }
function money(v) {
  var n = Number(v); var neg = n < 0; n = Math.abs(n);
  var parts = n.toFixed(2).split(".");
  return (neg ? "-" : "") + "$ " + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1];
}
function docOf(r) {
  if (r && r.data !== undefined && r.data !== null) {
    var d = r.data;
    if (d.length !== undefined) return d.length > 0 ? d[0] : null;
    return d;
  }
  return null;
}
function isEmptyObj(r) {
  if (r === null || r === undefined) return true;
  for (var k in r) { return false; }
  return true;
}
// FIND_ONE not found -> {}; FIND not found -> {data: []}; anything else is a read error
function notFound(r) { return isEmptyObj(r) || !!(r && r.data !== undefined && r.data !== null); }
var bill = { accountId: input.acctIdText, confirm: input.confText };
var a = docOf(input.acctRec);
output.pay = false;
if (a === null) {
  output.vm = { screen: "BILL", bill: bill, billBalance: "", billMsgType: "error",
                billMsg: notFound(input.acctRec) ? "Account ID NOT found..." : "Unable to lookup Account..." };
} else {
  var bal = Number(a.curr_bal);
  if (bal <= 0) {
    output.vm = { screen: "BILL", bill: bill, billBalance: money(bal),
                  billMsg: "You have nothing to pay...", billMsgType: "error" };
  } else if (input.payYes !== true) {
    output.vm = { screen: "BILL", bill: bill, billBalance: money(bal),
                  billMsg: "Confirm to make a bill payment...", billMsgType: "info" };
  } else {
    var x = docOf(input.xrefRec);
    if (x === null) {
      output.vm = { screen: "BILL", bill: bill, billBalance: money(bal), billMsgType: "error",
                    billMsg: notFound(input.xrefRec) ? "Account ID NOT found..." : "Unable to lookup XREF AIX file..." };
    } else {
      output.pay = true;
      output.oldBal = bal;
      output.amt = Math.round(bal * 100) / 100;
      output.newBal = Math.round((bal - output.amt) * 100) / 100;
      output.cardNum = s(x.card_num);
      output.balText = money(bal);
    }
  }
}
```

### Pay? (FORK, id=6ae44f683695c563ea51228a)
  0. [IF] input.pay === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Build transaction (SCRIPT, id=6ae44f6a3695c563ea51228e)

```javascript
function s(v) { return (v === null || v === undefined) ? "" : String(v); }
function docOf(r) {
  if (r && r.data !== undefined && r.data !== null) {
    var d = r.data;
    if (d.length !== undefined) return d.length > 0 ? d[0] : null;
    return d;
  }
  return null;
}
// a successful FIND always carries data (an empty array when the store is empty)
function readSucceeded(r) { return !!(r && r.data !== undefined && r.data !== null); }
// decimal-string increment: 16-digit ids exceed the JS safe-integer range
function inc(t) {
  var d = t.replace(/^0+/, ""); if (d === "") d = "0";
  var arr = d.split(""); var i = arr.length - 1; var carry = 1;
  while (i >= 0 && carry) {
    var n = arr[i].charCodeAt(0) - 48 + carry;
    arr[i] = String(n % 10); carry = n >= 10 ? 1 : 0; i--;
  }
  var r = (carry ? "1" : "") + arr.join("");
  while (r.length < 16) r = "0" + r;
  return r;
}
function p(n, w) { var t = String(n); while (t.length < w) t = "0" + t; return t; }
var rec = input.lastTranRec;
var last = docOf(rec);
var lastId = last !== null ? s(last.tran_id).trim() : "0";
output.updAcctId = input.acctIdNum;
output.buildErr = "";
if (!readSucceeded(rec) || !/^[0-9]+$/.test(lastId)) {
  // cannot determine the next id: make the guarded balance update match nothing
  output.buildErr = "Unable to Add Bill pay Transaction...";
  output.updAcctId = -1;
}
var now = new Date();
var ts = now.getUTCFullYear() + "-" + p(now.getUTCMonth() + 1, 2) + "-" + p(now.getUTCDate(), 2) + " " +
         p(now.getUTCHours(), 2) + ":" + p(now.getUTCMinutes(), 2) + ":" + p(now.getUTCSeconds(), 2) + "." +
         p(now.getUTCMilliseconds(), 3) + "000";
var tranId = inc(lastId);
output.tranId = tranId;
output.tran = {
  tran_id: tranId,
  type_cd: "02",
  cat_cd: 2,
  source: "POS TERM",
  desc: "BILL PAYMENT - ONLINE",
  amt: input.amt,
  merchant_id: 999999999,
  merchant_name: "BILL PAYMENT",
  merchant_city: "N/A",
  merchant_zip: "N/A",
  card_num: s(input.cardNum),
  orig_ts: ts,
  proc_ts: ts
};
```

### Check update (SCRIPT, id=6ae44f6d3695c563ea512290)

```javascript
var r = input.updRec;
var n = 0;
if (r && r.data && r.data.matchedCount !== undefined && r.data.matchedCount !== null) n = Number(r.data.matchedCount);
output.updOk = n >= 1;
if (!output.updOk) {
  var msg = (input.buildErr && input.buildErr !== "") ? input.buildErr : "Unable to Update Account...";
  output.vm = { screen: "BILL", bill: { accountId: input.acctIdText, confirm: input.confText },
                billBalance: input.balText, billMsg: msg, billMsgType: "error" };
}
```

### Updated? (FORK, id=6ae44f6e3695c563ea512291)
  0. [IF] input.updOk === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Payment done (SCRIPT, id=6ae44f713695c563ea512293)

```javascript
output.vm = { screen: "BILL", bill: { accountId: "", confirm: "" }, billBalance: "",
              billMsg: "Payment successful. Your Transaction ID is " + input.tranId + ".",
              billMsgType: "success" };
```

### Insert failed (SCRIPT, id=6ae44f733695c563ea512295)

```javascript
output.vm = { screen: "BILL", bill: { accountId: input.acctIdText, confirm: input.confText },
              billBalance: input.balText, billMsg: "Unable to Add Bill pay Transaction...",
              billMsgType: "error" };
```

## Data source bindings

### Read account (DATA_SOURCE, id=6ae44f643695c563ea512285)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctRec
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctIdNum}`

### Read xref (DATA_SOURCE, id=6ae44f653695c563ea512288)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefRec
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctIdNum}`

### Read last transaction (DATA_SOURCE, id=6ae44f693695c563ea51228d)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** findLastTransaction — flowxUuid <uuid>
- **responseKey:** lastTranRec
- **variables:** _(none bound)_

### Update balance (DATA_SOURCE, id=6ae44f6c3695c563ea51228f)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** updateBalance — flowxUuid <uuid>
- **responseKey:** updRec
- **variables:**
  - acctId [DB operation param] <uuid> ← `${updAcctId}`
  - expectedBal [DB operation param] <uuid> ← `${oldBal}`
  - newBal [DB operation param] <uuid> ← `${newBal}`

### Insert transaction (DATA_SOURCE, id=6ae44f6f3695c563ea512292)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insertTransaction — flowxUuid <uuid>
- **responseKey:** insRec
- **variables:**
  - tran [DB operation param] <uuid> ← `${tran}`

### Restore balance (DATA_SOURCE, id=6ae44f723695c563ea512294)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** updateBalance — flowxUuid <uuid>
- **responseKey:** restoreRec
- **variables:**
  - acctId [DB operation param] <uuid> ← `${updAcctId}`
  - expectedBal [DB operation param] <uuid> ← `${newBal}`
  - newBal [DB operation param] <uuid> ← `${oldBal}`

_(server: 491 ms, 5 API calls, 482 ms in API)_
