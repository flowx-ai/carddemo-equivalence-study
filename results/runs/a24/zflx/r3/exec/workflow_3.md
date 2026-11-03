# Workflow: ui_signon

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Sign-on screen (COSGN00C / user-signon P-01): validate, look up user in the users store, verify password, build session, route by user type.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae440333695c563ea511b2c | <uuid> | (0, 0) | → Validate Input (seq:<uuid>) |
| Validate Input | SCRIPT | 6ae440363695c563ea511b2d | <uuid> | (500, 0) | → Input valid? (seq:<uuid>) | lang: JAVASCRIPT |
| Input valid? | FORK | 6ae440393695c563ea511b2e | <uuid> | (1000, 0) | → Lookup User [cond:<uuid>] (seq:<uuid>), → Verify And Respond [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Lookup User | DATA_SOURCE | 6ae4403d3695c563ea511b2f | <uuid> | (1500, 0) | → Verify And Respond [SUCCESS] (seq:<uuid>), → Verify And Respond [FAIL] (seq:<uuid>) | responseKey: userDoc, endpoint: <uuid> |
| Verify And Respond | SCRIPT | 6ae4403e3695c563ea511b30 | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae4403f3695c563ea511b31 | <uuid> | (2500, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Lookup User

## Scripts

### Validate Input (SCRIPT, id=6ae440363695c563ea511b2d)

```javascript
// COSGN00C PROCESS-ENTER-KEY: BR-01, BR-02 (mandatory fields), BR-03 (upper-case)
function str(v) { return v === null || v === undefined ? "" : String(v); }
var uid = str(input.userId).trim().toUpperCase();
var pwd = str(input.password).trim().toUpperCase();
var msg = "";
if (uid === "") {
  msg = "Please enter User ID ...";
} else if (pwd === "") {
  msg = "Please enter Password ...";
}
output.chk = { ok: msg === "", usrId: uid, pwd: pwd, message: msg };
```

### Input valid? (FORK, id=6ae440393695c563ea511b2e)
  0. [IF] input.chk.ok === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Verify And Respond (SCRIPT, id=6ae4403e3695c563ea511b30)

```javascript
// COSGN00C READ-USER-SEC-FILE: BR-04..BR-07. Builds the UI Flow view model (returned by END as ${ui}).
// The password (typed or stored) never leaves this workflow (process spec: session holds no password).
var t = functions.cd_a24_sf6_zflx_r3.optionalModuleToggles({"in": {"caller": "ui_signon"}});
var chk = input.chk || {};
var msg = chk.message || "";
var session = null;
var screen = "signon";

if (chk.ok === true) {
  var resp = input.userDoc;
  var u = resp ? resp.data : null;
  if (resp === null || resp === undefined || resp.error || resp.errorMessage) {
    msg = "Unable to verify the User ...";            // BR-06 other file error
  } else if (!u || u.usr_id === null || u.usr_id === undefined) {
    msg = "User not found. Try again ...";            // BR-04
  } else if (String(u.pwd) !== chk.pwd) {
    msg = "Wrong Password. Try again ...";            // BR-05
  } else {
    var type = String(u.usr_type || "").toUpperCase();
    session = {
      userId: String(u.usr_id),
      userType: type,
      firstName: u.first_name ? String(u.first_name) : "",
      lastName: u.last_name ? String(u.last_name) : "",
      accountId: ""
    };
    screen = type === "A" ? "adminMenu" : "menu";     // BR-07
    msg = "";
  }
}

output.ui = {
  screen: screen,
  session: session,
  toggles: {
    pendingAuthorizationEnabled: t.out.pendingAuthorizationEnabled === true,
    transactionTypeMaintenanceEnabled: t.out.transactionTypeMaintenanceEnabled === true
  },
  signon: { userId: session ? "" : (chk.usrId || ""), password: "", message: msg },
  menu: { option: "", message: "", messageType: "" },
  adminMenu: { option: "", message: "", messageType: "" }
};
output.chk = null;
output.userDoc = null;
```

## Data source bindings

### Lookup User (DATA_SOURCE, id=6ae4403d3695c563ea511b2f)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** findUserById — flowxUuid <uuid>
- **responseKey:** userDoc
- **variables:**
  - usrId [DB operation param] <uuid> ← `${chk.usrId}`

_(server: 352 ms, 3 API calls, 346 ms in API)_
