# Change-request oracles (A16, A21)

`cr/cr1/src/` to `cr/cr8/src/` are **modified copies** of AWS CardDemo programs (https://github.com/aws-samples/
aws-mainframe-modernization-carddemo, commit `59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e`, Apache-2.0, Copyright
Amazon.com, Inc. or its affiliates; license and notice in `src/LICENSE` and `src/NOTICE`). Each changes one business
rule for the change-request arms: CR1 and CR2 were edited by hand (diffs in the protocol, A16), CR3 to CR8 are
written by `cr/make_src_cr3_8.py` from the unchanged files in `src/`. The changes are Copyright 2026 FlowX.AI,
Apache-2.0. Everything else in `cr/` is the study's own code and data (Apache-2.0, see the top-level `LICENSE`).

The CR3 to CR8 files listed in `protocol/frozen/a21/A21_MANIFEST.sha256` are byte-identical to the stamped versions.
Paths in that manifest and in these scripts use the study repository's layout: `builds/inputs/` there is
`inputs/wikis/` here, and `runs/` there is `results/runs/` here.
