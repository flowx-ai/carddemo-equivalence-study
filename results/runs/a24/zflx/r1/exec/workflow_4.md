# Workflow: ui_signon

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Sign-on screen (COSGN00C): init / signon / exit. Returns the sign-on view model as one object (END payload ${ui}).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae398983695c563ea50ee82 | <uuid> | (0, 0) | → Validate input (seq:<uuid>) |
| Validate input | SCRIPT | 6ae3989b3695c563ea50ee85 | <uuid> | (500, 0) | → Lookup needed? (seq:<uuid>) | lang: JAVASCRIPT |
| Lookup needed? | FORK | 6ae3989e3695c563ea50ee88 | <uuid> | (1000, 0) | → Read USRSEC [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| Read USRSEC | DATA_SOURCE | 6ae398a03695c563ea50ee89 | <uuid> | (1500, 0) | → Verify password [SUCCESS] (seq:<uuid>), → Unable to verify [FAIL] (seq:<uuid>) | responseKey: userLookup, endpoint: <uuid> |
| Verify password | SCRIPT | 6ae398a13695c563ea50ee8a | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Unable to verify | SCRIPT | 6ae398a23695c563ea50ee8b | <uuid> | (2000, 200) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae398a33695c563ea50ee8c | <uuid> | (2500, 0) | — |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Read USRSEC

## Scripts

### Validate input (SCRIPT, id=6ae3989b3695c563ea50ee85)

```javascript
// COSGN00C PROCESS-ENTER-KEY / PF3. type: init | signon | exit
var type = input.type ? String(input.type) : "signon";
var emptySession = { userId: "", userType: "", firstName: "", lastName: "" };
var rawUid = input.userId == null ? "" : String(input.userId);
var rawPwd = input.password == null ? "" : String(input.password);

if (type === "init") {
  output.route = "END";
  output.ui = { screen: "SIGNON", signonMessage: "", userId: "", password: "", exitMessage: "", session: emptySession };
} else if (type === "exit") {
  // BR-08: PF3 exits the application with a thank-you message (CSMSG01Y CCDA-MSG-THANK-YOU)
  output.route = "END";
  output.ui = { screen: "EXIT", signonMessage: "", userId: "", password: "", session: emptySession,
                exitMessage: "Thank you for using CardDemo application..." };
} else if (rawUid.trim() === "") {
  // BR-01
  output.route = "END";
  output.ui = { screen: "SIGNON", signonMessage: "Please enter User ID ...", userId: "", password: "", session: emptySession };
} else if (rawPwd.trim() === "") {
  // BR-02
  output.route = "END";
  output.ui = { screen: "SIGNON", signonMessage: "Please enter Password ...", userId: rawUid.trim().toUpperCase(), password: "", session: emptySession };
} else {
  // BR-03: both upper-cased before comparison
  output.route = "LOOKUP";
  output.lookupUserId = rawUid.trim().toUpperCase();
  output.enteredPassword = rawPwd.trim().toUpperCase();
}
```

### Lookup needed? (FORK, id=6ae3989e3695c563ea50ee88)
  0. [IF] input.route == "LOOKUP"  (id: <uuid>)
  1. [ELSE]   (id: <uuid>)

### Verify password (SCRIPT, id=6ae398a13695c563ea50ee8a)

```javascript
// COSGN00C READ-USER-SEC-FILE: found -> compare password -> route by user type
var emptySession = { userId: "", userType: "", firstName: "", lastName: "" };
var u = (input.userLookup && input.userLookup.data) ? input.userLookup.data : null;
if (!u || u.usr_id == null) {
  // BR-04 (RESP 13 NOTFND)
  output.ui = { screen: "SIGNON", signonMessage: "User not found. Try again ...", userId: input.lookupUserId, password: "", session: emptySession };
} else if (String(u.pwd == null ? "" : u.pwd) !== input.enteredPassword) {
  // BR-05
  output.ui = { screen: "SIGNON", signonMessage: "Wrong Password. Try again ...", userId: input.lookupUserId, password: "", session: emptySession };
} else {
  // BR-07: type A -> admin menu, anything else -> regular (main) menu. Session never carries the password.
  var userType = String(u.usr_type == null ? "" : u.usr_type);
  output.ui = {
    screen: userType === "A" ? "ADMIN_MENU" : "MAIN_MENU",
    signonMessage: "", userId: "", password: "", menuMessage: "", menuSelection: "",
    session: { userId: String(u.usr_id), userType: userType,
               firstName: u.first_name == null ? "" : String(u.first_name),
               lastName: u.last_name == null ? "" : String(u.last_name) }
  };
}
```

### Unable to verify (SCRIPT, id=6ae398a23695c563ea50ee8b)

```javascript
// BR-06: other file error
output.ui = { screen: "SIGNON", signonMessage: "Unable to verify the User ...", userId: input.lookupUserId, password: "",
              session: { userId: "", userType: "", firstName: "", lastName: "" } };
```

## Data source bindings

### Read USRSEC (DATA_SOURCE, id=6ae398a03695c563ea50ee89)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** findUserById — flowxUuid <uuid>
- **responseKey:** userLookup
- **variables:**
  - usrId [DB operation param] <uuid> ← `${lookupUserId}`

_(server: 471 ms, 3 API calls, 467 ms in API)_
