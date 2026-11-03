# Upstream: AWS CardDemo

The COBOL programs and copybooks in this folder are unmodified copies from AWS CardDemo, open source (Apache-2.0):

- Repository: https://github.com/aws-samples/aws-mainframe-modernization-carddemo
- Commit: `59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e`
- `LICENSE` and `NOTICE` in this folder are the upstream files, unchanged.

Each file is byte-identical to the file of the same name under `app/` at that commit, except two stubs written for
this study (ours, Apache-2.0, Copyright 2026 FlowX.AI, see the top-level `LICENSE`):

- `CEE3ABD.cbl`: stands in for the Language Environment abend service, which GnuCOBOL does not provide;
- `RUNPARM.cbl`: supplies the run parameter that the JCL passes on z/OS.

Modified copies of CardDemo sources elsewhere in this repository, each marked as changed:
- `ported/` (build output, not tracked): CBSTM03A with a z/OS control-block walk commented out by `patches/port_cbstm03a.py`;
- `disguise/d1/src/`: renamed identifiers and five changed values (the recall-control arm, A5), see `disguise/d1/map.json`;
- `cr/cr1/src/` to `cr/cr8/src/`: one rule changed per program (the change-request arms, A16 and A21), see `cr/NOTICE.md`.

Legal check pending: the redistribution of these files in a public repository has not yet been reviewed.
