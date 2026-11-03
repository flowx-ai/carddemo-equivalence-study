# Workflow: ui_bill_payment

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Bill payment screen (COBIL00C / bill-payment P-11): look up the account balance, confirm, write a payment transaction (type 02, cat 2) for the full balance and reduce the account balance, with a compensating delete when the account update fails.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae4422d3695c563ea511c25 | <uuid> | (0, 0) | → Validate Input (seq:<uuid>) |
| Validate Input | SCRIPT | 6ae442323695c563ea511c26 | <uuid> | (500, 0) | → Lookup needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Lookup needed? | FORK | 6ae442333695c563ea511c27 | <uuid> | (1000, 0) | → Read Account [cond:<uuid>] (seq:<uuid>), → Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read Account | DATA_SOURCE | 6ae442353695c563ea511c28 | <uuid> | (1500, 0) | → Pay now? [SUCCESS] (seq:<uuid>), → Respond [FAIL] (seq:<uuid>) | responseKey: acctResp, endpoint: <uuid> |
| Pay now? | FORK | 6ae442363695c563ea511c29 | <uuid> | (2000, 0) | → Read Xref By Account [cond:<uuid>] (seq:<uuid>), → Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read Xref By Account | DATA_SOURCE | 6ae442373695c563ea511c2a | <uuid> | (2500, 0) | → Xref found? [SUCCESS] (seq:<uuid>), → Respond [FAIL] (seq:<uuid>) | responseKey: xrefResp, endpoint: <uuid> |
| Xref found? | FORK | 6ae442393695c563ea511c2b | <uuid> | (3000, 0) | → Read Last Transaction [cond:<uuid>] (seq:<uuid>), → Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read Last Transaction | DATA_SOURCE | 6ae4423a3695c563ea511c2c | <uuid> | (3500, 0) | → Build Payment Transaction [SUCCESS] (seq:<uuid>), → Respond [FAIL] (seq:<uuid>) | responseKey: lastTranResp, endpoint: <uuid> |
| Build Payment Transaction | SCRIPT | 6ae4423b3695c563ea511c2d | <uuid> | (4000, 0) | → Insert Transaction (seq:<uuid>) | lang: JAVASCRIPT |
| Insert Transaction | DATA_SOURCE | 6ae4423d3695c563ea511c2e | <uuid> | (4500, 0) | → Update Account Balance [SUCCESS] (seq:<uuid>), → Respond [FAIL] (seq:<uuid>) | responseKey: insResp, endpoint: <uuid> |
| Update Account Balance | DATA_SOURCE | 6ae4423e3695c563ea511c2f | <uuid> | (5000, 0) | → Account updated? [SUCCESS] (seq:<uuid>), → Compensate Delete Transaction [FAIL] (seq:<uuid>) | responseKey: updResp, endpoint: <uuid> |
| Account updated? | FORK | 6ae4423f3695c563ea511c30 | <uuid> | (5500, 0) | → Respond [cond:<uuid>] (seq:<uuid>), → Compensate Delete Transaction [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Compensate Delete Transaction | DATA_SOURCE | 6ae442413695c563ea511c31 | <uuid> | (6000, 300) | → Respond [SUCCESS] (seq:<uuid>), → Respond [FAIL] (seq:<uuid>) | responseKey: delResp, endpoint: <uuid> |
| Respond | SCRIPT | 6ae442423695c563ea511c32 | <uuid> | (6500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae442433695c563ea511c33 | <uuid> | (7000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read Account, Update Account Balance
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read Xref By Account
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read Last Transaction, Insert Transaction, Compensate Delete Transaction

## Scripts

### Validate Input (SCRIPT, id=6ae442323695c563ea511c26)

```javascript
// COBIL00C PROCESS-ENTER-KEY: account id first, then the confirm flag
var hasSession = !!(input.session && input.session.userId);
var acct = input.accountId == null ? "" : String(input.accountId).trim();
var conf = input.confirm == null ? "" : String(input.confirm).trim();
var chk = { ok: false, mode: "error", accountId: acct, acctNum: 0, message: "" };

if (!hasSession) {
  chk.mode = "signon";
} else if (acct === "") {
  chk.message = "Acct ID can NOT be empty...";                         // BR-01
} else if (conf === "N" || conf === "n") {
  chk.mode = "clear";                                                  // BR-04: N clears the screen
} else if (conf !== "" && conf !== "Y" && conf !== "y") {
  chk.message = "Invalid value. Valid values are (Y/N)...";            // BR-04
} else if (!/^[0-9]{11}$/.test(acct)) {
  chk.message = "Account ID NOT found...";                             // BR-02: key cannot exist
} else {
  chk.ok = true;
  chk.mode = (conf === "Y" || conf === "y") ? "pay" : "lookup";
  chk.acctNum = parseInt(acct, 10);
}
output.chk = chk;
```

### Lookup needed? (FORK, id=6ae442333695c563ea511c27)
  0. [IF] input.chk.ok === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Pay now? (FORK, id=6ae442363695c563ea511c29)
  0. [IF] input.chk.mode === 'pay' && input.acctResp != null && input.acctResp.data != null && input.acctResp.data.acct_id != null && Number(input.acctResp.data.curr_bal) > 0  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Xref found? (FORK, id=6ae442393695c563ea511c2b)
  0. [IF] input.xrefResp != null && input.xrefResp.data != null && input.xrefResp.data.length > 0 && input.xrefResp.data[0].card_num != null  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Build Payment Transaction (SCRIPT, id=6ae4423b3695c563ea511c2d)

```javascript
// BR-05/BR-06: payment of the full balance, transaction id = last + 1
function incDecimal(s) {
  var digits = String(s).replace(/[^0-9]/g, "");
  if (digits === "") digits = "0";
  var out = "", carry = 1;
  for (var i = digits.length - 1; i >= 0; i--) {
    var d = digits.charCodeAt(i) - 48 + carry;
    carry = d >= 10 ? 1 : 0;
    out = String(d % 10) + out;
  }
  if (carry) out = "1" + out;
  return out;
}
function pad(v, n) { var s = String(v); while (s.length < n) s = "0" + s; return s; }
function two(n) { return n < 10 ? "0" + n : String(n); }

var a = input.acctResp.data;
var x = input.xrefResp.data[0];
var last = input.lastTranResp && input.lastTranResp.data && input.lastTranResp.data.length > 0
  ? input.lastTranResp.data[0].tran_id : "0";
var tranId = pad(incDecimal(last), 16);

var d = new Date();
var ts = d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1) + "-" + two(d.getUTCDate()) + " " +
         two(d.getUTCHours()) + ":" + two(d.getUTCMinutes()) + ":" + two(d.getUTCSeconds()) + ".000000";

var bal = Number(a.curr_bal);
var amt = Math.round(bal * 100) / 100;
output.newTran = {
  tran_id: tranId,
  type_cd: "02",
  cat_cd: 2,
  source: "POS TERM",
  desc: "BILL PAYMENT - ONLINE",
  amt: amt,
  merchant_id: 999999999,
  merchant_name: "BILL PAYMENT",
  merchant_city: "N/A",
  merchant_zip: "N/A",
  card_num: String(x.card_num),
  orig_ts: ts,
  proc_ts: ts
};
output.pay = {
  acctId: a.acct_id,
  expectedBal: a.curr_bal,
  newBal: Math.round((bal - amt) * 100) / 100
};
output.lastTranResp = null;
```

### Account updated? (FORK, id=6ae4423f3695c563ea511c30)
  0. [IF] input.updResp != null && input.updResp.data != null && Number(input.updResp.data.matchedCount) > 0  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Respond (SCRIPT, id=6ae442423695c563ea511c32)

```javascript
function pad(v, n) { var s = v == null ? "" : String(v); while (s.length < n) s = "0" + s; return s; }
function money(v) {
  var n = Number(v == null || v === "" ? 0 : v);
  if (isNaN(n)) n = 0;
  var neg = n < 0;
  var parts = Math.abs(n).toFixed(2).split(".");
  return (neg ? "-" : "") + "$ " + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1];
}
function has(r) { return r != null && r.data != null && !r.error; }

var chk = input.chk || {};
var session = input.session || null;
var bill = { accountId: chk.accountId || "", balance: "", confirm: "", message: "", messageType: "" };
var screen = "billPay";

if (chk.mode === "signon") {
  screen = "signon"; session = null;
  bill = { accountId: "", balance: "", confirm: "", message: "", messageType: "" };
} else if (chk.mode === "clear") {
  bill = { accountId: "", balance: "", confirm: "", message: "", messageType: "" };
} else if (chk.mode === "error") {
  bill.message = chk.message; bill.messageType = "error";
} else {
  var aResp = input.acctResp;
  var a = aResp && aResp.data && aResp.data.acct_id != null ? aResp.data : null;
  if (aResp == null || aResp.error) {
    bill.message = "Unable to lookup Account..."; bill.messageType = "error";
  } else if (!a) {
    bill.message = "Account ID NOT found..."; bill.messageType = "error";               // BR-02
  } else {
    bill.accountId = pad(a.acct_id, 11);
    bill.balance = money(a.curr_bal);
    if (session) {
      session = { userId: session.userId, userType: session.userType, firstName: session.firstName,
                  lastName: session.lastName, accountId: pad(a.acct_id, 11) };
    }
    if (!(Number(a.curr_bal) > 0)) {
      bill.message = "You have nothing to pay..."; bill.messageType = "error";          // BR-03
    } else if (chk.mode === "lookup") {
      bill.message = "Confirm to make a bill payment..."; bill.messageType = "info";    // BR-04
    } else {
      var x = input.xrefResp;
      var ins = input.insResp;
      var upd = input.updResp;
      if (x == null || x.error) {
        bill.message = "Unable to lookup XREF AIX file..."; bill.messageType = "error";
      } else if (!(x.data && x.data.length > 0)) {
        bill.message = "Account ID NOT found..."; bill.messageType = "error";
      } else if (!input.newTran || !has(ins) || ins.data._id == null) {
        bill.message = "Unable to Add Bill pay Transaction..."; bill.messageType = "error";
      } else if (!has(upd) || !(Number(upd.data.matchedCount) > 0)) {
        // the transaction was removed again by the compensating delete
        bill.message = "Unable to Update Account..."; bill.messageType = "error";
      } else {
        // BR-08: success, the screen is cleared and shows the new transaction id
        bill = { accountId: "", balance: "", confirm: "",
                 message: "Payment successful. Your Transaction ID is " + input.newTran.tran_id + ".",
                 messageType: "success" };
      }
    }
  }
}

output.ui = { screen: screen, session: session, bill: bill };
output.chk = null; output.acctResp = null; output.xrefResp = null; output.lastTranResp = null;
output.insResp = null; output.updResp = null; output.delResp = null; output.newTran = null; output.pay = null;
```

## Data source bindings

### Read Account (DATA_SOURCE, id=6ae442353695c563ea511c28)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctResp
- **variables:**
  - acctId [DB operation param] <uuid> ← `${chk.acctNum}`

### Read Xref By Account (DATA_SOURCE, id=6ae442373695c563ea511c2a)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefResp
- **variables:**
  - acctId [DB operation param] <uuid> ← `${chk.acctNum}`

### Read Last Transaction (DATA_SOURCE, id=6ae4423a3695c563ea511c2c)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** findLastTransaction — flowxUuid <uuid>
- **responseKey:** lastTranResp
- **variables:** _(none bound)_

### Insert Transaction (DATA_SOURCE, id=6ae4423d3695c563ea511c2e)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insertTransaction — flowxUuid <uuid>
- **responseKey:** insResp
- **variables:**
  - tranId [DB operation param] <uuid> ← `${newTran.tran_id}`
  - typeCd [DB operation param] <uuid> ← `${newTran.type_cd}`
  - catCd [DB operation param] <uuid> ← `${newTran.cat_cd}`
  - source [DB operation param] <uuid> ← `${newTran.source}`
  - desc [DB operation param] <uuid> ← `${newTran.desc}`
  - amt [DB operation param] <uuid> ← `${newTran.amt}`
  - merchantId [DB operation param] <uuid> ← `${newTran.merchant_id}`
  - merchantName [DB operation param] <uuid> ← `${newTran.merchant_name}`
  - merchantCity [DB operation param] <uuid> ← `${newTran.merchant_city}`
  - merchantZip [DB operation param] <uuid> ← `${newTran.merchant_zip}`
  - cardNum [DB operation param] <uuid> ← `${newTran.card_num}`
  - origTs [DB operation param] <uuid> ← `${newTran.orig_ts}`
  - procTs [DB operation param] <uuid> ← `${newTran.proc_ts}`

### Update Account Balance (DATA_SOURCE, id=6ae4423e3695c563ea511c2f)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** updateAccountBalance — flowxUuid <uuid>
- **responseKey:** updResp
- **variables:**
  - acctId [DB operation param] <uuid> ← `${pay.acctId}`
  - expectedBal [DB operation param] <uuid> ← `${pay.expectedBal}`
  - newBal [DB operation param] <uuid> ← `${pay.newBal}`

### Compensate Delete Transaction (DATA_SOURCE, id=6ae442413695c563ea511c31)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** deleteTransactionById — flowxUuid <uuid>
- **responseKey:** delResp
- **variables:**
  - tranId [DB operation param] <uuid> ← `${newTran.tran_id}`

_(server: 413 ms, 5 API calls, 407 ms in API)_
