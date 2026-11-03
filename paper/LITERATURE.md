# Related work and novelty check (2026-10-27)

Compiled by a research agent from about 32 web searches plus a search of CardDemo's own GitHub tracker. The agent
reports opening every URL below to confirm title and authors; spot-check before citing. "Not found in N searches"
means exactly that, not "novel".

## Facts that change how we present results

- **CardDemo's public tracker already names several behaviours we score.** We can say builds *named* these before
  scoring, never that they *discovered* them.
  - PR #32 (open, 2026-02-24): missing `ROUNDED` in CBACT04C (= our change request CR1), a sign problem in the
    CBTRN02C credit check (not CR2's 10% buffer), the CBTRN03C end-of-file double count (= TRANREPT LASTDUP).
    https://github.com/aws-samples/aws-mainframe-modernization-carddemo/pull/32
  - Issue #64 (2026-10-03): the INTCALC last-account defect.
    https://github.com/aws-samples/aws-mainframe-modernization-carddemo/issues/64
  - Issue #21 (2025-02): account group shown as spaces.
    https://github.com/aws-samples/aws-mainframe-modernization-carddemo/issues/21
  - Not found in 5 tracker searches: CREASTMT city truncation, the orphan-card abend, the 51×10 overflow, NUL filler.
- **CR1 can be supplied by memory** (it is in PR #32). Use CR2 as the headline change request and CR1 as the
  "memory can supply it" contrast.
- **The flagged-vs-silent record weakens under disguise:** 1 silent divergence among scored builds with output,
  but 4 of 6 under the A5 disguise. Part of the "flagged in advance" record comes from memory of the public code.
- **A private timestamped deposit proves nothing to outsiders** until the package is released.

## COBOL, legacy modernization, equivalence testing

- Hans et al., "Automated Testing of COBOL to Java Transformation," FSE 2025 Industry. https://arxiv.org/abs/2504.10548
- Froimovich, Gal, Ibraheem, Ziv, "Quality Evaluation of COBOL to Java Code Transformation," 2025. https://arxiv.org/abs/2507.23356
- Ferenczi et al., "Agentic Method for Deterministic Validation of Legacy Code Migration," 2026. https://arxiv.org/abs/2607.28271
- Entin, Gu, Knapp, Chen, "SEDCoT," 2026 (GnuCOBOL as differential-testing reference). https://arxiv.org/abs/2607.04092
- Ahmed & Galib, "AgentModernize," 2026. https://arxiv.org/abs/2605.17535
- Dau et al., "COBOL-Coder," 2026. https://arxiv.org/abs/2604.03986
- Alves, Politowski, Montandon, "Legacy System Modernization with Coding Agents: A Case Study," 2026 (VB6→C#, 70% equivalence, $1.66–10.28 per feature). https://arxiv.org/abs/2608.28972
- Diggs et al., "Leveraging LLMs for Legacy Code Modernization…," LLM4Code 2025. https://arxiv.org/abs/2411.14971
- Factory, "Legacy-Bench," 2026 blog post, not peer reviewed. https://factory.com/news/legacy-bench

## Translation with execution feedback

- Pan et al., "Lost in Translation," ICSE 2024. https://arxiv.org/abs/2308.03109
- Yang et al., "UniTrans," FSE 2024. https://arxiv.org/abs/2404.14646
- Yuan et al., "TransAgent," FSE 2026. https://arxiv.org/abs/2409.19894

## Self-review, warnings, silent failures

- Reddy, Lolla, Sanku, "Articulate but Wrong," 2026. https://arxiv.org/abs/2605.21537
- Mehta, "Confident and Wrong," 2026. https://arxiv.org/abs/2603.25764
- Spiess et al., "Calibration and Correctness of Language Models for Code," ICSE 2025. https://arxiv.org/abs/2402.02047
- Wu & Fard, "HumanEvalComm," TOSEM 2025. https://arxiv.org/abs/2406.00215

## Memorization and contamination controls

- Le et al., "When Names Disappear" (ClassEval-Obf), 2025. https://arxiv.org/abs/2510.03178
- Liang, Garg, Zilouchian Moghaddam, "The SWE-Bench Illusion," 2025. https://arxiv.org/abs/2506.12286

## Documentation as specification, round trips

- Allamanis, Panthaplackel, Yin, "Round-Trip Correctness," ICML 2024. https://proceedings.mlr.press/v235/allamanis24a.html
- Nitin, Krishna, Ray, "SpecTra." https://arxiv.org/abs/2405.18574
- Grynets et al., "Code2Text2Code," 2026. https://arxiv.org/abs/2605.25232
- Zhang et al., "PROOF," 2026. https://arxiv.org/abs/2609.06383
- Eghbali, Liu, Pradel, "Documentary," 2026. https://arxiv.org/abs/2606.22247
- Getmanov et al., "Beyond Lexical Similarity," ICML 2026 workshop. https://icml.cc/virtual/2026/82800
- Wang et al., "SWD-Bench," 2026. https://arxiv.org/abs/2604.06793
- Hoang et al., "CodeWiki." https://arxiv.org/abs/2510.24428

## Change requests and spec-driven development

- Dao, Bucaioni, Cicchetti, "Change-Aware Round-Trip Benchmarking of LLMs," JSS 2026. https://www.es.mdu.se/publications/7418-Change_Aware_Round_Trip_Benchmarking_of_LLMs
- Hill, "Specification Artifacts in Open-Source PR Workflows Do Not Reduce Defects," ESEM 2026. https://doi.org/10.4230/LIPIcs.ESEM.2026.84

## Robustness of generated code

- Li et al., "A Preliminary Study on the Robustness of Code Generation by LLMs," 2025 (LLM code tends to under-validate; our builds over-validate). https://arxiv.org/abs/2503.20197

## Pre-registration

- Ernst & Baldassarre, "Registered Reports in Software Engineering," EMSE. https://arxiv.org/abs/2302.03649
- NeurIPS pre-registration workshops: 2020 https://neurips.cc/virtual/2020/workshop/16158 · 2021 https://neurips.cc/virtual/2021/workshop/21885
- Irving & Holden, blockchain-timestamped protocols, F1000Research 2016, **retracted**. https://f1000research.com/articles/5-222

## Novelty per angle

| Angle | Closest prior work | Gap (as searched) |
|---|---|---|
| Change request verified against the re-run modified legacy | Dao et al. (data model ↔ schema, no executed oracle); PROOF | Not found in 3 searches |
| Documentation ablation against an executed legacy oracle, memory-controlled | Round-trip correctness, Documentary, SWD-Bench, Beyond Lexical Similarity (unit tests, no legacy oracle, no memory control) | Not found in 3 searches |
| Warnings frozen before scoring, checked against an executed oracle | Articulate but Wrong, Calibration (ICSE'25), HumanEvalComm (post-hoc judgement) | No freeze-before-scoring design found |
| Over-validation against data the legacy accepts | Li et al. 2025 (under-validation) | Not found in 1 targeted search |
| Planted changes in legacy, does the doc pipeline follow | — | Not found in 1 search |

## Not novel (already published)

- Builder sees legacy diffs (oracle in the loop): UniTrans, TransAgent, SEDCoT, Ferenczi et al.
- Differential fuzzing / GnuCOBOL as oracle: SEDCoT, Ferenczi et al., Hans et al.
- Round-trip wiki (code → wiki → build → wiki): round-trip correctness, Documentary, PROOF, Code2Text2Code.
- Multi-language targets: general translation literature.
- Pre-registration as a contribution: established in SE and ML; blockchain timestamping proposed in 2016 (retracted). Use for credibility, not as a headline.
- Cost per verified record: Alves et al. report cost next to equivalence.
- "Builds found unknown legacy bugs": not claimable for the last-account, double-count or blank-group defects.
