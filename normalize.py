# Normalize CardDemo ASCII sample data: strip CR, right-pad to copybook record length. Nothing else changes.
import os, sys, pathlib
# CARDDEMO = a clone of aws-samples/aws-mainframe-modernization-carddemo at the pinned commit (see README).
SRC = pathlib.Path(os.environ.get("CARDDEMO", "carddemo")) / "app/data/ASCII"
OUT = pathlib.Path(__file__).parent / "data/in"
LEN = {"acctdata": 300, "carddata": 150, "cardxref": 50, "custdata": 500, "dailytran": 350,
       "discgrp": 50, "tcatbal": 50, "trancatg": 60, "trantype": 60}
for name, n in LEN.items():
    lines = (SRC / f"{name}.txt").read_bytes().replace(b"\r", b"").split(b"\n")
    recs = [l for l in lines if l.strip()]
    assert all(len(r) <= n for r in recs), name
    (OUT / f"{name}.dat").write_bytes(b"".join(r.ljust(n) + b"\n" for r in recs))
    print(name, len(recs), n)
