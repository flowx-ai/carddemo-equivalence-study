# Workflow: ui_menu

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Main menu (COMEN01C) and admin menu (COADM01C): option validation and routing; Exit returns to sign-on.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae399203695c563ea50eef2 | <uuid> | (0, 0) | → Validate and route option (seq:<uuid>) |
| Validate and route option | SCRIPT | 6ae399223695c563ea50eef3 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae399253695c563ea50eef4 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Validate and route option (SCRIPT, id=6ae399223695c563ea50eef3)

```javascript
// COMEN01C / COADM01C. Input: type (select | exit), menu (MAIN | ADMIN), option, userType
// OptionalModuleToggles (DT-19) — defaults from the wiki: both false.
var pendingAuthorizationEnabled = false;
var transactionTypeMaintenanceEnabled = false;

// EN-13 UserMenuOption (COMEN02Y) / EN-14 AdminMenuOption (COADM02Y). userType = required user type of the option.
var userOptions = [
  { label: "Account View", userType: "U", target: "ACCOUNT_SEARCH" },
  { label: "Account Update", userType: "U" },
  { label: "Credit Card List", userType: "U" },
  { label: "Credit Card View", userType: "U" },
  { label: "Credit Card Update", userType: "U" },
  { label: "Transaction List", userType: "U" },
  { label: "Transaction View", userType: "U" },
  { label: "Transaction Add", userType: "U" },
  { label: "Transaction Reports", userType: "U" },
  { label: "Bill Payment", userType: "U", target: "BILL_PAYMENT" },
  { label: "Pending Authorization View", userType: "U", installed: pendingAuthorizationEnabled }
];
var adminOptions = [
  { label: "User List (Security)" },
  { label: "User Add (Security)" },
  { label: "User Update (Security)" },
  { label: "User Delete (Security)" },
  { label: "Transaction Type List/Update (Db2)", installed: transactionTypeMaintenanceEnabled },
  { label: "Transaction Type Maintenance (Db2)", installed: transactionTypeMaintenanceEnabled }
];

var type = input.type ? String(input.type) : "select";
var menu = input.menu ? String(input.menu) : "MAIN";
var menuScreen = menu === "ADMIN" ? "ADMIN_MENU" : "MAIN_MENU";
var raw = input.option == null ? "" : String(input.option).trim();

if (type === "exit") {
  // BR-05: PF3 on a menu returns to sign-on (session is dropped)
  output.ui = { screen: "SIGNON", menuMessage: "", menuSelection: "", signonMessage: "", userId: "", password: "",
                session: { userId: "", userType: "", firstName: "", lastName: "" } };
} else {
  var options = menu === "ADMIN" ? adminOptions : userOptions;
  var n = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : 0;
  if (n < 1 || n > options.length) {
    // BR-01
    output.ui = { screen: menuScreen, menuSelection: raw, menuMessage: "Please enter a valid option number..." };
  } else {
    var opt = options[n - 1];
    var userType = input.userType ? String(input.userType) : "U";
    if (menu === "MAIN" && userType === "U" && opt.userType === "A") {
      // BR-02 (never triggers with the legacy table: every option is type U)
      output.ui = { screen: menuScreen, menuSelection: raw, menuMessage: "No access - Admin Only option..." };
    } else if (opt.installed === false || !opt.target) {
      // BR-03: option whose program is not installed (optional module off, or function outside this build)
      output.ui = { screen: menuScreen, menuSelection: raw, menuMessage: "This option " + opt.label + " is not installed..." };
    } else if (opt.target === "ACCOUNT_SEARCH") {
      output.ui = { screen: "ACCOUNT_SEARCH", menuSelection: "", menuMessage: "",
                    searchAcctId: "", acctMessage: "", acct: {} };
    } else {
      output.ui = { screen: "BILL_PAYMENT", menuSelection: "", menuMessage: "",
                    billAcctId: "", billConfirm: "", billBalance: "", billMessage: "", billMessageKind: "" };
    }
  }
}
```

_(server: 226 ms, 1 API call, 224 ms in API)_
