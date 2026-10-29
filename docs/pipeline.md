# Pipeline

```
SharePoint library (prototype: data/raw + data/inbox)
  │  1 ingest     file hash (skip unchanged), text layer or OCR (Tesseract deu+eng), word boxes per page
  │  2 chunk      strip headers/footers, split at clause headings, windows for long sections
  │  3 extract    one structured call per contract over the WHOLE text -> register entry
  │  4 check      deterministic checks + independent checker call -> status, confidence, signals
  │  5 families   duplicates, amendments, current company name, every legacy-name occurrence
  │  6 index      context line per chunk, FTS5 (BM25) + embeddings for hybrid search
  ▼
contract register (SQLite here, PostgreSQL + Azure AI Search in Azure)
```

Run: `python -m pipeline.run` (idempotent), `--watch` for the inbox, `--reassess` to replay
the deterministic checks on stored model output without model calls,
`python -m eval.check_register` to compare against the gold set.

## Why one call over the whole contract

A missing clause can only be shown by reading the whole contract. Top-k retrieval returns
the most similar passages; it can never prove that something is not there. Our contracts
fit into one call (largest CUAD contract ~15k tokens); longer ones are split into section
batches and merged (PRESENT anywhere wins, then UNCLEAR, else ABSENT).

## Checks after the model (guardrail sandwich)

| Check | Catches | Effect |
| --- | --- | --- |
| Quote must exist in the source (fuzzy ≥ 90, parts joined by "..." checked one by one) | invented quotes | UNCLEAR |
| Quote must not come from a span that addresses software | prompt injection (M14) | UNCLEAR |
| Quote must contain vocabulary of its clause type | quote filed under the wrong clause (M08) | UNCLEAR |
| Checker call sees only definition + quote (four-eyes principle) | semantic misreading (M08, C04, C08, C11, C12) | UNCLEAR |
| Narrow absence signals for ABSENT | overlooked clause | confidence 0.6 -> review |
| OCR quality, suspected injection in document | weak evidence | confidence capped |

The confidence comes from these signals, not from the model. Every finding keeps
`model_status` (what the model said) next to `status` (what the register says).

## Results on the gold set (2026-10-29)

| | extract-v1 | extract-v2 |
| --- | --- | --- |
| Q1-Q8 recall | Q1 0.80 (M08 missed) | 1.00 on all 8 |
| Q1-Q8 precision | 0.80-1.00 (C04 typed as merchant agreement) | 1.00 on all 8 |
| Metadata (law, date, type) on 27 own docs | 27/27 | 27/27 |
| CUAD limitation of liability vs lawyer labels | 17/20 (2 quote-format errors) | 19/20 |
| Cost of a full run (47 docs) | ~$0.10 | ~$0.12 incl. checker and embeddings |

Lesson from v1: the small model reported the data protection clause of M08 as a limitation
of liability, with a correct quote. Quote verification alone does not catch that; the
relevance check and the checker do (both fired independently in v2).

Remaining CUAD difference (C03): lawyers labelled a termination-payment formula as a cap;
under our playbook definition it is not. A definition question for Legal, not a model error.

Raw outputs: `eval/results/`.
