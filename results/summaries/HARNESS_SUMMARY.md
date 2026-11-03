# Harness arm (A8) × INTCALC: results

Builder: the harness on dev-env (`gpt-6.1-sol`, org manager), driven through its API under A2's gate rules. Scored
against golden v1 (the COBOL program under GnuCOBOL) on five sets. Flags were mapped from each build's own assumption
register before execution (commits d906ce6 and 2b0f9fd). integration-designer: `local-325fa180e5-…` for Sonnet r1 and
its repair; `local-210d0c0490-1793002770` for the rest (the only change concerns ONTOLOGY nodes, which none of these
builds uses).

## Pre-registered scores (strict = business on every set)

| build | plan outcome | base | c01 | c02 | c03 | c04 | why |
|---|---|---|---|---|---|---|---|
| Sonnet r1 | COMPLETED | 0 | 0 | 0 | 0 | 0 | rejects blank account group id |
| Sonnet r2 | PAUSED, nothing saved | 0 | 0 | 0 | 0 | 0 | no workflow (script over 20,000 characters) |
| Sonnet r3 | COMPLETED | 0 | 0 | 0 | 0 | 0 | rejects blank account group id |
| Opus r1 | COMPLETED (1 retry) | 0 | 0 | 0 | 0 | 0 | rejects groups whose rows carry different rates |
| Opus r2 | COMPLETED | 0 | 0 | 0 | 0 | 0 | rejects duplicate disclosure groups |
| Opus r3 | PAUSED after step 1 of 3 | 0 | 0 | 0 | 0 | 0 | rejects duplicate disclosure groups |

Every divergence is R-ABSENT and silent: no build returned any record on any set.

## Exploratory repairs (A9, A10): deletions only, by the operator

| build | deletions | base | c01 | c02 | c03 | c04 | remaining divergence |
|---|---|---|---|---|---|---|---|
| Sonnet r1 (A9) | 1 | 99.00 | 99.00 | 98.99 | 0 | 99.03 | last account (flagged); c03 rejects the orphan card link |
| Sonnet r3 (A10) | 2 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | last account (silent) |
| Opus r1 (A10) | 1 | 0 | 0 | 0 | 0 | 0 | not repairable: no rate for the blank group (no DEFAULT fallback) |
| Opus r2 (A10) | 1 | 0 | 0 | 0 | 0 | 0 | not repairable: same |
| Opus r3 (A10) | 2 | 0 | 0 | 0 | 0 | 0 | not repairable: same |

## Reading
- **Sonnet wiki:** both harness builds that left a workflow hold the legacy calculation, but put defensive input checks
  in front of it that the legacy program does not have. The CardDemo data trips them: blank group ids on every set,
  plus the orphan card link in c03. With those checks deleted they match legacy on every interest transaction. The only
  remaining divergence is the last account, which legacy does not rewrite (its end-of-file defect).
- **Opus wiki:** the wiki never mentions DEFAULT. All three harness builds model one rate per group, read from the
  disclosure file, and have no fallback for an account whose group has no row. Their stop is a difference in logic,
  not an extra check. By comparison the zflx builds given the same Opus wiki scored 99–100%, which notebook §25 already
  records as confounded by the builder's recall of the public CardDemo source.
- **Zflx comparison on the Sonnet wiki:** three of three zflx builds scored 99.00 / 99.00 / 98.99 / 99.00 / 99.03,
  c03 included. They accepted the blank group and the orphan link, as legacy does.
