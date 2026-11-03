# Workflow: ui_signon

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Sign-on screen (COSGN00C): validate input, read USRSEC, verify password, route by user type. type = signon | exit

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3a3c63695c563ea50f7c7 | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae3a3c93695c563ea50f7c8 | <uuid> | (500, 0) | → Lookup needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Lookup needed? | FORK | 6ae3a3cc3695c563ea50f7cb | <uuid> | (1000, 0) | → Read USRSEC [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read USRSEC | DATA_SOURCE | 6ae3a3d93695c563ea50f7d2 | <uuid> | (1500, 0) | → Verify password [SUCCESS] (seq:<uuid>), → Read error [FAIL] (seq:<uuid>) | responseKey: userRecord, endpoint: <uuid> |
| Verify password | SCRIPT | 6ae3a3da3695c563ea50f7d3 | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Read error | SCRIPT | 6ae3a3db3695c563ea50f7d4 | <uuid> | (2000, 250) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae3a3dc3695c563ea50f7d5 | <uuid> | (2500, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read USRSEC

## Scripts

### Validate input (SCRIPT, id=6ae3a3c93695c563ea50f7c8)

```javascript
// COSGN00C PROCESS-ENTER-KEY / PF3 handling.
// Returns the UI state through output.result; output.lookupUserId drives the USRSEC read.
function str(v) { return v == null ? "" : String(v); }

var type = str(input.type);
var userId = str(input.userId).trim().toUpperCase();     // BR-03 upper-case
var password = str(input.password).trim().toUpperCase(); // BR-03 upper-case

output.lookupUserId = "";
output.enteredPassword = "";

if (type === "exit") {
  // BR-08: PF3 ends the application with the thank-you message.
  output.result = {
    screen: "GOODBYE",
    signon: { userId: "", password: "", message: "" },
    session: { userId: "", userType: "", firstName: "", lastName: "", accountId: "" },
    goodbye: { message: "Thank you for using CardDemo application..." }
  };
} else if (userId === "") {
  // BR-01
  output.result = { screen: "SIGNON", signon: { userId: "", password: "", message: "Please enter User ID ..." } };
} else if (password === "") {
  // BR-02
  output.result = { screen: "SIGNON", signon: { userId: userId, password: "", message: "Please enter Password ..." } };
} else {
  output.lookupUserId = userId;
  output.enteredPassword = password;
  output.result = null;
}
```

### Lookup needed? (FORK, id=6ae3a3cc3695c563ea50f7cb)
  0. [IF] input.lookupUserId != null && input.lookupUserId !== ''  (id: <uuid>)
  1. [ELSE] true  (id: <uuid>)

### Verify password (SCRIPT, id=6ae3a3da3695c563ea50f7d3)

```javascript
// COSGN00C READ-USER-SEC-FILE result handling. The password never leaves this node.
function str(v) { return v == null ? "" : String(v); }

var rec = input.userRecord && input.userRecord.data ? input.userRecord.data : null;
var userId = str(input.lookupUserId);

if (rec == null) {
  // BR-04 (RESP 13 NOTFND)
  output.result = { screen: "SIGNON", signon: { userId: userId, password: "", message: "User not found. Try again ..." } };
} else if (str(rec.pwd) !== str(input.enteredPassword)) {
  // BR-05
  output.result = { screen: "SIGNON", signon: { userId: userId, password: "", message: "Wrong Password. Try again ..." } };
} else {
  // BR-07: type A -> admin menu, anything else -> regular user menu.
  var userType = str(rec.usr_type) === "A" ? "A" : "U";
  output.result = {
    screen: userType === "A" ? "ADMIN_MENU" : "MAIN_MENU",
    signon: { userId: "", password: "", message: "" },
    session: {
      userId: str(rec.usr_id),
      userType: userType,
      firstName: str(rec.first_name),
      lastName: str(rec.last_name),
      accountId: ""
    },
    // OptionalModuleToggles (DT-19) — defaults false.
    toggles: { pendingAuthorizationEnabled: false, transactionTypeMaintenanceEnabled: false },
    menu: { option: "", message: "" },
    adminMenu: { option: "", message: "" }
  };
}
// Do not keep credentials in the workflow output.
output.enteredPassword = "";
output.userRecord = null;
```

### Read error (SCRIPT, id=6ae3a3db3695c563ea50f7d4)

```javascript
// BR-06: any other USRSEC read failure.
output.result = { screen: "SIGNON", signon: { userId: input.lookupUserId == null ? "" : String(input.lookupUserId), password: "", message: "Unable to verify the User ..." } };
output.enteredPassword = "";
```

## Data source bindings

### Read USRSEC (DATA_SOURCE, id=6ae3a3d93695c563ea50f7d2)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** findUserById — flowxUuid <uuid>
- **responseKey:** userRecord
- **variables:**
  - userId [DB operation param] <uuid> ← `${lookupUserId}`

_(server: 501 ms, 3 API calls, 498 ms in API)_
