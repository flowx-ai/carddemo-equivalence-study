# Workflow: ui_account_view

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** COACTVWC account view: validate account id, read card_xref by account, accounts, customers; build read-only view (SSN masked). Returns UI state keys.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae44e6d3695c563ea5121be | <uuid> | (0, 0) | → Validate account id (seq:<uuid>) |
| Validate account id | SCRIPT | 6ae44e703695c563ea5121bf | <uuid> | (500, 0) | → Valid? (seq:<uuid>) | lang: JAVASCRIPT |
| Valid? | FORK | 6ae44e713695c563ea5121c0 | <uuid> | (1000, 0) | → Read xref by account [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read xref by account | DATA_SOURCE | 6ae44e733695c563ea5121c1 | <uuid> | (1500, 0) | → Read account [SUCCESS] (seq:<uuid>), → Read account [FAIL] (seq:<uuid>) | responseKey: xrefRec, endpoint: <uuid> |
| Read account | DATA_SOURCE | 6ae44e743695c563ea5121c2 | <uuid> | (2000, 0) | → Pick customer id [SUCCESS] (seq:<uuid>), → Pick customer id [FAIL] (seq:<uuid>) | responseKey: acctRec, endpoint: <uuid> |
| Pick customer id | SCRIPT | 6ae44e753695c563ea5121c5 | <uuid> | (2500, 0) | → Read customer (seq:<uuid>) | lang: JAVASCRIPT |
| Read customer | DATA_SOURCE | 6ae44e773695c563ea5121c6 | <uuid> | (3000, 0) | → Build view [SUCCESS] (seq:<uuid>), → Build view [FAIL] (seq:<uuid>) | responseKey: custRec, endpoint: <uuid> |
| Build view | SCRIPT | 6ae44e783695c563ea5121c9 | <uuid> | (3500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae44e793695c563ea5121ca | <uuid> | (4000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read xref by account
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read account
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read customer

## Scripts

### Validate account id (SCRIPT, id=6ae44e703695c563ea5121bf)

```javascript
function s(v) { return (v === null || v === undefined) ? "" : String(v); }
var raw = s(input.accountId).trim();
output.inputOk = false;
if (!/^[0-9]{11}$/.test(raw) || /^0+$/.test(raw)) {
  output.vm = { screen: "ACCT", acctFound: false, acctView: null,
                acctMsg: "Account number must be a non zero 11 digit number",
                acct: { accountId: raw } };
} else {
  output.inputOk = true;
  output.acctIdNum = parseInt(raw, 10);
  output.acctIdText = raw;
}
```

### Valid? (FORK, id=6ae44e713695c563ea5121c0)
  0. [IF] input.inputOk === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Pick customer id (SCRIPT, id=6ae44e753695c563ea5121c5)

```javascript
var x = input.xrefRec;
var d = (x && x.data !== undefined && x.data !== null) ? x.data : null;
var first = null;
if (d !== null) {
  if (d.length !== undefined) { if (d.length > 0) first = d[0]; }
  else if (d.card_num !== undefined) { first = d; }
}
output.xrefFound = first !== null;
output.custIdNum = first !== null ? Number(first.cust_id) : -1;
output.cardNum = first !== null ? String(first.card_num) : "";
```

### Build view (SCRIPT, id=6ae44e783695c563ea5121c9)

```javascript
function s(v) { return (v === null || v === undefined) ? "" : String(v); }
function pad(v, n) { var t = s(v); while (t.length < n) t = "0" + t; return t; }
function money(v) {
  if (v === null || v === undefined || s(v) === "") return "";
  var n = Number(v); var neg = n < 0; n = Math.abs(n);
  var parts = n.toFixed(2).split(".");
  var ip = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + "$ " + ip + "." + parts[1];
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
var base = { screen: "ACCT", acct: { accountId: input.acctIdText }, acctFound: false, acctView: null };
var a = docOf(input.acctRec);
var c = docOf(input.custRec);
if (a === null) {
  base.acctMsg = isEmptyObj(input.acctRec) ? "Did not find this account in account master file"
                                           : "Error reading account master file";
} else if (input.xrefFound !== true) {
  base.acctMsg = "Did not find this account in account card xref file";
} else if (c === null) {
  base.acctMsg = isEmptyObj(input.custRec) ? "Did not find associated customer in master file"
                                           : "Error reading customer master file";
} else {
  var ssnT = pad(c.ssn, 9);
  var name = [s(c.first_name).trim(), s(c.middle_name).trim(), s(c.last_name).trim()]
    .filter(function (p) { return p !== ""; }).join(" ");
  var addr = [c.addr_line_1, c.addr_line_2, c.addr_line_3, c.addr_state_cd, c.addr_country_cd, c.addr_zip]
    .map(function (p) { return s(p).trim(); }).filter(function (p) { return p !== ""; }).join(", ");
  base.acctFound = true;
  base.acctMsg = "";
  base.acctView = {
    accountId: pad(a.acct_id, 11),
    activeStatus: s(a.active_status),
    activeLabel: s(a.active_status) === "Y" ? "Active" : "Inactive",
    openDate: s(a.open_date),
    expirationDate: s(a.expiration_date),
    reissueDate: s(a.reissue_date),
    groupId: s(a.group_id),
    creditLimit: money(a.credit_limit),
    cashCreditLimit: money(a.cash_credit_limit),
    currentBalance: money(a.curr_bal),
    currCycCredit: money(a.curr_cyc_credit),
    currCycDebit: money(a.curr_cyc_debit),
    customerId: pad(c.cust_id, 9),
    ssn: "***-**-" + ssnT.substring(5),
    ficoScore: s(c.fico_credit_score),
    dob: s(c.dob),
    name: name,
    firstName: s(c.first_name).trim(),
    middleName: s(c.middle_name).trim(),
    lastName: s(c.last_name).trim(),
    address: addr,
    addrLine1: s(c.addr_line_1).trim(),
    addrLine2: s(c.addr_line_2).trim(),
    addrLine3: s(c.addr_line_3).trim(),
    state: s(c.addr_state_cd).trim(),
    country: s(c.addr_country_cd).trim(),
    zip: s(c.addr_zip).trim(),
    phone1: s(c.phone_num_1).trim(),
    phone2: s(c.phone_num_2).trim(),
    govtId: s(c.govt_issued_id).trim(),
    eftAccountId: s(c.eft_account_id).trim(),
    primaryHolder: s(c.pri_card_holder_ind).trim(),
    cardNum: s(input.cardNum)
  };
}
output.vm = base;
```

## Data source bindings

### Read xref by account (DATA_SOURCE, id=6ae44e733695c563ea5121c1)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefRec
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctIdNum}`

### Read account (DATA_SOURCE, id=6ae44e743695c563ea5121c2)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctRec
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctIdNum}`

### Read customer (DATA_SOURCE, id=6ae44e773695c563ea5121c6)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** findCustomerById — flowxUuid <uuid>
- **responseKey:** custRec
- **variables:**
  - custId [DB operation param] <uuid> ← `${custIdNum}`

_(server: 471 ms, 5 API calls, 464 ms in API)_
