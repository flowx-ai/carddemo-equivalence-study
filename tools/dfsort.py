# Minimal emulation of the three DFSORT steps in the CardDemo JCL, applied to fixed-length record files.
# usage:
#   dfsort.py combtran  <out> <in1> <in2> ...      SORT FIELDS=(TRAN-ID,A)            (COMBTRAN STEP05R)
#   dfsort.py creastmt  <out> <in>                 SORT FIELDS=(263,16,CH,A,1,16,CH,A)
#                                                  OUTREC FIELDS=(1:263,16,17:1,262,279:279,50)  (CREASTMT STEP010)
#   dfsort.py tranrept  <out> <in> <start> <end>   INCLUDE TRAN-PROC-DT between dates; SORT FIELDS=(TRAN-CARD-NUM,A)
# Records are 350 bytes. DFSORT sorts are stable for equal keys only with EQUALS; Python's sort is stable, and
# no equal keys occur in this data (checked below).
import sys
N = 350
def recs(path):
    b = open(path, "rb").read(); assert len(b) % N == 0, path
    return [b[i:i+N] for i in range(0, len(b), N)]
mode, out, *args = sys.argv[1:]
if mode == "combtran":
    r = [x for p in args for x in recs(p)]; key = lambda x: x[0:16]
    r.sort(key=key)
elif mode == "creastmt":
    key = lambda x: (x[262:278], x[0:16])
    r = [ (x[262:278] + x[0:262] + x[278:328]).ljust(N, b" ") for x in sorted(recs(args[0]), key=key)]
    key = lambda x: x[0:32]
elif mode == "tranrept":
    s, e = args[1].encode(), args[2].encode()
    r = [x for x in recs(args[0]) if s <= x[304:314] <= e]; key = lambda x: x[262:278]
    r.sort(key=key)
keys = [key(x) for x in r]
dups = len(keys) - len(set(keys))
open(out, "wb").write(b"".join(r))
print(f"{mode}: {len(r)} records, {dups} equal keys")
