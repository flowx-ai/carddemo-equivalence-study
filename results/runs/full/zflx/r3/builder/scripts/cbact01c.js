// CBACT01C - account extract: acctext_out, acctext_array, acctext_vb, acctext_sysout
var sysout = ["START OF EXECUTION OF PROGRAM CBACT01C"], outRecs = [], arrRecs = [], vbRecs = [];
var rc = openAll([["acctdata", "ERROR OPENING ACCTFILE"]], sysout);
if (!rc) {
  var al = lines(getIn("acctdata"));
  for (var i = 0; i < al.length; i++) {
    var a = parseAcct(al[i]), r = a.raw;
    sysout.push("ACCT-ID                 :" + r.substr(0, 11));
    sysout.push("ACCT-ACTIVE-STATUS      :" + r.substr(11, 1));
    sysout.push("ACCT-CURR-BAL           :" + r.substr(12, 12));
    sysout.push("ACCT-CREDIT-LIMIT       :" + r.substr(24, 12));
    sysout.push("ACCT-CASH-CREDIT-LIMIT  :" + r.substr(36, 12));
    sysout.push("ACCT-OPEN-DATE          :" + r.substr(48, 10));
    sysout.push("ACCT-EXPIRAION-DATE     :" + r.substr(58, 10));
    sysout.push("ACCT-REISSUE-DATE       :" + r.substr(68, 10));
    sysout.push("ACCT-CURR-CYC-CREDIT    :" + r.substr(78, 12));
    sysout.push("ACCT-CURR-CYC-DEBIT     :" + r.substr(90, 12));
    sysout.push("ACCT-GROUP-ID           :" + r.substr(112, 10));
    sysout.push("-------------------------------------------------");
    outRecs.push({ acct_id: a.acct_id, active_status: a.active_status, curr_bal: amt(a.bal), credit_limit: amt(a.lim), cash_credit_limit: amt(a.cash),
      open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date.replace(/-/g, ""),
      curr_cyc_credit: amt(a.cred), curr_cyc_debit: a.deb === 0 ? 2525.00 : null, group_id: a.group_id });
    arrRecs.push({ acct_id: a.acct_id, curr_bal_1: amt(a.bal), curr_cyc_debit_1: 1005.00, curr_bal_2: amt(a.bal), curr_cyc_debit_2: 1525.00,
      curr_bal_3: -1025.00, curr_cyc_debit_3: -2500.00, curr_bal_4: null, curr_cyc_debit_4: null, curr_bal_5: null, curr_cyc_debit_5: null });
    vbRecs.push({ acct_id: a.acct_id, active_status: a.active_status });
    vbRecs.push({ acct_id: a.acct_id, curr_bal: amt(a.bal), credit_limit: amt(a.lim), reissue_yyyy: a.reissue_date.substring(0, 4) });
    sysout.push(rs(r));
  }
  sysout.push("END OF EXECUTION OF PROGRAM CBACT01C");
}
R.acctext_out = outRecs;
R.acctext_array = arrRecs;
R.acctext_vb = vbRecs;
finish("acctext", sysout, rc);
