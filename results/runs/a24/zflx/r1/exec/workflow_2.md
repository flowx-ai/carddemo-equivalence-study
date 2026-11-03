# Workflow: ui_account_view

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Account view (COACTVWC): validate account id, read account, card xref, customer; build read-only view model.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae399553695c563ea50ef12 | <uuid> | (0, 0) | → Validate account id (seq:<uuid>) |
| Validate account id | SCRIPT | 6ae399583695c563ea50ef13 | <uuid> | (500, 0) | → Read needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Read needed? | FORK | 6ae3995b3695c563ea50ef16 | <uuid> | (1000, 0) | → Read ACCTDAT [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read ACCTDAT | DATA_SOURCE | 6ae3995c3695c563ea50ef17 | <uuid> | (1500, 0) | → Read CXACAIX [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: acctRes, endpoint: <uuid> |
| Read CXACAIX | DATA_SOURCE | 6ae3995d3695c563ea50ef1a | <uuid> | (2000, 0) | → Pick customer id [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: xrefRes, endpoint: <uuid> |
| Pick customer id | SCRIPT | 6ae3995f3695c563ea50ef1b | <uuid> | (2500, 0) | → Read CUSTDAT (seq:<uuid>) | lang: JAVASCRIPT |
| Read CUSTDAT | DATA_SOURCE | 6ae399603695c563ea50ef1c | <uuid> | (3000, 0) | → Build view [SUCCESS] (seq:<uuid>), → File error [FAIL] (seq:<uuid>) | responseKey: custRes, endpoint: <uuid> |
| Build view | SCRIPT | 6ae399613695c563ea50ef1d | <uuid> | (3500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| File error | SCRIPT | 6ae399623695c563ea50ef1e | <uuid> | (3500, 300) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae399633695c563ea50ef1f | <uuid> | (4000, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read ACCTDAT
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read CXACAIX
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read CUSTDAT

## Scripts

### Validate account id (SCRIPT, id=6ae399583695c563ea50ef13)

```javascript
// COACTVWC 2210-EDIT-ACCOUNT. Input: type (search | back), acctId
var type = input.type ? String(input.type) : "search";
var raw = input.acctId == null ? "" : String(input.acctId).trim();
if (type === "back") {
  // Back / F3 returns to the main menu
  output.route = "END";
  output.ui = { screen: "MAIN_MENU", menuMessage: "", menuSelection: "", acctMessage: "", searchAcctId: "", acct: {} };
} else if (!/^[0-9]{11}$/.test(raw) || /^0+$/.test(raw)) {
  // BR-01: empty, non-numeric, not 11 digits or zero
  output.route = "END";
  output.ui = { screen: "ACCOUNT_SEARCH", searchAcctId: raw, acct: {},
                acctMessage: "Account number must be a non zero 11 digit number" };
} else {
  output.route = "READ";
  output.acctKey = raw;
  output.acctNum = parseInt(raw, 10);
}
```

### Read needed? (FORK, id=6ae3995b3695c563ea50ef16)
  0. [IF] input.route == "READ"  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Pick customer id (SCRIPT, id=6ae3995f3695c563ea50ef1b)

```javascript
// First card cross-reference of the account (alternate index CXACAIX) gives the customer id
var d = input.xrefRes ? input.xrefRes.data : null;
var x = null;
if (d != null) {
  if (d.length !== undefined) { if (d.length > 0) x = d[0]; } else if (d.acct_id != null) { x = d; }
}
output.xref = x ? { card_num: String(x.card_num), cust_id: Number(x.cust_id), acct_id: Number(x.acct_id) } : null;
output.custLookupId = x ? Number(x.cust_id) : -1;
```

### Build view (SCRIPT, id=6ae399613695c563ea50ef1d)

```javascript
// COACTVWC 9000-READ-ACCT + format values. Not-found checks in order: account, xref, customer.
function s(v) { return v == null ? "" : String(v); }
function pad(v, n) { var t = s(v); while (t.length < n) t = "0" + t; return t; }
function money(v) {
  var n = Number(v == null ? 0 : v); var neg = n < 0; n = Math.abs(n);
  var parts = n.toFixed(2).split(".");
  var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-$ " : "$ ") + intPart + "." + parts[1];
}
function join(list, sep) { var out = []; for (var i = 0; i < list.length; i++) if (s(list[i]).trim() !== "") out.push(s(list[i]).trim()); return out.join(sep); }

var a = (input.acctRes && input.acctRes.data && input.acctRes.data.acct_id != null) ? input.acctRes.data : null;
var x = input.xref;
var c = (input.custRes && input.custRes.data && input.custRes.data.cust_id != null) ? input.custRes.data : null;

if (!a) {
  output.ui = { screen: "ACCOUNT_SEARCH", searchAcctId: input.acctKey, acct: {},
                acctMessage: "Did not find this account in account master file" };
} else if (!x) {
  output.ui = { screen: "ACCOUNT_SEARCH", searchAcctId: input.acctKey, acct: {},
                acctMessage: "Did not find this account in account card xref file" };
} else if (!c) {
  output.ui = { screen: "ACCOUNT_SEARCH", searchAcctId: input.acctKey, acct: {},
                acctMessage: "Did not find associated customer in master file" };
} else {
  var ssn = pad(c.ssn, 9);
  output.ui = {
    screen: "ACCOUNT_DETAILS", acctMessage: "", searchAcctId: input.acctKey,
    // selected record kept for the session (SessionContext accountId / cardNumber / customerId)
    selectedAccountId: pad(a.acct_id, 11), selectedCardNumber: s(x.card_num), selectedCustomerId: pad(c.cust_id, 9),
    acct: {
      accountId: pad(a.acct_id, 11),
      activeStatus: s(a.active_status),
      openDate: s(a.open_date),
      expiryDate: s(a.expiration_date),
      reissueDate: s(a.reissue_date),
      creditLimit: money(a.credit_limit),
      cashCreditLimit: money(a.cash_credit_limit),
      currentBalance: money(a.curr_bal),
      cycleCredit: money(a.curr_cyc_credit),
      cycleDebit: money(a.curr_cyc_debit),
      cycleCreditDebit: money(a.curr_cyc_credit) + " / " + money(a.curr_cyc_debit),
      groupId: s(a.group_id),
      customerId: pad(c.cust_id, 9),
      customerName: join([c.first_name, c.middle_name, c.last_name], " "),
      ssnMasked: "***-**-" + ssn.substring(5),
      dateOfBirth: s(c.dob),
      ficoScore: s(c.fico_credit_score),
      address: join([c.addr_line_1, c.addr_line_2, c.addr_line_3, c.addr_state_cd, c.addr_country_cd, c.addr_zip], ", "),
      phones: join([c.phone_num_1, c.phone_num_2], " / "),
      governmentId: s(c.govt_issued_id),
      eftAccountId: s(c.eft_account_id),
      primaryCardHolder: s(c.pri_card_holder_ind),
      eftPrimary: s(c.eft_account_id) + " / " + s(c.pri_card_holder_ind)
    }
  };
}
```

### File error (SCRIPT, id=6ae399623695c563ea50ef1e)

```javascript
// Store error other than not-found (legacy: RESP other than NORMAL / NOTFND)
output.ui = { screen: "ACCOUNT_SEARCH", searchAcctId: input.acctKey, acct: {},
              acctMessage: "Unable to read the account data. Try again later..." };
```

## Data source bindings

### Read ACCTDAT (DATA_SOURCE, id=6ae3995c3695c563ea50ef17)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** findAccountById — flowxUuid <uuid>
- **responseKey:** acctRes
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctNum}`

### Read CXACAIX (DATA_SOURCE, id=6ae3995d3695c563ea50ef1a)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** findXrefByAcct — flowxUuid <uuid>
- **responseKey:** xrefRes
- **variables:**
  - acctId [DB operation param] <uuid> ← `${acctNum}`

### Read CUSTDAT (DATA_SOURCE, id=6ae399603695c563ea50ef1c)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** findCustomerById — flowxUuid <uuid>
- **responseKey:** custRes
- **variables:**
  - custId [DB operation param] <uuid> ← `${custLookupId}`

_(server: 657 ms, 5 API calls, 651 ms in API)_
