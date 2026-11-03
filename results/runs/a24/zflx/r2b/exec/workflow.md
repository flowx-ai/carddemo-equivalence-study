# Workflow: ui_menu

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** COMEN01C / COADM01C: validate the entered option and route to the target screen. Returns UI state keys.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae44e453695c563ea5121b4 | <uuid> | (0, 0) | → Route option (seq:<uuid>) |
| Route option | SCRIPT | 6ae44e473695c563ea5121b5 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae44e4a3695c563ea5121b6 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Route option (SCRIPT, id=6ae44e473695c563ea5121b5)

```javascript
// COMEN01C / COADM01C PROCESS-ENTER-KEY.
// OptionalModuleToggles (DT-19) — both default false; keep in step with the UI's `toggles` state key.
var TOGGLES = { pendingAuthorizationEnabled: false, transactionTypeMaintenanceEnabled: false };
// EN-13 UserMenuOption (COMEN02Y): all options are type U (legacy defect F-02 preserved)
var USER_OPTS = [
  { name: "Account View", screen: "ACCT" },
  { name: "Account Update" }, { name: "Credit Card List" }, { name: "Credit Card View" },
  { name: "Credit Card Update" }, { name: "Transaction List" }, { name: "Transaction View" },
  { name: "Transaction Add" }, { name: "Transaction Reports" },
  { name: "Bill Payment", screen: "BILL" },
  { name: "Pending Authorization View", toggle: "pendingAuthorizationEnabled" }
];
// EN-14 AdminMenuOption (COADM02Y)
var ADMIN_OPTS = [
  { name: "User List" }, { name: "User Add" }, { name: "User Update" }, { name: "User Delete" },
  { name: "Transaction Type List/Update", toggle: "transactionTypeMaintenanceEnabled" },
  { name: "Transaction Type Maintenance", toggle: "transactionTypeMaintenanceEnabled" }
];
function s(v) { return (v === null || v === undefined) ? "" : String(v).trim(); }

var menu = s(input.menu) === "ADMIN" ? "ADMIN" : "MENU";
var userId = s(input.userId);
var userType = s(input.userType);
var raw = s(input.option);
var vm = { screen: menu, menuOption: raw, menuMsg: "" };

if (userId === "") {
  vm = { screen: "SIGNON", signonMsg: "" };
} else if (menu === "ADMIN" && userType !== "A") {
  vm.menuMsg = "No access - Admin Only option...";
} else {
  var opts = menu === "ADMIN" ? ADMIN_OPTS : USER_OPTS;
  var n = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : 0;
  if (n < 1 || n > opts.length) {
    vm.menuMsg = "Please enter a valid option number...";
  } else {
    var opt = opts[n - 1];
    if (opt.toggle && !TOGGLES[opt.toggle]) {
      vm.menuMsg = "This option " + opt.name + " is not installed...";
    } else if (opt.screen === "ACCT") {
      vm = { screen: "ACCT", menuOption: "", menuMsg: "",
             acct: { accountId: "" }, acctMsg: "", acctFound: false, acctView: {} };
    } else if (opt.screen === "BILL") {
      vm = { screen: "BILL", menuOption: "", menuMsg: "",
             bill: { accountId: "", confirm: "" }, billBalance: "", billMsg: "", billMsgType: "" };
    } else {
      // target function is not part of this build (only sign-on, menus, account view, bill payment)
      vm.menuMsg = "This option is coming soon ...";
    }
  }
}
output.vm = vm;

```

_(server: 197 ms, 1 API call, 195 ms in API)_
