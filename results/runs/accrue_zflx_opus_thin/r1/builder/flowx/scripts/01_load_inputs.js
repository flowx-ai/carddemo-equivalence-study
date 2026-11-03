// FlowX SCRIPT node "Load inputs" (workflow accrue_interest_calculation).
// Parses the four ACCRUE inputs (ledgaccFile, balcatFile, cardlinkFile, rategrpFile) into plain
// records. Each input is the raw file text, either
// fixed-width copybook records (one per line) or a JSON list of objects (the oracle's POSTDAY
// outputs postday_ledgacc.json / postday_balcat.json). Amounts are carried as integer strings in
// the unit of their last decimal (cents for V99), so no float arithmetic ever touches money.
// Result: output.loaded = JSON string { accounts, balcats, xrefs, rates, warnings }.

var warnings = [];

function str(v) { return v === null || v === undefined ? "" : String(v); }
function isJsonText(s) { var t = s.replace(/^\s+/, ""); return t.charAt(0) === "[" || t.charAt(0) === "{"; }
function recordLines(s, len) {
  var out = [];
  var parts = s.split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i];
    if (l.replace(/\s+/g, "") === "") continue;
    while (l.length < len) l += " ";
    out.push(l);
  }
  return out;
}
function jsonList(s) {
  var v = JSON.parse(s);
  if (Array.isArray(v)) return v;
  for (var k in v) if (Array.isArray(v[k])) return v[k];
  return [];
}
function rtrim(s) { return str(s).replace(/\s+$/, ""); }

// Signed numeric -> integer string scaled by 10^scale.
//  - fixed-width zoned decimal (implied decimal point, sign overpunched on the last digit:
//    '{'..'I' = +0..+9, '}'..'R' = -0..-9), or
//  - a display value with an explicit point / sign ("14.56", "-500", 1234.5).
var POS = "{ABCDEFGHI";
var NEG = "}JKLMNOPQR";
function scaled(raw, scale, field, display) {
  var s = str(raw).trim();
  if (s === "") return "0";
  var neg = false;
  if (s.charAt(0) === "-" || s.charAt(0) === "+") { neg = s.charAt(0) === "-"; s = s.slice(1).trim(); }
  var last = s.charAt(s.length - 1);
  if (last === "-" || last === "+") { neg = last === "-"; s = s.slice(0, -1).trim(); last = s.charAt(s.length - 1); }
  var p = POS.indexOf(last), n = NEG.indexOf(last);
  if (p >= 0) s = s.slice(0, -1) + p;
  else if (n >= 0) { s = s.slice(0, -1) + n; neg = true; }
  var digits;
  if (s.indexOf(".") >= 0) {
    var ip = s.split(".")[0], fp = s.split(".")[1] || "";
    while (fp.length < scale) fp += "0";
    if (fp.length > scale) { warnings.push("more than " + scale + " decimals truncated in " + field + ": " + raw); fp = fp.slice(0, scale); }
    digits = (ip === "" ? "0" : ip) + fp;
  } else if (display || typeof raw === "number") {
    digits = s;
    for (var z = 0; z < scale; z++) digits += "0";
  } else {
    digits = s; // implied decimal point
  }
  if (!/^[0-9]+$/.test(digits)) { warnings.push("non-numeric " + field + " '" + raw + "' read as 0"); return "0"; }
  var v = digits.replace(/^0+/, "");
  if (v === "") return "0";
  return neg ? "-" + v : v;
}
function intOf(raw) { var s = str(raw).trim(); var v = s.replace(/^0+/, ""); return v === "" ? "0" : v; }

