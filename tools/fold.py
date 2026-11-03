# Splits a fixed-length record file into one record per line (every record newline-terminated).
import sys
n, src, dst = int(sys.argv[1]), sys.argv[2], sys.argv[3]
b = open(src, "rb").read()
assert len(b) % n == 0, f"{src}: {len(b)} bytes is not a multiple of {n}"
open(dst, "wb").write(b"".join(b[i:i+n] + b"\n" for i in range(0, len(b), n)))
