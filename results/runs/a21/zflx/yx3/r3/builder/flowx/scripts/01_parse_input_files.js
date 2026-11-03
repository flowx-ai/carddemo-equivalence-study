// Node "Parse Input Files" — reads the four fixed-width inputs of the statement step
// (CONTRACT.md layer 1): transact.dat (CVTRA05Y, 350), acctdata.dat (CVACT01Y, 300),
// cardxref.dat (CVACT03Y, 50), custdata.dat (CUSTREC, 500). Offsets follow the attribute
// order and sizes of DT-05, DT-01, DT-04 and DT-02 in the project data model.
// Parsed data is handed on as a JSON string (avoids GraalVM foreign objects between nodes).

var warnings = [];

function toLines(s) {
  if (s === null || s === undefined) return [];
  var t = String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var arr = t.split('\n');
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].replace(/\s+$/, '').length > 0) out.push(arr[i]);
  }
  return out;
}

// 1-based start, fixed length, space-padded when the line is short
function fld(rec, start, len) {
  var v = rec.substring(start - 1, start - 1 + len);
  while (v.length < len) v += ' ';
  return v;
}

function numKey(v) {
  var t = String(v).trim();
  if (/^[0-9]+$/.test(t)) {
    t = t.replace(/^0+/, '');
    return t === '' ? '0' : t;
  }
  return t;
}

// Signed zoned decimal with two implied decimals (S9(n)V99) -> integer cents.
// Accepts overpunch ({A-I positive, }J-R negative), ASCII zoned negatives (p-y),
// a separate leading/trailing sign, or an explicit decimal point.
function zonedCents(raw, where) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var tail = s.charAt(s.length - 1);
  if (tail === '-') { neg = true; s = s.substring(0, s.length - 1); }
  else if (tail === '+') { s = s.substring(0, s.length - 1); }
  var last = s.charAt(s.length - 1);
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', ANEG = 'pqrstuvwxy';
  if (POS.indexOf(last) >= 0) {
    s = s.substring(0, s.length - 1) + POS.indexOf(last);
  } else if (NEG.indexOf(last) >= 0) {
    neg = true; s = s.substring(0, s.length - 1) + NEG.indexOf(last);
  } else if (ANEG.indexOf(last) >= 0) {
    neg = true; s = s.substring(0, s.length - 1) + ANEG.indexOf(last);
  }
  var cents;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    var ip = p[0] === '' ? '0' : p[0];
    var fp = (p[1] + '00').substring(0, 2);
    if (!/^[0-9]+$/.test(ip) || !/^[0-9]{2}$/.test(fp)) {
      warnings.push('non-numeric amount ' + where + ': [' + raw + '] read as 0');
      return 0;
    }
    cents = parseInt(ip, 10) * 100 + parseInt(fp, 10);
  } else {
    if (!/^[0-9]+$/.test(s)) {
      warnings.push('non-numeric amount ' + where + ': [' + raw + '] read as 0');
      return 0;
    }
    cents = parseInt(s, 10);
  }
  return neg ? -cents : cents;
}

// transact.dat — CVTRA05Y
var transactions = [];
var tl = toLines(input.transact);
for (var i = 0; i < tl.length; i++) {
  var r = tl[i];
  transactions.push({
    seq: i,
    transactionId: fld(r, 1, 16),
    typeCode: fld(r, 17, 2),
    categoryCode: fld(r, 19, 4),
    source: fld(r, 23, 10),
    description: fld(r, 33, 100),
    amountCents: zonedCents(fld(r, 133, 11), 'transact.dat line ' + (i + 1)),
    cardNumber: fld(r, 263, 16).trim()
  });
}

// acctdata.dat — CVACT01Y
var accounts = {};
var al = toLines(input.acctdata);
for (var j = 0; j < al.length; j++) {
  var a = al[j];
  var acctId = fld(a, 1, 11);
  accounts[numKey(acctId)] = {
    accountId: acctId,
    activeStatus: fld(a, 12, 1),
    currentBalanceCents: zonedCents(fld(a, 13, 12), 'acctdata.dat line ' + (j + 1) + ' curr-bal'),
    creditLimitCents: zonedCents(fld(a, 25, 12), 'acctdata.dat line ' + (j + 1) + ' credit-limit'),
    currentCycleCreditCents: zonedCents(fld(a, 79, 12), 'acctdata.dat line ' + (j + 1) + ' cyc-credit'),
    currentCycleDebitCents: zonedCents(fld(a, 91, 12), 'acctdata.dat line ' + (j + 1) + ' cyc-debit')
  };
}

// cardxref.dat — CVACT03Y
var xrefs = [];
var xl = toLines(input.cardxref);
for (var k = 0; k < xl.length; k++) {
  var x = xl[k];
  xrefs.push({
    seq: k,
    cardNumber: fld(x, 1, 16),
    customerId: fld(x, 17, 9),
    accountId: fld(x, 26, 11)
  });
}

// custdata.dat — CUSTREC (SSN is deliberately not carried: it is never printed)
var customers = {};
var cl = toLines(input.custdata);
for (var m = 0; m < cl.length; m++) {
  var c = cl[m];
  var custId = fld(c, 1, 9);
  customers[numKey(custId)] = {
    customerId: custId,
    firstName: fld(c, 10, 25),
    middleName: fld(c, 35, 25),
    lastName: fld(c, 60, 25),
    addressLine1: fld(c, 85, 50),
    addressLine2: fld(c, 135, 50),
    addressLine3: fld(c, 185, 50),
    addressState: fld(c, 235, 2),
    addressCountry: fld(c, 237, 3),
    addressZip: fld(c, 240, 10),
    phone1: fld(c, 250, 15),
    ficoScore: fld(c, 330, 3)
  };
}

output.parsedInputJson = JSON.stringify({
  transactions: transactions,
  accounts: accounts,
  xrefs: xrefs,
  customers: customers,
  counts: {
    transactions: transactions.length,
    accounts: al.length,
    xrefs: xrefs.length,
    customers: cl.length
  },
  warnings: warnings
});
// raw files are no longer needed downstream (keeps the SCRIPT payload small)
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;
