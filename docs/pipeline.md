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
| Governing law: its quote must exist in the source (fuzzy ≥ 90), not come from a span that addresses software, and a sentence of the passage found that chooses a law (a law word) must name the jurisdiction of the code (decision 94) | a law code without evidence (C09, F26), read from the wrong sentence (C05's preamble "a Massachusetts Corporation"), or a wrong code (C05 on the v3 copy) | flag in `law_flags`, Q5 row "law not confirmed", review |

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

## Governing law: a finding with a checked quote

Up to extract-v2 the register stored the law as a code only ("US-MA"), with no passage - nothing
on screen proved it (F26). From extract-v3 (decision 94) the model also returns
`governing_law_quote`, the sentence that chooses the law, word for word (asked in the JSON schema;
the reader prompt keeps its 8 rules). `extract.check_law` checks it like a clause quote: found in
the text, not from a span that addresses software, and in the passage it found a sentence that
chooses a law must name the jurisdiction of the code. A sentence chooses a law if it has a law word
(`LAW_TERMS`, whole words: law, laws, governed, governing, recht, unterliegt, beheerst - English,
German and Dutch); sentences end at `. ; ! ?` and a space, not at "U.S.". The jurisdiction is a
small map `JURISDICTION_WORDS` (DE → "german", "deutsch", "bundesrepublik"; NL → "netherlands",
"dutch", "nederland"; GB → "england", "wales", "english", "united kingdom"; US-MA →
"massachusetts"; …, one entry for every code in the register, a test guards it). Without the law
word, any place word confirmed a code: C05's preamble ", a Massachusetts Corporation" for US-MA,
"the German version prevails" in a Dutch-law contract for DE - now `law_quote_lacks_law_terms`. A
choice of law in other words ("deutschen Rechts") is flagged and a person looks; it never passes.
Before a sentence counts, the law a party was formed under is cut out (`_FORMED_UNDER`: "organized /
incorporated / (validly) existing … under the laws of X" up to the next comma, "under X law",
"Gesellschaft … nach deutschem Recht", "vennootschap … naar Nederlands recht", "nach deutschem Recht
gegründet"): C06's preamble is one sentence with a law word that also names Delaware and Texas, and
it confirmed US-DE until the verification of the build found it. A choice of law in the same clause
as such a phrase is cut too and goes to a person (a review row, never a wrong confirmation). A quote
joined with "…" is read part by part, each part in its own passage (`quote_spans`). Known limit: a
sentence with a law word that names a place but chooses nothing still confirms the code - negation
("shall not be governed by German law", "excluding German law"), carve-outs ("comply with German data
protection law", "Mandatory provisions of German consumer protection law remain unaffected"),
"the German version prevails as a matter of law", "Recht" / "recht" meaning "a right", and two
sentences joined without ". " (after a one-letter abbreviation "Annex A.", at a line break or a
colon). A scan of the 47 texts found no such sentence for DE or NL; the lawyer sees the quote on the
card. The words are read in the contract's passage, not in the model's quote: a fuzzy match lets the
model add a word ("… of Massachusetts and of Germany" matches C09 at 92.5). Every failed check is
a flag in `metadata.law_flags` (`[]` = confirmed); quote, score, page and span are stored next to
it, and `--reassess` replays the check from the stored answer (the what-if switches `quote_found`,
`injection_guard`, `clause_vocabulary` reach it). A long contract read in parts takes the code and
its quote from the same part (`_merge`): the first part that names a law and quotes it, so a quote
without a law ("the parties will agree on the governing law later") never hides a later part's law.

On a fresh extract-v3 register (a copy, 47 contracts, $0.1225): 44 law quotes confirmed, 2 without a
choice of law (C12, M05-A), and one caught - the model coded C05 as US-MA (its preamble names "a
Massachusetts Corporation"), but its own quote says "the laws of the State of California"
(extract-v2 had US-CA). Replaying the law-word check and the formed-under cut on the 45 stored
passages changed 0 verdicts (C05 stays caught).
Decision 97 keeps it switched off until after the interview: the register stays on extract-v2.

Q5 ("not governed by German law") follows one rule, `queries.law_answer`, in the portfolio check,
the register query and the evaluation. Only a law confirmed by its quote on a good scan counts as
"the same law". A poor scan (LOW_QUALITY) or a failed check is reported as `LAW_NOT_CONFIRMED`,
triage REVIEW, with a fixed reason - "cannot be confirmed - poor scan (OCR confidence 61 %,
threshold 70 %) - a person checks" or "not confirmed - the quote does not name the law's country or
state - a person checks" - the same idea as former names on a poor scan (F36, decision 89). The
counts add up to "checked": `other_law`, `law_unknown`, `law_not_confirmed`, `same_law`,
`same_law_not_checked`.

An answer read before extract-v3 has no quote (`law_flags` NULL, "not checked"). On a good scan it
keeps its old answer and is counted as `same_law_not_checked` - not reported, not hidden: Q5 neither
loses a contract nor fills up with review rows before the contracts are read again. A replay keeps
the answer's prompt version, so the next run still reads it again. A poor scan is reported
whatever its version. On the register (all extract-v2) the evaluation prints the same as before,
byte for byte. An older register gets the seven law columns, empty, the first time it is opened
(`store.add_missing_columns`, every row kept).

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
