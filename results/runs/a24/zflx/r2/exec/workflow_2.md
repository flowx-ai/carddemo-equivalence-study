# Workflow: ui_menu

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Main menu (COMEN01C) and admin menu (COADM01C): option validation, optional-module toggles, routing. menu = USER | ADMIN, type = select | exit

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3a4233695c563ea50f7ff | <uuid> | (0, 0) | → Process menu option (seq:<uuid>) |
| Process menu option | SCRIPT | 6ae3a4273695c563ea50f802 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae3a42a3695c563ea50f805 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Process menu option (SCRIPT, id=6ae3a4273695c563ea50f802)

```javascript
// COMEN01C (user menu, COMEN02Y) / COADM01C (admin menu, COADM02Y) PROCESS-ENTER-KEY and PF3.
function str(v) { return v == null ? "" : String(v); }

var USER_OPTIONS = [
  { label: "Account View", target: "ACCOUNT_VIEW" },
  { label: "Account Update", target: null },
  { label: "Credit Card List", target: null },
  { label: "Credit Card View", target: null },
  { label: "Credit Card Update", target: null },
  { label: "Transaction List", target: null },
  { label: "Transaction View", target: null },
  { label: "Transaction Add", target: null },
  { label: "Transaction Reports", target: null },
  { label: "Bill Payment", target: "BILL_PAYMENT" },
  { label: "Pending Authorization View", target: null, toggle: "pendingAuthorizationEnabled" }
];
var ADMIN_OPTIONS = [
  { label: "User List", target: null },
  { label: "User Add", target: null },
  { label: "User Update", target: null },
  { label: "User Delete", target: null },
  { label: "Transaction Type List/Update (DB2)", target: null, toggle: "transactionTypeMaintenanceEnabled" },
  { label: "Transaction Type Maintenance (DB2)", target: null, toggle: "transactionTypeMaintenanceEnabled" }
];

var isAdmin = str(input.menu) === "ADMIN";
var stateKey = isAdmin ? "adminMenu" : "menu";
var screen = isAdmin ? "ADMIN_MENU" : "MAIN_MENU";
var options = isAdmin ? ADMIN_OPTIONS : USER_OPTIONS;
var toggles = input.toggles || {};
var session = input.session || {};
var entered = str(input.option);

function menuState(message) {
  var r = { screen: screen };
  r[stateKey] = { option: entered, message: message };
  return r;
}

if (str(input.type) === "exit") {
  // BR-05: PF3 returns to sign-on; the session is discarded.
  output.result = {
    screen: "SIGNON",
    signon: { userId: "", password: "", message: "" },
    session: { userId: "", userType: "", firstName: "", lastName: "", accountId: "" },
    menu: { option: "", message: "" },
    adminMenu: { option: "", message: "" }
  };
} else {
  // Legacy: trailing spaces trimmed, embedded spaces read as zeros, must be numeric 1..count.
  var t = entered.trim().replace(/ /g, "0");
  var n = /^[0-9]{1,2}$/.test(t) ? parseInt(t, 10) : -1;
  if (t === "") n = 0;
  if (n < 1 || n > options.length) {
    output.result = menuState("Please enter a valid option number...");   // BR-01
  } else {
    var opt = options[n - 1];
    if (opt.toggle && toggles[opt.toggle] !== true) {
      // BR-03: optional module not installed (OptionalModuleToggles).
      output.result = menuState("This option " + opt.label + " is not installed...");
    } else if (!opt.target) {
      // Function not delivered in this build (see assumptions.md).
      output.result = menuState("This option is coming soon ...");
    } else if (opt.target === "ACCOUNT_VIEW") {
      var r = { screen: "ACCOUNT_VIEW" };
      r[stateKey] = { option: "", message: "" };
      r.acctView = { accountIdInput: str(session.accountId), message: "", loaded: false };
      output.result = r;
    } else {
      var r2 = { screen: "BILL_PAYMENT" };
      r2[stateKey] = { option: "", message: "" };
      r2.bill = { acctIdInput: "", balance: "", confirm: "", error: "", prompt: "", success: "" };
      output.result = r2;
    }
  }
}
```

_(server: 337 ms, 1 API call, 335 ms in API)_
