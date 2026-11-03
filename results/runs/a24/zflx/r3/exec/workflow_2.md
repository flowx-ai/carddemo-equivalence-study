# Workflow: ui_menu

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Main menu (COMEN01C) and admin menu (COADM01C) / menu-navigation P-02: validate the option, apply module toggles, route to the selected function screen.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae440a73695c563ea511ba4 | <uuid> | (0, 0) | → Validate And Route Option (seq:<uuid>) |
| Validate And Route Option | SCRIPT | 6ae440aa3695c563ea511ba9 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae440ac3695c563ea511bb0 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Validate And Route Option (SCRIPT, id=6ae440aa3695c563ea511ba9)

```javascript
// COMEN01C / COADM01C (menu-navigation P-02). Input: { type: "select"|"back"|"exit", option, session }.
// "back" = PF3 from a function screen: return to the menu of the user's type.
// Builds the UI Flow view model (returned by END as ${ui}).
function str(v) { return v === null || v === undefined ? "" : String(v); }

var t = functions.cd_a24_sf6_zflx_r3.optionalModuleToggles({"in": {"caller": "ui_menu"}});
var toggles = {
  pendingAuthorizationEnabled: t.out.pendingAuthorizationEnabled === true,
  transactionTypeMaintenanceEnabled: t.out.transactionTypeMaintenanceEnabled === true
};

// EN-13 UserMenuOption (COMEN02Y) - all type U (legacy, FI-03 decision)
var USER_OPTS = [
  { label: "Account View", screen: "acctSearch" },
  { label: "Account Update" },
  { label: "Credit Card List" },
  { label: "Credit Card View" },
  { label: "Credit Card Update" },
  { label: "Transaction List" },
  { label: "Transaction View" },
  { label: "Transaction Add" },
  { label: "Transaction Reports" },
  { label: "Bill Payment", screen: "billPay" },
  { label: "Pending Authorization View", toggle: "pendingAuthorizationEnabled" }
];
// EN-14 AdminMenuOption (COADM02Y)
var ADMIN_OPTS = [
  { label: "User List" },
  { label: "User Add" },
  { label: "User Update" },
  { label: "User Delete" },
  { label: "Transaction Type List/Update (DB2)", toggle: "transactionTypeMaintenanceEnabled" },
  { label: "Transaction Type Maintenance (DB2)", toggle: "transactionTypeMaintenanceEnabled" }
];

var s = input.session;
var session = null;
if (s && str(s.userId) !== "") {
  session = {
    userId: str(s.userId), userType: str(s.userType), firstName: str(s.firstName),
    lastName: str(s.lastName), accountId: str(s.accountId)
  };
}

var ui = { toggles: toggles };
var type = str(input.type);

if (session === null || type === "exit") {
  // BR-05: PF3 / Exit on a menu returns to sign-on (session ends)
  ui.screen = "signon";
  ui.session = null;
  ui.signon = { userId: "", password: "", message: "" };
  ui.menu = { option: "", message: "", messageType: "" };
  ui.adminMenu = { option: "", message: "", messageType: "" };
} else {
  var isAdmin = session.userType === "A";
  var opts = isAdmin ? ADMIN_OPTS : USER_OPTS;
  var raw = str(input.option).trim();
  var n = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : NaN;
  var msg = "", msgType = "error", screen = isAdmin ? "adminMenu" : "menu";

  if (type === "back") {
    raw = "";
  } else if (isNaN(n) || n < 1 || n > opts.length) {
    msg = "Please enter a valid option number...";                     // BR-01
  } else {
    var o = opts[n - 1];
    if (o.toggle && !toggles[o.toggle]) {
      msg = "This option " + o.label + " is not installed...";        // BR-03
    } else if (o.screen) {
      screen = o.screen;                                               // Call Activity -> function screen
    } else {
      msg = "This option " + o.label + " is coming soon ...";          // function not part of this build
      msgType = "info";
    }
  }

  ui.screen = screen;
  ui.session = session;
  var menuState = { option: msg !== "" ? raw : "", message: msg, messageType: msg !== "" ? msgType : "" };
  if (isAdmin) { ui.adminMenu = menuState; } else { ui.menu = menuState; }

  ui.acct = null;
  ui.cust = null;
  ui.acctView = { accountId: session.accountId, message: "" };
  ui.bill = { accountId: session.accountId, balance: "", confirm: "", message: "", messageType: "" };
}

output.ui = ui;
```

_(server: 175 ms, 1 API call, 173 ms in API)_
