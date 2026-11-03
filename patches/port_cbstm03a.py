# Port patch for CBSTM03A: comment out the z/OS control-block walk (PSA -> TCB -> TIOT), source lines 266-291.
# It only DISPLAYs the job name and DD names; it reads no file and writes no field used later.
# Off-mainframe it dereferences address 0 and crashes. Output: ported/CBSTM03A.CBL. The original is not touched.
import pathlib
here = pathlib.Path(__file__).parent.parent
src = (here / "src/CBSTM03A.CBL").read_text().split("\n")
first, last = 266, 291
assert src[first - 1].strip().startswith("SET ADDRESS OF PSA-BLOCK"), src[first - 1]
assert src[last - 1].strip() == "END-IF.", src[last - 1]
for i in range(first - 1, last):
    line = src[i].ljust(7)
    src[i] = line[:6] + "*" + line[7:]
(here / "ported/CBSTM03A.CBL").write_text("\n".join(src))
print(f"commented lines {first}-{last}")
