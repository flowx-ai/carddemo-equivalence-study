
# ---- FlowX SCRIPT node entry (appended to intcalc_core.py in the node) ----
def _in(key, default=None):
    v = input.get(key)
    return default if v is None else v

_res = run_intcalc(
    str(_in("acctdata", "")),
    str(_in("tcatbal", "")),
    str(_in("cardxref", "")),
    str(_in("discgrp", "")),
    str(_in("parmDate", "2022071800")),
    str(_in("businessDate", "2022-07-18")),
    str(_in("postLastAccount", False)).lower() == "true",
)
output["systran"] = _res["systran"]
output["accounts"] = _res["accounts"]
output["warnings"] = _res["warnings"]
output["lastAccountId"] = _res["last_account_id"]
