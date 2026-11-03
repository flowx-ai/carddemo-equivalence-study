# Workflow: ui_account_view

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo COACTVWC account view: search (account → card xref → customer) and back.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3a4973695c563ea50f837 | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae3a49a3695c563ea50f83a | <uuid> | (500, 0) | → Lookup needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Lookup needed? | FORK | 6ae3a49d3695c563ea50f83b | <uuid> | (1000, 0) | → Read ACCTDAT [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read ACCTDAT | DATA_SOURCE | 6ae3a4a43695c563ea50f840 | <uuid> | (1500, 0) | → Read CXACAIX [SUCCESS] (seq:<uuid>), → Read error [FAIL] (seq:<uuid>) | responseKey: acctRecord, endpoint: <uuid> |
| Read CXACAIX | DATA_SOURCE | 6ae3a4a63695c563ea50f841 | <uuid> | (2000, 0) | → Pick customer id [SUCCESS] (seq:<uuid>), → Read error [FAIL] (seq:<uuid>) | responseKey: xrefRecords, endpoint: <uuid> |
| Pick customer id | SCRIPT | 6ae3a4a73695c563ea50f842 | <uuid> | (2500, 0) | → Read CUSTDAT (seq:<uuid>) | lang: JAVASCRIPT |
| Read CUSTDAT | DATA_SOURCE | 6ae3a4a83695c563ea50f843 | <uuid> | (3000, 0) | → Build view [SUCCESS] (seq:<uuid>), → Read error [FAIL] (seq:<uuid>) | responseKey: custRecord, endpoint: <uuid> |
| Build view | SCRIPT | 6ae3a4a93695c563ea50f846 | <uuid> | (3500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Read error | SCRIPT | 6ae3a4ab3695c563ea50f847 | <uuid> | (3500, 300) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae3a4ab3695c563ea50f848 | <uuid> | (4000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read ACCTDAT
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read CXACAIX
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read CUSTDAT

## Scripts

### Validate input (SCRIPT, id=6ae3a49a3695c563ea50f83a)

```javascript
// COACTVWC: Back (PF3) and the account-number edit (1210-EDIT-ACCOUNT).
function str(v) { return v == null ? "" : String(v); }
var entered = str(input.accountIdInput).trim();
output.lookupAcctId = 0;

function emptyView(msg) {
  return { accountIdInput: entered, message: msg, loaded: false, account: null, customer: null };
}

if (str(input.type) === "back") {
  output.result = {
    screen: "MAIN_MENU",
    menu: { option: "", message: "" },
    acctView: { accountIdInput: "", message: "", loaded: false, account: null, customer: null }
  };
} else if (str(input.type) === "update") {
  // "Update Account" starts account-update, which is not part of this build.
  var keep = input.acctView || {};
  output.result = { screen: "ACCOUNT_VIEW", acctView: {
    accountIdInput: str(keep.accountIdInput), message: "This option is coming soon ...", loaded: keep.loaded === true,
    account: keep.account || null, customer: keep.customer || null } };
} else if (!/^[0-9]{11}$/.test(entered) || parseInt(entered, 10) === 0) {
  output.result = { screen: "ACCOUNT_VIEW", acctView: emptyView("Account number must be a non zero 11 digit number") };
} else {
  output.lookupAcctId = parseInt(entered, 10);
  output.enteredAcctId = entered;
  output.result = { screen: "ACCOUNT_VIEW", acctView: emptyView("") };
}
```

### Lookup needed? (FORK, id=6ae3a49d3695c563ea50f83b)
  0. [IF] input.lookupAcctId != null && input.lookupAcctId > 0  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Pick customer id (SCRIPT, id=6ae3a4a73695c563ea50f842)

```javascript
// Customer id comes from the card cross-reference (CXACAIX) of the account; -1 matches nothing.
var x = input.xrefRecords && input.xrefRecords.data;
output.lookupCustId = (x && x.length > 0 && x[0].cust_id != null) ? x[0].cust_id : -1;
```

### Build view (SCRIPT, id=6ae3a4a93695c563ea50f846)

```javascript
// COACTVWC 9000-READ-ACCT: account master, then card xref, then customer master; format for display.
function str(v) { return v == null ? "" : String(v); }
function pad(v, n) { var s = str(v).replace(/[^0-9]/g, ""); while (s.length < n) s = "0" + s; return s; }
function money(v) {
  var n = Number(v == null || v === "" ? 0 : v);
  var neg = n < 0; n = Math.abs(n);
  var parts = n.toFixed(2).split(".");
  var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-$ " : "$ ") + whole + "." + parts[1];
}
function joinNonBlank(arr, sep) {
  var out = [];
  for (var i = 0; i < arr.length; i++) { var s = str(arr[i]).trim(); if (s !== "") out.push(s); }
  return out.join(sep);
}

var entered = str(input.enteredAcctId);
var acct = input.acctRecord && input.acctRecord.data;
var xref = input.xrefRecords && input.xrefRecords.data;
var cust = input.custRecord && input.custRecord.data;
var session = input.session || {};

function fail(msg) {
  return { screen: "ACCOUNT_VIEW", acctView: { accountIdInput: entered, message: msg, loaded: false, account: null, customer: null } };
}

if (!acct || acct.acct_id == null) {
  output.result = fail("Did not find this account in account master file");
} else if (!xref || xref.length === 0) {
  output.result = fail("Did not find this account in account card xref file");
} else if (!cust || cust.cust_id == null) {
  output.result = fail("Did not find associated customer in master file");
} else {
  var ssn = pad(cust.ssn, 9);
  var account = {
    acctId: pad(acct.acct_id, 11),
    activeStatus: str(acct.active_status),
    openDate: str(acct.open_date),
    expirationDate: str(acct.expiration_date),
    reissueDate: str(acct.reissue_date),
    creditLimit: money(acct.credit_limit),
    cashCreditLimit: money(acct.cash_credit_limit),
    currentBalance: money(acct.curr_bal),
    cycleCreditDebit: money(acct.curr_cyc_credit) + " / " + money(acct.curr_cyc_debit),
    groupId: str(acct.group_id)
  };
  var customer = {
    custId: pad(cust.cust_id, 9),
    name: joinNonBlank([cust.first_name, cust.middle_name, cust.last_name], " "),
    ssn: "***-**-" + ssn.substring(5),
    dob: str(cust.dob),
    fico: str(cust.fico_credit_score),
    address: joinNonBlank([cust.addr_line_1, cust.addr_line_2, cust.addr_line_3, cust.addr_state_cd, cust.addr_country_cd, cust.addr_zip], ", "),
    phones: joinNonBlank([cust.phone_num_1, cust.phone_num_2], " / "),
    eftPrimary: str(cust.eft_account_id) + " / " + str(cust.pri_card_holder_ind)
  };
  output.result = {
    screen: "ACCOUNT_VIEW",
    acctView: { accountIdInput: entered, message: "", loaded: true, account: account, customer: customer },
    session: {
      userId: str(session.userId), userType: str(session.userType),
      firstName: str(session.firstName), lastName: str(session.lastName), accountId: account.acctId
    }
  };
}
output.acctRecord = null; output.xrefRecords = null; output.custRecord = null;
```

### Read error (SCRIPT, id=6ae3a4ab3695c563ea50f847)

```javascript
// A store read failed (not a not-found): report it, keep the entered account number.
output.result = { screen: "ACCOUNT_VIEW", acctView: {
  accountIdInput: input.enteredAcctId == null ? "" : String(input.enteredAcctId),
  message: "Unable to read account data. Please try again later ...", loaded: false, account: null, customer: null } };
output.acctRecord = null; output.xrefRecords = null; output.custRecord = null;
```

## Data source bindings

### Read ACCTDAT (DATA_SOURCE, id=6ae3a4a43695c563ea50f840)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctRecord
- **variables:**
  - acctId [DB operation param] <uuid> ← `${lookupAcctId}`

### Read CXACAIX (DATA_SOURCE, id=6ae3a4a63695c563ea50f841)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefRecords
- **variables:**
  - acctId [DB operation param] <uuid> ← `${lookupAcctId}`

### Read CUSTDAT (DATA_SOURCE, id=6ae3a4a83695c563ea50f843)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** findCustomerById — flowxUuid <uuid>
- **responseKey:** custRecord
- **variables:**
  - custId [DB operation param] <uuid> ← `${lookupCustId}`

_(server: 938 ms, 5 API calls, 934 ms in API)_
