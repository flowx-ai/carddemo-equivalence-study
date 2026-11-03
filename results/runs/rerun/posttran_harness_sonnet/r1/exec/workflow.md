# Workflow: DraftPostingAssumptions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae07cd9ad7ea9e18be42018 | <uuid> | (0, 0) | → Draft assumptions (seq:<uuid>) |
| End | END | 6ae07cdaad7ea9e18be42019 | <uuid> | (600, 0) | — |
| Draft assumptions | AI | 6ae07cdaad7ea9e18be4201a | <uuid> | (300, 0) | → End [SUCCESS] (seq:<uuid>) | responseKey: draftLog, aiType: TEXT_UNDERSTANDING, responseSchema: set |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae07cdaad7ea9e18be4201a)
instructions:

```
Author a fixed implementation decision log in English. Use only the supplied wikiPassages and approvedAssumptions. For every approved assumption produce exactly one entry containing whatWasAssumed, supportingWikiStatementOrOmission, and sourcePage (posttran-sonnet.pdf p.N or pp.N-M). Distinguish a documented rule from an assumed resolution; identify omissions explicitly. Do not invent quotations or evidence, choose further business rules, claim durable restart or file creation, or introduce runtime AI into posting. Return assumptions as Markdown containing the same numbered entries, each with labels 'What was assumed' and 'Wiki statement or omission' plus its source. Never omit the file-interface limitations. Do not receive or invent customer batch data. The log will be frozen into the deterministic implementation after verification; do not imply it changes on each run.
```
userMessage:

```
Wiki passages:
${wikiPassages}
Approved implementation assumptions:
${approvedAssumptions}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["assumptionEntries","assumptions"],"properties":{"assumptions":{"type":"string"},"assumptionEntries":{"type":"array","items":{"type":"object","required":["whatWasAssumed","supportingWikiStatementOrOmission","sourcePage"],"properties":{"sourcePage":{"type":"string"},"whatWasAssumed":{"type":"string"},"supportingWikiStatementOrOmission":{"type":"string"}},"additionalProperties":false},"minItems":1}},"additionalProperties":false}
```

_(server: 314 ms, 1 API call, 311 ms in API)_
