# golden-online/v1: oracle results against the CASE.md predictions

Produced by `tools/run_golden_online.sh v1` on 2026-10-29. Stub, driver and the programs are at the commit that adds
this directory. Each case directory has these files:
- `screens.log`: every screen sent, the typed input and the task ends.
- `cics.log`: every EXEC CICS command with RESP/RESP2 and the rules that decided it.
- `files/*.txt`: the unloaded files. USRSEC has its password column masked.
- `steps.txt`: the driver input.
- `stdout.txt`: driver output, including the programs' DISPLAY lines.
- `outcome.txt`.

Every CASE.md was committed (490dc88) before the first oracle run.

| case | outcome | matches CASE.md | deviation from the prediction |
|---|---|---|---|
| o-sgn-01 | OK | yes | |
| o-sgn-02 | OK | yes | |
| o-sgn-03 | OUT-OF-SLICE COADM01C | yes | |
| o-mnu-01 | OK | yes | |
| o-mnu-02 | OUT-OF-SLICE COACTUPC | yes | |
| o-avw-01 | OK | yes | |
| o-avw-02 | OK | partly | Step 4 (blank): the program says `No input received`. The prediction said "prompt for account id". The prediction was wrong; the code sets WS-PROMPT-FOR-INPUT. The other steps are as predicted. |
| o-avw-03 | OK | yes | Message: `Account:00000000002 not found in Acct Master file.Resp:000000013  Reas:0000`. The message field truncates RESP2. |
| o-avw-04 | OK | yes | |
| o-avw-05 | OK | yes | `File Error: READ on CXACAIX returned RESP 000000015 ,RESP2 000000140` |
| o-bil-01 | OK | yes | The success screen is sent twice in the task (WRITE-TRANSACT-FILE sends it, then PROCESS-ENTER-KEY sends it again). |
| o-bil-02 | OK | yes | |
| o-bil-03 | OK | yes | |
| o-bil-04 | OK | partly | Three SEND MAPs in step 5, not two: `Account ID NOT found...`, then the success screen twice. As predicted, the card number in the new TRANSACT record is 16 x X'00'. |
| o-bil-05 | OK | yes | `Unable to lookup XREF AIX file...` is sent first. The payment uses card 2988091353094312. |
| o-bil-06 | OK, task abend AEIP | yes | Rests on the assumed rule R-BR-FF-EMPTY. Keep it out of scoring. |
| o-bil-07 | OK | partly | First run: FATAL, because RECEIVE MAP on an unformatted screen was not modelled. Fix: rule R-RCV-UNFORMATTED (MAPFAIL, mainframe RECEIVE MAP conditions: data "does not contain a set-buffer-address (SBA) sequence"), self-test M14. Second run: COSGN00C is reached by XCTL with a commarea, gets MAPFAIL on its RECEIVE (coded with RESP) and shows `Please enter User ID ...`. The prediction only said "sign-on screen". |

Only the second run of o-bil-07 is kept here. The first run's FATAL was a stub gap, not a program result.

Scoring notes for A24:
- o-bil-04: exclude TRAN-CARD-NUM. It is uninitialised WORKING-STORAGE, so its value is undefined on z/OS.
- o-bil-06: unscored, because it rests on an assumed CICS rule.
- o-sgn-03 and o-mnu-02: score only up to the XCTL out of the slice.
