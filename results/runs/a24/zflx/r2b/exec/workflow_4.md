# Workflow: ui_signon

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** COSGN00C sign-on: validate input, read users store, verify password, route by user type. Returns UI state keys.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae44aa93695c563ea5120fc | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae44aab3695c563ea5120fd | <uuid> | (500, 0) | → Input valid? (seq:<uuid>) | lang: JAVASCRIPT |
| Input valid? | FORK | 6ae44aae3695c563ea5120fe | <uuid> | (1000, 0) | → Read user [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read user | DATA_SOURCE | 6ae44ab33695c563ea5120ff | <uuid> | (1500, 0) | → Verify password [SUCCESS] (seq:<uuid>), → Verify password [FAIL] (seq:<uuid>) | responseKey: userRec, endpoint: <uuid> |
| Verify password | SCRIPT | 6ae44ab43695c563ea512100 | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae44ab53695c563ea512103 | <uuid> | (2500, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read user

## Scripts

### Validate input (SCRIPT, id=6ae44aab3695c563ea5120fd)

```javascript
// COSGN00C PROCESS-ENTER-KEY: mandatory checks (BR-01, BR-02), then upper-case (BR-03)
function s(v) { return (v === null || v === undefined) ? "" : String(v); }
var uid = s(input.userId).trim();
var pwd = s(input.password).trim();
output.inputOk = false;
if (uid === "") {
  output.vm = { screen: "SIGNON", signonMsg: "Please enter User ID ..." };
} else if (pwd === "") {
  output.vm = { screen: "SIGNON", signonMsg: "Please enter Password ..." };
} else {
  output.inputOk = true;
  output.usrId = uid.toUpperCase();
  output.pwdUpper = pwd.toUpperCase();
}

```

### Input valid? (FORK, id=6ae44aae3695c563ea5120fe)
  0. [IF] input.inputOk === true  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Verify password (SCRIPT, id=6ae44ab43695c563ea512100)

```javascript
// COSGN00C READ-USER-SEC-FILE: found -> compare password (BR-05), route by type (BR-07);
// not found (BR-04); any other read failure (BR-06). The password never leaves this workflow.
var rec = input.userRec;
var user = (rec && rec.data) ? rec.data : null;
var emptyResult = rec && !rec.data && Object.keys(rec).length === 0;
if (user) {
  var stored = (user.pwd === null || user.pwd === undefined) ? "" : String(user.pwd).trim();
  if (stored === input.pwdUpper) {
    var isAdmin = String(user.usr_type) === "A";
    output.vm = {
      screen: isAdmin ? "ADMIN" : "MENU",
      signonMsg: "",
      signon: { userId: "", password: "" },
      session: {
        userId: String(user.usr_id),
        userType: isAdmin ? "A" : "U",
        firstName: user.first_name ? String(user.first_name) : "",
        lastName: user.last_name ? String(user.last_name) : ""
      },
      menuOption: "",
      menuMsg: ""
    };
  } else {
    output.vm = { screen: "SIGNON", signonMsg: "Wrong Password. Try again ...", signon: { userId: input.usrId, password: "" } };
  }
} else if (emptyResult) {
  output.vm = { screen: "SIGNON", signonMsg: "User not found. Try again ...", signon: { userId: input.usrId, password: "" } };
} else {
  output.vm = { screen: "SIGNON", signonMsg: "Unable to verify the User ...", signon: { userId: input.usrId, password: "" } };
}

```

## Data source bindings

### Read user (DATA_SOURCE, id=6ae44ab33695c563ea5120ff)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** findUserById — flowxUuid <uuid>
- **responseKey:** userRec
- **variables:**
  - usrId [DB operation param] <uuid> ← `${usrId}`

_(server: 327 ms, 3 API calls, 323 ms in API)_
