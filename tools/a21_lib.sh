#!/usr/bin/env bash
# A21 (protocol §13): the change-request definitions tools/a21_score.sh and tools/a21_selftest.sh read. Sourced, not
# run. Public copy: the private file also holds the build drivers' settings (platform image digest, workspace, prompt
# path), which are not needed to score.
#   a21_def <cr3..cr8>   sets ID (bundle id), STEP, PDF (bundle)
a21_def() {
  case $1 in
    cr3) ID=ni2; STEP=intcalc;; cr4) ID=va7; STEP=posttran;; cr5) ID=dr8; STEP=posttran;;
    cr6) ID=bd5; STEP=creastmt;; cr7) ID=ix3; STEP=tranrept;; cr8) ID=yx3; STEP=creastmt;;
    *) echo "unknown change request $1" >&2; return 1;;
  esac
  PDF=inputs/wikis/${STEP}-sonnet-${ID}.pdf
}