// ---- ledgacc: LXV022Y, 300 bytes ----------------------------------------------------------
function loadAccounts(s) {
  if (s.trim() === "") return [];
  if (isJsonText(s)) {
    return jsonList(s).map(function (a) {
      return {
        acct_id: intOf(a.acct_id), active_status: rtrim(a.active_status),
        curr_bal: scaled(a.curr_bal, 2, "curr_bal", true), credit_limit: scaled(a.credit_limit, 2, "credit_limit", true),
        cash_credit_limit: scaled(a.cash_credit_limit, 2, "cash_credit_limit", true),
        open_date: rtrim(a.open_date), expiration_date: rtrim(a.expiration_date), reissue_date: rtrim(a.reissue_date),
        curr_cyc_credit: scaled(a.curr_cyc_credit, 2, "curr_cyc_credit", true), curr_cyc_debit: scaled(a.curr_cyc_debit, 2, "curr_cyc_debit", true),
        addr_zip: rtrim(a.addr_zip), group_id: rtrim(a.group_id)
      };
    });
  }
  return recordLines(s, 300).map(function (r) {
    return {
      acct_id: intOf(r.substring(0, 11)), active_status: rtrim(r.substring(11, 12)),
      curr_bal: scaled(r.substring(12, 24), 2, "LACC-CURR-BAL"),
      credit_limit: scaled(r.substring(24, 36), 2, "LACC-CREDIT-LIMIT"),
      cash_credit_limit: scaled(r.substring(36, 48), 2, "LACC-CASH-CREDIT-LIMIT"),
      open_date: rtrim(r.substring(48, 58)), expiration_date: rtrim(r.substring(58, 68)), reissue_date: rtrim(r.substring(68, 78)),
      curr_cyc_credit: scaled(r.substring(78, 90), 2, "LACC-CURR-CYC-CREDIT"),
      curr_cyc_debit: scaled(r.substring(90, 102), 2, "LACC-CURR-CYC-DEBIT"),
      addr_zip: rtrim(r.substring(102, 112)), group_id: rtrim(r.substring(112, 122))
    };
  });
}

// ---- balcat: LXV026Y, 50 bytes ------------------------------------------------------------
function loadBalcats(s) {
  if (s.trim() === "") return [];
  if (isJsonText(s)) {
    return jsonList(s).map(function (b) {
      return { acct_id: intOf(b.acct_id), type_cd: rtrim(b.type_cd), cat_cd: intOf(b.cat_cd), bal: scaled(b.bal, 2, "bal", true) };
    });
  }
  return recordLines(s, 50).map(function (r) {
    return {
      acct_id: intOf(r.substring(0, 11)), type_cd: rtrim(r.substring(11, 13)),
      cat_cd: intOf(r.substring(13, 17)), bal: scaled(r.substring(17, 28), 2, "TXN-CAT-BAL")
    };
  });
}

// ---- cardlink: LXV024Y, 50 bytes ----------------------------------------------------------
function loadXrefs(s) {
  if (s.trim() === "") return [];
  if (isJsonText(s)) {
    return jsonList(s).map(function (x) {
      return { card_num: rtrim(x.card_num), cust_id: intOf(x.cust_id), acct_id: intOf(x.acct_id) };
    });
  }
  return recordLines(s, 50).map(function (r) {
    return { card_num: rtrim(r.substring(0, 16)), cust_id: intOf(r.substring(16, 25)), acct_id: intOf(r.substring(25, 36)) };
  });
}

// ---- rategrp: LXV027Y, 50 bytes -----------------------------------------------------------
function loadRates(s) {
  if (s.trim() === "") return [];
  if (isJsonText(s)) {
    return jsonList(s).map(function (g) {
      return { group_id: rtrim(g.group_id), type_cd: rtrim(g.type_cd), cat_cd: intOf(g.cat_cd), int_rate: scaled(g.int_rate, 2, "int_rate", true) };
    });
  }
  return recordLines(s, 50).map(function (r) {
    return {
      group_id: rtrim(r.substring(0, 10)), type_cd: rtrim(r.substring(10, 12)),
      cat_cd: intOf(r.substring(12, 16)), int_rate: scaled(r.substring(16, 22), 2, "RG-INT-RATE")
    };
  });
}

var loaded = {
  accounts: loadAccounts(str(input.ledgaccFile)),
  balcats: loadBalcats(str(input.balcatFile)),
  xrefs: loadXrefs(str(input.cardlinkFile)),
  rates: loadRates(str(input.rategrpFile)),
  warnings: warnings
};
output.loaded = JSON.stringify(loaded);
