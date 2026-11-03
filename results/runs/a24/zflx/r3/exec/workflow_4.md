# Workflow: ui_account_view

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Account view screen (COACTVWC / account-view P-03): validate the 11-digit account number, read account, card xref by account, customer; format the read-only details.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae440fd3695c563ea511bd4 | <uuid> | (0, 0) | → Validate Account Id (seq:<uuid>) |
| Validate Account Id | SCRIPT | 6ae440ff3695c563ea511bd5 | <uuid> | (500, 0) | → Valid? (seq:<uuid>) | lang: JAVASCRIPT |
| Valid? | FORK | 6ae441023695c563ea511bd6 | <uuid> | (1000, 0) | → Read Account [cond:<uuid>] (seq:<uuid>), → Format And Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read Account | DATA_SOURCE | 6ae441043695c563ea511bd7 | <uuid> | (1500, 0) | → Account found? [SUCCESS] (seq:<uuid>), → Format And Respond [FAIL] (seq:<uuid>) | responseKey: acctResp, endpoint: <uuid> |
| Account found? | FORK | 6ae441053695c563ea511bd8 | <uuid> | (2000, 0) | → Read Xref By Account [cond:<uuid>] (seq:<uuid>), → Format And Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read Xref By Account | DATA_SOURCE | 6ae441073695c563ea511bd9 | <uuid> | (2500, 0) | → Xref found? [SUCCESS] (seq:<uuid>), → Format And Respond [FAIL] (seq:<uuid>) | responseKey: xrefResp, endpoint: <uuid> |
| Xref found? | FORK | 6ae441083695c563ea511bda | <uuid> | (3000, 0) | → Read Customer [cond:<uuid>] (seq:<uuid>), → Format And Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read Customer | DATA_SOURCE | 6ae4410a3695c563ea511bdb | <uuid> | (3500, 0) | → Format And Respond [SUCCESS] (seq:<uuid>), → Format And Respond [FAIL] (seq:<uuid>) | responseKey: custResp, endpoint: <uuid> |
| Format And Respond | SCRIPT | 6ae4410b3695c563ea511bdc | <uuid> | (4000, 300) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae4410c3695c563ea511bdd | <uuid> | (4500, 300) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read Account
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read Xref By Account
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read Customer

## Scripts

### Validate Account Id (SCRIPT, id=6ae440ff3695c563ea511bd5)

```javascript
// BR-01: account number must be a non zero 11 digit number
var raw = input.accountId == null ? "" : String(input.accountId).trim();
var hasSession = !!(input.session && input.session.userId);
var ok = hasSession && /^[0-9]{11}$/.test(raw) && !/^0+$/.test(raw);
var msg = "";
if (!hasSession) {
  msg = "";
} else if (!ok) {
  msg = "Account number must be a non zero 11 digit number";
}
output.chk = {
  ok: ok,
  hasSession: hasSession,
  accountId: raw,
  acctNum: ok ? parseInt(raw, 10) : 0,
  message: msg
};
```

### Valid? (FORK, id=6ae441023695c563ea511bd6)
  0. [IF] input.chk.ok === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Account found? (FORK, id=6ae441053695c563ea511bd8)
  0. [IF] input.acctResp != null && input.acctResp.data != null && input.acctResp.data.acct_id != null  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Xref found? (FORK, id=6ae441083695c563ea511bda)
  0. [IF] input.xrefResp != null && input.xrefResp.data != null && input.xrefResp.data.length > 0 && input.xrefResp.data[0].cust_id != null  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Format And Respond (SCRIPT, id=6ae4410b3695c563ea511bdc)

