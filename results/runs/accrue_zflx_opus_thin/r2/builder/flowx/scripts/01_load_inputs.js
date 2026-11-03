// ACCRUE / Interest Calculation — node "Load Inputs" (FlowX SCRIPT, JavaScript).
// Reads the raw input files handed to the workflow and parses them into plain records.
// Inputs (strings): ledgacc (LXV022Y, 300), balcat (LXV026Y, 50), rategrp (LXV027Y, 50), cardlink (LXV024Y, 50).
// ledgacc / balcat may also be the POSTDAY JSON outputs (postday_ledgacc.json / postday_balcat.json).
// Money is carried as integer units of 0.01 (cents); rates as integer units of 0.01 percent.

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }
function pad(s, n) { s = str(s); while (s.length < n) s += ' '; return s; }
function isJson(text) { return str(text).replace(/^\s+/, '').charAt(0) === '['; }
function records(text, len) {
  return str(text).split(/\r?\n/)
    .filter(function (l) { return l.replace(/\s/g, '').length > 0; })
    .map(function (l) { return pad(l, len); });
}
function digitsInt(raw) {
  var d = str(raw).replace(/[^0-9]/g, '');
  return d === '' ? 0 : parseInt(d, 10);
}

// Signed DISPLAY numeric (PIC S9(n)V99). Accepts trailing overpunch ({A-I / }J-R, or GnuCOBOL p-y),
// separate leading/trailing +/- and an explicit decimal point. Returns integer units of 10^-scale.
function zoned(raw, scale) {
  var s = str(raw).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-') { neg = true; s = s.substring(0, s.length - 1); }
  else if (last === '+') { s = s.substring(0, s.length - 1); }
  last = s.charAt(s.length - 1);
  var d;
  if ((d = '{ABCDEFGHI'.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + d; }
  else if ((d = '}JKLMNOPQR'.indexOf(last)) >= 0) { neg = true; s = s.substring(0, s.length - 1) + d; }
  else if ((d = 'pqrstuvwxy'.indexOf(last)) >= 0) { neg = true; s = s.substring(0, s.length - 1) + d; }
  var units;
  var dot = s.indexOf('.');
  if (dot >= 0) {
    units = decimalUnits(s, scale);
  } else {
    units = digitsInt(s.replace(/ /g, '0')); // implied decimal point: digits already in 10^-scale units
  }
  return neg ? -units : units;
}

// Plain decimal text/number ("14.56", "-500", 12.5) -> integer units of 10^-scale (excess digits truncated).
function decimalUnits(raw, scale) {
  var s = str(raw).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); } else if (s.charAt(0) === '+') { s = s.substring(1); }
  var dot = s.indexOf('.');
  var ip = dot >= 0 ? s.substring(0, dot) : s;
  var fp = dot >= 0 ? s.substring(dot + 1) : '';
  while (fp.length < scale) fp += '0';
  fp = fp.substring(0, scale);
  var units = digitsInt(ip) * Math.pow(10, scale) + digitsInt(fp);
  return neg ? -units : units;
}

function parseAccounts(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (a) {
      return {
        acct_id: digitsInt(a.acct_id), active_status: rtrim(a.active_status),
        curr_bal: decimalUnits(a.curr_bal, 2), credit_limit: decimalUnits(a.credit_limit, 2),
        cash_credit_limit: decimalUnits(a.cash_credit_limit, 2),
        open_date: rtrim(a.open_date), expiration_date: rtrim(a.expiration_date), reissue_date: rtrim(a.reissue_date),
        curr_cyc_credit: decimalUnits(a.curr_cyc_credit, 2), curr_cyc_debit: decimalUnits(a.curr_cyc_debit, 2),
        addr_zip: rtrim(a.addr_zip), group_id: rtrim(a.group_id)
      };
    });
  }
  return records(text, 300).map(function (r) {
    return {
      acct_id: digitsInt(r.substring(0, 11)), active_status: rtrim(r.substring(11, 12)),
      curr_bal: zoned(r.substring(12, 24), 2), credit_limit: zoned(r.substring(24, 36), 2),
      cash_credit_limit: zoned(r.substring(36, 48), 2),
      open_date: rtrim(r.substring(48, 58)), expiration_date: rtrim(r.substring(58, 68)), reissue_date: rtrim(r.substring(68, 78)),
      curr_cyc_credit: zoned(r.substring(78, 90), 2), curr_cyc_debit: zoned(r.substring(90, 102), 2),
      addr_zip: rtrim(r.substring(102, 112)), group_id: rtrim(r.substring(112, 122))
    };
  });
}

function parseBalcat(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (b) {
      return { acct_id: digitsInt(b.acct_id), type_cd: rtrim(b.type_cd), cat_cd: digitsInt(b.cat_cd), bal: decimalUnits(b.bal, 2) };
    });
  }
  return records(text, 50).map(function (r) {
    return { acct_id: digitsInt(r.substring(0, 11)), type_cd: rtrim(r.substring(11, 13)), cat_cd: digitsInt(r.substring(13, 17)), bal: zoned(r.substring(17, 28), 2) };
  });
}

function parseRategrp(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (g) {
      return { group_id: rtrim(g.group_id), type_cd: rtrim(g.type_cd), cat_cd: digitsInt(g.cat_cd), int_rate: decimalUnits(g.int_rate, 2) };
    });
  }
  return records(text, 50).map(function (r) {
    return { group_id: rtrim(r.substring(0, 10)), type_cd: rtrim(r.substring(10, 12)), cat_cd: digitsInt(r.substring(12, 16)), int_rate: zoned(r.substring(16, 22), 2) };
  });
}

function parseCardlink(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (c) {
      return { card_num: rtrim(c.card_num), cust_id: digitsInt(c.cust_id), acct_id: digitsInt(c.acct_id) };
    });
  }
  return records(text, 50).map(function (r) {
    return { card_num: rtrim(r.substring(0, 16)), cust_id: digitsInt(r.substring(16, 25)), acct_id: digitsInt(r.substring(25, 36)) };
  });
}

output.loaded = JSON.stringify({
  accounts: parseAccounts(input.ledgacc),
  balcats: parseBalcat(input.balcat),
  rates: parseRategrp(input.rategrp),
  links: parseCardlink(input.cardlink)
});
