# Verifying the pre-registration timestamps

Each frozen file was hashed with SHA-256 and the hash, not the file, was stamped with OpenTimestamps
(https://opentimestamps.org) on public calendars. A stamp proves that the file existed, byte for byte, no later than
the Bitcoin block it is anchored in. Only hashes ever left the study's machine.

| Frozen file | Governs | SHA-256 | Earliest Bitcoin block | In this repository |
|---|---|---|---|---|
| `CardDemo_preregistration.zip` | protocol v1 + A1–A4, contract, bundles, golden v1, cases, scorer, tools (MANIFEST.sha256 inside) | `20f51c6b…0acd30d3` | 973059 (2026-10-25T10:44:06Z) | **unchanged: verifiable** |
| `a5a6/PROTOCOL_A5A6.md` | A5 recall control, A6 ontology arm | `b984896b…25e82c25` | 973071 | **unchanged: verifiable** |
| `a7/PROTOCOL_A7.md` | A7 cue paths for the disguised variant | `03157881…0a642f4f` | 973082 | **unchanged: verifiable** |
| `withdrawn_544a088/PROTOCOL_A5A6.md` | withdrawn: a protocol file in which the A5/A6 edit had failed to save; replaced by `a5a6/` before any A5/A6 build | `00243e49…909b5515` | 973071 | **unchanged: verifiable** |
| `a12a14/PROTOCOL_A12-A14.md` | layer 1 (CREASTMT, TRANREPT) | `cb3a9945…b610e5c1` | 973237 | reading copy |
| `a15/PROTOCOL_A15.md` | A15 exploratory harness re-run | `a22548ec…61960dc5` | 973299 | reading copy |
| `a16a18/PROTOCOL_A16-A18.md` | A16 change request CR1/CR2, A17 wiki ablation, A18 harness after fixes | `75e12d80…001bc00d` | 973463 | reading copy |
| `a19/PROTOCOL_A19.md` | A19 harness on the A19 image | `350d86fe…7da5ac78` | 973480 | reading copy |
| `a20/PROTOCOL_A20.md` | A20 harness on the A20 image | `6f9718e6…59be3808` | 973528 | reading copy |
| `a21/PROTOCOL_A21.md` | A21 change requests CR3–CR8 | `3b9e1199…d8f9f908` | 973533 | reading copy |
| `a21/A21_MANIFEST.sha256` | the 136 A21 instruments: golden/cr3–cr8, CR sources, changed-record lists, independent models, bundles, novelty log | `b5eb5998…b13b7f81` | 973533 | **unchanged: verifiable here** |
| `a22/PROTOCOL_A22.md` | A22 retry of a turn-level platform stop | `7eb62f3a…7163f001` | 973540 | reading copy |

Blocks are those `ots verify` reported on 2026-10-29. Full hashes are in each `.sha256` file (the A21 manifest has none of its own; its full hash is `b5eb599897e7b115ba2edd5be8beb79b9da622e1edf201fdfe3ff91db13b7f81`). "Earliest block" is the
first Bitcoin attestation in the proof; the proofs carry several, one per calendar.

## What ships, and why

- **Unchanged and verifiable:** the pre-registration package (`CardDemo_preregistration.zip`), the A5/A6 and A7
  protocol files and the withdrawn A5/A6 file. They match their hashes and their stamps.
- **Reading copies (`*.REDACTED.md`)** replace the frozen protocol files from A12 on. The originals name internal
  infrastructure (an environment label, a container registry path, internal change numbers). A reading copy has those
  passages replaced and therefore does **not** match its hash; the `.sha256` and `.ots` files ship unchanged, so each
  stamp can be checked against the recorded hash. A23–A32 follow the same pattern; with A16–A22 their stamps are
  attested in Bitcoin blocks 973463–974238.
- **The A21 manifest** ships unchanged. It lists 136 files by hash; every one of them is in this repository.

`protocol/PROTOCOL.md` is the current protocol with every amendment, with the same internal names replaced.

## Check

```bash
python3 -m venv run/ots && run/ots/bin/pip install -q opentimestamps-client
shasum -a 256 protocol/frozen/a21/A21_MANIFEST.sha256                 # b5eb5998…b13b7f81, as in the table
run/ots/bin/ots --no-bitcoin verify protocol/frozen/a21/A21_MANIFEST.sha256.ots
#   checks the file against the proof, then prints one line per calendar, e.g. "check that Bitcoin block 973533 has merkleroot d021d842…":
#   compare with any block explorer
run/ots/bin/ots verify protocol/frozen/a21/A21_MANIFEST.sha256.ots   # full check against a local Bitcoin Core node
sed 's#  builds/inputs/#  inputs/wikis/#' protocol/frozen/a21/A21_MANIFEST.sha256 | shasum -a 256 -c --quiet -
```

The last line checks the 136 instruments against the stamped manifest (the study repository kept the bundles in
`builds/inputs/`; here they are in `inputs/wikis/`). For a held-back file, the stamp can be checked against its
recorded hash now, and against the file once released:

```bash
run/ots/bin/ots --no-bitcoin verify -d "$(cut -c1-64 protocol/frozen/a16a18/PROTOCOL_A16-A18.md.sha256)" \
  protocol/frozen/a16a18/PROTOCOL_A16-A18.md.ots                    # now: the recorded hash was stamped
cd protocol/frozen/a16a18 && shasum -a 256 -c PROTOCOL_A16-A18.md.sha256 && ots verify PROTOCOL_A16-A18.md.ots   # once released
```

The `.ots` files for A5/A6, A7, the withdrawn copy, A16–A22 and the A21 manifest are stored as stamped, with the
attestation pending inside the file (the package, A12–A14 and A15 proofs were upgraded); `ots verify`
fetches it from the public calendars (network needed), or `ots upgrade <file>.ots` writes it into the file. A stamp
made shortly before a refresh can show "pending" until a Bitcoin block includes it.
