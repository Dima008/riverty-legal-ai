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
`REGISTER_DB` and `INBOX_DIR` point a run at another register and another watched folder
(evaluation runs, demo rehearsals), so experiments never touch `var/register.sqlite` or `data/inbox`.

## Adding and removing a document

Adding is the normal run: a file in a source folder or the inbox is read, extracted and joined
to its family; the watcher looks every 5 s. A handwritten photo (H01, live demo) is in the
register with its findings about 10.5 s after the drop, for about $0.001 (`docs/demo.md`).

Removing: `python -m pipeline.forget <doc_id> [...]` (`pipeline/forget.py`), the first building
block of deletion sync. In Azure the Graph delta query on the SharePoint library returns a
removed item with a "deleted" facet, and the connector calls the same function.

- **Removed, in one transaction:** every row of the document in `documents`, `pages`,
  `doc_text`, `chunks`, `chunks_fts` (search rows), `embeddings` (by chunk id), `metadata`,
  `clauses` and `name_hits`. Documents that pointed at it (`duplicate_of`, `family_id`) are reset,
  then the families step runs again as in `pipeline.run` - a copy becomes an original, an
  amendment can lose its base agreement (flag `amendment_base_not_in_register`), a renaming
  amendment that is forgotten gives its base agreement the old name back. The rebuild is part of
  the same transaction: if it fails, nothing is removed and forget can be run again.
- **Kept on purpose:** `llm_calls` - the money was spent, the cost view must still add up; the
  rows are re-labelled `forgotten:<id>@<time>`, so no per-document count (journey, show, calls per
  document) mixes them with a later document of the same id. `audit_log` - history is
  append-only, a "forgotten" entry records what was removed, the label and the first-ingest time.
  The workflow database (runs are snapshots, reviews are human decisions) is never touched.
- **Refused, nothing changed:** an unknown id; a document whose file is in a source folder -
  the library, here the gold set (forget never deletes from the library: in Azure the deletion
  there is what calls forget); a document whose file is still in the inbox unless `--remove-file`
  is given (it deletes inbox files only; `--dry-run` lists them).
- **A forgotten document that comes back is a new document.** It gets a new first-ingest time,
  and the families step keeps the earlier document of a pair as the original - so a forgotten
  original that is restored becomes the copy of its own duplicate (M01 / M15: Q8 fails, F22).
  The old time is in the "forgotten" audit entry if it has to be restored by hand.
- **Forgotten while the watcher still works on it (F21):** the watcher drops the late model
  answer instead of writing findings for a document that is gone, re-labels the late calls with
  the label of that forget, and skips files that vanish while it reads them. An error in one pass
  ends that pass, not the watcher (`pass failed, still watching: …`, audit entry `run_failed`).
  `tools.demo reset` refuses until the watcher's pass is over (`--force` after Ctrl+C).
- **Proof:** on a register copy, H01 added and forgotten in seven cycles (one of them a forced
  reset during the model call) - every table has the same
  rows as before (content, not only the count), recall and precision stay 1.00 on Q1–Q8.
  Tests: `tests/test_forget.py` (14, no model call).

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
| `doc_type` and `is_amendment` must agree (F10) | contract wrongly marked as amendment - queries skip amendments, so it would vanish silently (C11) | treated as contract, review flag |
| Amendment without base agreement in the register | incomplete contract family (C16) | flag `amendment_base_not_in_register` |

The confidence comes from these signals, not from the model. Every finding keeps
`model_status` (what the model said) next to `status` (what the register says).

## Former company names: no match on a poor scan proves nothing

Step 5 finds every occurrence of a former name (`catalogue.OWN_ENTITY_LEGACY`) by an exact
pattern, tolerant of case and spacing, with page and snippet. If an amendment renamed the party,
the base agreement's occurrences are "resolved". An exact match cannot prove absence on a bad
scan: on the handwritten H01 the OCR wrote "Arfto" and "Arvafr" for "Arvato", and the check
counted it "without hits" (F19). So a document below the OCR threshold (status LOW_QUALITY, mean
confidence < 70) without any match - open or resolved - is reported as `NAME_NOT_RULED_OUT`,
triage REVIEW: "cannot be ruled out - poor scan (OCR confidence 61 %, threshold 70 %) - a person
checks" (decision 89). The same rule (`queries.name_not_ruled_out`) answers in every place: the
portfolio check (own count `not_ruled_out_poor_scan`, so the counts still add up to "checked"),
the register query, the evaluation (Q2 flags it for review, like an UNCLEAR clause),
`pipeline.show`, and the API (`former_names.not_ruled_out` and `.reason` on `GET /documents/{id}`
and every `GET /matrix` row). Not chosen: fuzzy matching (false hits on clean text). The 47 gold
documents are all above the threshold, so the evaluation did not change.

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

Raw outputs: `eval/results/`. Every error we found, with verbatim evidence: `docs/failure-cases.md`.