```javascript
function pad(v, n) { var s = v == null ? "" : String(v); while (s.length < n) s = "0" + s; return s; }
function str(v) { return v == null ? "" : String(v); }
function money(v) {
  var n = Number(v == null || v === "" ? 0 : v);
  if (isNaN(n)) n = 0;
  var neg = n < 0;
  var parts = Math.abs(n).toFixed(2).split(".");
  var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + "$ " + intPart + "." + parts[1];
}
function joinNonEmpty(arr, sep) {
  var out = [];
  for (var i = 0; i < arr.length; i++) { var s = str(arr[i]).trim(); if (s !== "") out.push(s); }
  return out.join(sep);
}

var chk = input.chk || {};
var session = input.session || null;
var ui = { screen: "acctSearch", session: session, acct: null, cust: null,
           acctView: { accountId: str(chk.accountId), message: "" } };

if (!chk.hasSession) {
  ui = { screen: "signon", session: null, acct: null, cust: null, acctView: { accountId: "", message: "" } };
} else if (!chk.ok) {
  ui.acctView.message = chk.message;
} else {
  var aResp = input.acctResp;
  var xResp = input.xrefResp;
  var cResp = input.custResp;
  var a = aResp && aResp.data && aResp.data.acct_id != null ? aResp.data : null;
  var x = xResp && xResp.data && xResp.data.length > 0 ? xResp.data[0] : null;
  var c = cResp && cResp.data && cResp.data.cust_id != null ? cResp.data : null;

  if (aResp == null || aResp.error) {
    ui.acctView.message = "Unable to read the account master file. Try again later";
  } else if (!a) {
    ui.acctView.message = "Did not find this account in account master file";            // BR-03
  } else if (xResp == null || xResp.error) {
    ui.acctView.message = "Unable to read the account card xref file. Try again later";
  } else if (!x) {
    ui.acctView.message = "Did not find this account in account card xref file";        // BR-02
  } else if (cResp == null || cResp.error) {
    ui.acctView.message = "Unable to read the customer master file. Try again later";
  } else if (!c) {
    ui.acctView.message = "Did not find associated customer in master file";            // BR-04
  } else {
    var ssn = pad(c.ssn, 9);
    ui.screen = "acctDetail";
    ui.acct = {
      accountId: pad(a.acct_id, 11),
      activeStatus: str(a.active_status),
      openDate: str(a.open_date),
      expirationDate: str(a.expiration_date),
      reissueDate: str(a.reissue_date),
      creditLimit: money(a.credit_limit),
      cashCreditLimit: money(a.cash_credit_limit),
      currentBalance: money(a.curr_bal),
      cycleCreditDebit: money(a.curr_cyc_credit) + " / " + money(a.curr_cyc_debit),
      groupId: str(a.group_id),
      cardNumber: str(x.card_num)
    };
    ui.cust = {
      customerId: pad(c.cust_id, 9),
      name: joinNonEmpty([c.first_name, c.middle_name, c.last_name], " "),
      ssn: "***-**-" + ssn.substring(5),                                                   // BR-05 masked
      dob: str(c.dob),
      fico: str(c.fico_credit_score),
      address: joinNonEmpty([c.addr_line_1, c.addr_line_2, c.addr_line_3, c.addr_state_cd, c.addr_country_cd, c.addr_zip], ", "),
      phones: str(c.phone_num_1) + " / " + str(c.phone_num_2),
      eftPrimary: str(c.eft_account_id) + " / " + str(c.pri_card_holder_ind)
    };
    ui.acctView.message = "";
    if (session) {
      ui.session = { userId: session.userId, userType: session.userType, firstName: session.firstName,
                     lastName: session.lastName, accountId: pad(a.acct_id, 11) };
    }
  }
}
output.ui = ui;
output.chk = null;
output.acctResp = null;
output.xrefResp = null;
output.custResp = null;
```

## Data source bindings

### Read Account (DATA_SOURCE, id=6ae441043695c563ea511bd7)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctResp
- **variables:**
  - acctId [DB operation param] <uuid> ← `${chk.acctNum}`

### Read Xref By Account (DATA_SOURCE, id=6ae441073695c563ea511bd9)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefResp
- **variables:**
  - acctId [DB operation param] <uuid> ← `${chk.acctNum}`

### Read Customer (DATA_SOURCE, id=6ae4410a3695c563ea511bdb)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** findCustomerById — flowxUuid <uuid>
- **responseKey:** custResp
- **variables:**
  - custId [DB operation param] <uuid> ← `${xrefResp.data[0].cust_id}`

_(server: 511 ms, 5 API calls, 504 ms in API)_
