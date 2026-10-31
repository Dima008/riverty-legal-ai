# Failure cases (error catalogue)

Real errors found while building and measuring the pipeline, with the verbatim evidence,
the root cause, the layer where we fixed it and the proof after the fix. These are meant to
be shown, not hidden: they explain why the architecture has the checks it has.

Template per case: **symptom → evidence → root cause → layer → fix → proof → reproduce**.

| # | Case | Layer | Caught by | Status |
| --- | --- | --- | --- | --- |
| F1 | Model files a real quote under the wrong clause (M08) | extraction | clause-vocabulary check, checker call | fixed, regression via eval |
| F2 | OCR silently falls back to English | ingest | nobody at first – found by reading the text | guard: pipeline refuses to start |
| F3 | Reseller agreement typed as merchant agreement (C04) | extraction | evaluation (precision) | fixed in prompt v2 |
| F4 | Correct quotes rejected because the model joined them with "..." (C09, C10) | checks | evaluation (CUAD) | fixed |
| F5 | Absence signals too broad: "haft" in "mangelhaft" | checks | inspection of review flags | fixed |
| F6 | A new copy turned the original into the duplicate | families | end-to-end test with the inbox | fixed, automated test still missing |
| F7 | Same contract, same prompt, different answer (M08, M10) | extraction | checks catch every variant | measured: 2 of 235 findings flip between runs, all caught |
| F8 | Gold label disagrees with our definition (CUAD C03) | definition | evaluation | question for Legal |
| F9 | Same scan, other machine, different OCR text (M18) | ingest | nobody at first - found by the offline smoke test on the laptop | no impact on gold set, cause open |
| F10 | Services agreement flagged as amendment, silently dropped from all queries (C11) | extraction | nobody at first - found by reading the families log | fixed (consistency check), automated test missing |
| F11 | The checker varies too: a general audit right accepted in one run, rejected in the next (C05, C08, C20, gpt-4.1) | checks / definition | `eval.repeat` stability report (model comparison) | question for Legal, direction safe |
| F12 | Bigger model reports an exclusion of punitive damages as limitation of liability, CUAD label says no cap (C13, gpt-4.1) | definition | evaluation (CUAD agreement 19 → 18 of 20) | question for Legal |
| F13 | Two requests at the same time break the workflow database; the audit log then shows "No actions yet." | api, frontend | nobody at first - found by the repo audit, reproduced: 215 of 360 concurrent requests → 500 | fixed, regression test |
| F14 | A forced re-ingest removes a contract from search, drops its injection flag and turns the original into the copy (M01, M14) | ingest / run | nobody at first - found by the repo audit, reproduced on a register copy | fixed, regression test |
| F15 | With a document-type filter, keyword search cuts before it filters: the BM25 list comes back empty, hybrid search silently turns vector-only | index/search | nobody at first - found by the repo audit, reproduced on a register copy | fixed, regression test; stop words and stemming open |
| F16 | "Not governed by US law" reports every contract under a US state's law; the coverage assertion can never fail | queries | nobody at first - found by the repo audit, reproduced on a register copy | fixed, regression test |
| F17 | A new file named like an existing contract (M03_copy.pdf) is merged into it, and the second contract is never read | ingest | nobody at first - found by the repo audit, reproduced in a temporary folder | fixed, regression test |

---

## F1 – A verified quote is not a correct finding (M08)

**Symptom.** Q1 "Which merchant agreements have no limitation of liability?" missed M08
(recall 0.80 in extract-v1).

**Evidence (extract-v1, model output stored in the register):**

```
clause:    liability_limitation
status:    PRESENT
quote:     "6.2 Insofar as one party processes personal data on behalf of the other, the parties
            conclude a separate data processing agreement pursuant to Art. 28 GDPR, which forms
            an integral part of this Agreement."
match:     100 (the quote exists verbatim, page 1, section 6 Data Protection)
rationale: "The clause 6.2 states the parties conclude a data processing agreement pursuant to
            Art. 28 GDPR, which is a form of limitation of liability related to data processing
            obligations."
```

M08 has no limitation of liability. The model took the data protection clause, quoted it
correctly, and filed it under the wrong clause type. Quote verification passed, because the
quote is real.

**Root cause.** One call extracts five clause types; the small model (gpt-4.1-mini) tends to
"find" something rather than report absence.

**Fix (three layers).**
1. Prompt v2, rule 6: "Judge every clause type on its own … never reuse a quote for a
   different clause type."
2. Deterministic check: the quote must contain vocabulary of its clause type
   (`catalogue.py`, `keywords`).
3. Checker call: a second, independent call sees only the definition and the quote and must
   agree (maker-checker).

**Proof.** With prompt v2 the model *still* said PRESENT for M08 – the prompt rule alone did
not fix it. Both checks rejected it independently:

```
liability_limitation [required]: UNCLEAR (model said PRESENT), confidence 0.35
  signal: quote_lacks_clause_terms
  signal: checker_rejected: The quote refers to concluding a data processing agreement under
          Art. 28 GDPR and does not limit liability or set caps on damages or claims.
```

Ablation from the same run (`python -m eval.check_register`), no extra model call:

| Question | Recall, model alone | Recall, model + checks |
| --- | --- | --- |
| Q1 no limitation of liability | 0.80 (misses M08) | 1.00 |
| Q3, Q4, Q6, Q7 | 1.00 | 1.00 |

**Lesson.** The prompt asks, the checks enforce. **Reproduce:** `python -m pipeline.show M08`.

---

## F2 – OCR fails silently and reports high confidence

**Symptom.** German scans came out without umlauts. No error, no warning.

**Evidence** (same page of M18, Tesseract asked for `deu+eng`):

| | German data missing | German data installed |
| --- | --- | --- |
| Heading | `HANDLERVERTRAG` | `HÄNDLERVERTRAG` |
| Clause 2 | `2. Ptlichten des Handlers` | `2. Pflichten des Händlers` |
| Text | `bindet die Zahlarten iiber die Checkout-Schnittstelle` | `bindet die Zahlarten über die Checkout-Schnittstelle` |
| Mean word confidence | **90.8 %** | 94.4 % |

**Root cause.** The German language file was missing. With `deu+eng` Tesseract silently uses
only English. The confidence barely moves, so a quality threshold would not have caught it.

**Fix.** `ingest.check_ocr_languages()` checks before every run that all configured languages
are installed and stops otherwise. **Lesson:** fail loudly; a silent fallback is worse than a
crash. **Reproduce:** run Tesseract on M18 with `-l eng`.

---

## F3 – Wrong document type (C04)

**Evidence.** "Reseller Agreement between 695014 B.C. Ltd. dba Galaxy Telecom and Galaxy
Telnet SRL" was typed `merchant_agreement`. It then appeared in Q3, Q4 and Q5 as a merchant
agreement lacking clauses – precision 0.80 to 0.83.

**Root cause.** The prompt listed the type names but never defined them. **Fix.** Prompt v2
defines each document type. **Proof.** Precision 1.00 on all questions; C04 is
`other_commercial_agreement`.

---

## F4 – Correct findings rejected (C09, C10)

**Evidence.** The model joined two passages with "...", despite the rule "no ellipsis":

```
"In no event will the Company be liable for incidental or consequential damages. ... In no event
will either party be liable for special or consequential damages arising out of the breach ..."
match score 77.6 -> quote_not_verified -> UNCLEAR
```

Both quotes exist; only the join does not. CUAD lawyers label both contracts as having a cap.

**Fix.** Quotes with "..." are split and every part is verified on its own; the lowest score
counts. **Proof.** CUAD agreement 17/20 → 19/20. **Lesson:** design checks for how the model
actually behaves, not for how the prompt says it should.

---

## F5 – Absence signals too broad

**Evidence.** M18 (no limitation of liability) was flagged "keyword hit despite absent" because
the pattern `haft` matched **mangel*haft*en** ("mangelhaften Waren", clause 7 Freistellung).
The same kind of problem was spotted in design review before the first run: `checkout` would
have matched every merchant agreement ("via the Provider's checkout interface").

**Fix.** Two separate lists per clause: broad *vocabulary* for checking a quote, narrow
*absence signals* (e.g. "limitation of liability", "shall not exceed", "Haftungsbegrenzung")
for questioning an ABSENT. **Proof.** M18 confidence 0.55 → 0.85; review flags only where a
real signal exists.

---

## F6 – The copy became the original

**Evidence.** End-to-end test: the file `Bergmann neu eingescannt.pdf` (a copy of M03) was
dropped into the inbox. Result: `duplicates={'M03': 'Bergmann_neu_eingescannt'}` – the
original M03 was marked as the duplicate.

**Root cause.** Duplicates were resolved in alphabetical order of the ids ("B" < "M").
**Fix.** The document that was in the register first stays the original. **Open:** an
automated test for this case.

---

## F7 – Variance at temperature 0 (M10)

**Evidence.** Same prompt (v2), two runs. Run A: model said PRESENT with the quote "5.2 Fraud
losses: the Provider bears the default risk for approved transactions …" (caught by the
vocabulary check → UNCLEAR). Run B: model said ABSENT directly. Both end up in Q1.

Run C (first run on the demo laptop, 2026-10-30, `eval/results/2026-10-30_extract-v2_laptop.txt`):
PRESENT again with the same quote, rejected twice:

```
liability_limitation [required]: UNCLEAR (model said PRESENT), confidence 0.35
  signal:    quote_lacks_clause_terms
  signal:    checker_rejected: The quote describes risk allocation for fraud losses but does not
             limit liability by capping amounts, excluding damage categories, or setting ...

Ablation  id   recall model  recall checked  missed by the model alone
          Q1           0.60            1.00  ['M08', 'M10']
```

Runs D-F (`python -m eval.repeat --runs 3 --label consistency`, three fresh registers, same
model and prompt, 2026-10-30, `eval/results/2026-10-30_extract-v2_consistency_summary.txt`):

```
Findings with the same status in every run: model said 233/235, after the checks 233/235
Q1-Q8 recall and precision: 1.00 in every run
Q1 recall of the model alone per run: [1.0, 0.8, 0.8]
Findings that changed between runs (2):
  M08    liability_limitation     model said ['ABSENT', 'ABSENT', 'PRESENT'] -> register ['ABSENT', 'ABSENT', 'UNCLEAR']
  M10    liability_limitation     model said ['ABSENT', 'PRESENT', 'ABSENT'] -> register ['ABSENT', 'UNCLEAR', 'ABSENT']
```

Over all five runs (cloud, laptop, D, E, F) the model alone found 0.80, 0.60, 1.00, 0.80 and
0.80 of the contracts without a liability cap; with the checks 1.00 every time. Only the two
hardest traps flip, and every wrong "present" became "unclear", never a silent miss.

**Lesson.** One run is not a measurement. The model varies on exactly the cases that are hard
for it; the checks make the result stable, not the model.

---

## F8 – Label disagreement (CUAD C03)

CUAD lawyers labelled a termination-payment formula as "cap on liability". Under our playbook
definition it is not. This is a definition question for Legal, not a model error – and a
reminder that gold labels are decisions too.

---

## F9 - Same scan, other machine, different OCR text (M18)

**Symptom.** The first ingest on the presenter's Windows laptop (2026-10-30) reads parts of the
M18 scan differently than the cloud run did, although the German language data is installed.

**Evidence.** Offline smoke test (ingest + chunking into a throwaway database, no model call).
Same result as the cloud for the totals: 47 documents, 938 chunks. M18 page 1, verbatim:

```
HÄNDLERVERTRAG - ZAHLUNGSDIENSTLEISTUNGEN
Dieser Händlervertrag (der »Vertrag") wird am 2018-02-14 geschlossen zwischen Arvato
Financial Solutions GmbH (der „Anbieter“) und Leder & Co. GmbH (der Handler‘).
2. Pflichten des Handlers
2.1 Der Händler bindet die Zahlarten über die Checkout-Schnittstelle des Anbieters ein und
2.2 Der Händler bestätigt jeden Versand unverzüglich.
mean OCR confidence per page: [(1, 94.2), (2, 92.6)]
```

| | Cloud run (F2, German data installed) | Laptop |
| --- | --- | --- |
| Clause 2 heading | `2. Pflichten des Händlers` | `2. Pflichten des Handlers` |
| Party definition | - | `(der Handler‘)` |
| Body text | `über`, `Händler` | `über`, `Händler` (correct) |
| Mean word confidence | 94.4 % | 93.4 % |

Laptop setup: Tesseract 5.4.0.20240606 (UB Mannheim build), `eng.traineddata` from the installer
(4.1 MB), `deu.traineddata` from tessdata_fast, PyMuPDF 2.0 renders the page at 200 dpi.

**Root cause.** Open. The cloud ran on Linux with other Tesseract, model and PyMuPDF versions;
which difference causes it is not measured yet.

**Layer.** Ingest. **Fix.** Open.

**Impact.** None on the gold set. The first full run on the laptop
(`eval/results/2026-10-30_extract-v2_laptop.txt`) finds M18 in Q1, Q2 and Q4 as expected,
metadata 27/27, recall and precision 1.00 on Q1-Q8.

**Lesson so far.** The demo machine is a different environment than the one we measured on. The
gold-set numbers only count for the demo after the evaluation has run on the laptop - and in
production the OCR stack belongs in a pinned container image.

**Reproduce.** Ingest M18 on the laptop and print page 1 (`python -m pipeline.show M18` once the
register exists). Automated test missing.

---

## F10 - Services agreement flagged as amendment (C11)

**Symptom.** The first full run on the laptop lists C11 as an amendment whose base agreement is
missing. C11 is a services agreement.

**Evidence** (pipeline log and register, 2026-10-30):

```
families: duplicates={'M15': 'M01'} amendments={'C16': 'C16', 'C11': 'C11', 'M05-A': 'M05'} legacy name hits=14

(doc_id, doc_type, is_amendment, amended_agreement_date, counterparty_name)
('C11', 'other_commercial_agreement', 1, None, 'TELCOSTAR PTE, LTD.')
('C16', 'amendment', 1, '2015-03-09', 'AZUL LINHAS AÉREAS BRASILEIRAS S/A')
```

The only "amend" near the start of C11 is: *"(as such Exhibit may be amended or supplemented
pursuant to the terms of this Agreement, the "Exhibit")"*. C16 is a real amendment ("Amendment
n° 01 to the Global Maintenance Agreement ... dated March 9th, 2015"); its base agreement is not
in the register, so `C16: C16` is correct but reads like a self-reference.

**Root cause.** Open. The model's two fields contradict each other (`doc_type` says no amendment,
`is_amendment` says yes) and no check compares them. Whether the cloud run had the same value is
unknown: the evaluation does not cover `is_amendment` on CUAD documents.

**Layer.** Extraction (missing consistency check).

**Impact - a silent miss.** Register queries skip amendments (`queries.BASE`:
`m.is_amendment = 0`), so C11 disappears from every portfolio question. C11 has no limitation of
liability, yet the question "which other commercial agreements lack one?" does not list it:

```
C11 clause status: ('ABSENT', 0.9)
missing_clause(liability_limitation, other_commercial_agreement): ['C03', 'C12', 'C13', 'C14', 'C15', 'C17', 'C18', 'C19', 'C20']
C11 in result: False
other_commercial_agreement: 19 in register, 18 visible to queries
```

No check noticed it, and Q1-Q8 do not cover it (they ask about merchant agreements and DPAs). A
coverage line "18 of 19 checked, 1 excluded as amendment (C11)" would have made it visible.

**Fix** (deterministic, no model call).
1. `extract.check_metadata`: a document counts as an amendment only if `doc_type` and
   `is_amendment` agree. On a contradiction it is treated as a contract - it stays visible to
   every query (recall first) - and gets a review flag. The model's answer stays in `raw_json`.
2. `families.py`: an amendment whose base agreement is not in the register gets the flag
   `amendment_base_not_in_register` instead of pointing to itself - an incomplete contract
   family is a finding for Legal.

**Proof** (`python -m pipeline.run --reassess`, 0 model calls, then the same query):

```
C11    type=other_commercial_agreement  is_amendment=0 family=C11    flags=['amendment_contradiction: doc_type=other_commercial_agreement, is_amendment=true']
C16    type=amendment                   is_amendment=1 family=C16    flags=['amendment_base_not_in_register']
M05-A  type=amendment                   is_amendment=1 family=M05    flags=[]
missing_clause(liability_limitation, other_commercial_agreement): ['C03', 'C11', 'C12', 'C13', 'C14', 'C15', 'C17', 'C18', 'C19', 'C20']
other_commercial_agreement visible to queries: 19 of 19
```

Evaluation afterwards identical to the run before (recall and precision 1.00 on Q1-Q8).

**Lesson.** Every filter that excludes documents can hide a miss. Exclusions must be visible:
the workbench shows coverage as "checked / in scope / excluded, and why".

**Reproduce.** `python -m pipeline.show C11`. Automated test missing.

---

## F11 - The checker varies too (C05, C08, C20, gpt-4.1)

**Symptom.** Model comparison with gpt-4.1 (two fresh registers, same prompt v2, same checks,
2026-10-30). The extraction is stable, but three findings change *after* the checks:

```
Findings with the same status in every run: model said 235/235, after the checks 232/235
Findings that changed between runs (3):
  C05    audit_clause             model said ['PRESENT', 'PRESENT'] -> register ['PRESENT', 'UNCLEAR']
  C08    audit_clause             model said ['PRESENT', 'PRESENT'] -> register ['PRESENT', 'UNCLEAR']
  C20    audit_clause             model said ['PRESENT', 'PRESENT'] -> register ['UNCLEAR', 'PRESENT']
```

**Evidence** (register rows, `var/eval_runs/2026-10-30_gpt-4.1/run<n>/register.sqlite`). C05, same
quote in both runs (match 99.1, shortened here): *"For a period of not less than two (2) years
after the date of termination, each party shall maintain, and make available to the other party
upon its request, for inspection and copying all books and records that pertain to performance
and compliance with oblig…"*

```
run1  status PRESENT  confidence 0.95  flags ["checker_agreed"]
run2  status UNCLEAR  confidence 0.35  flags ["checker_rejected: The quote refers to making books and
      records available for inspection and copying, but it is not specific to the controller's right
      to audit a processor or GDPR compliance, so it does not meet the definition."]
```

The same three contracts with gpt-4.1-mini, identical in all three runs
(doc, clause, model said, register, confidence, flag):

```
('C05', 'audit_clause', 'ABSENT', 'ABSENT', 0.6, 'signal_despite_absent: ...')
('C08', 'audit_clause', 'PRESENT', 'UNCLEAR', 0.35, 'checker_rejected: ...')
('C20', 'audit_clause', 'PRESENT', 'PRESENT', 0.95, 'checker_agreed')
```

**Root cause.** Partly known. The catalogue entry is labelled "Audit and inspection rights", but
its definition is narrower: *"The controller's right to audit or inspect the processor, or the
processor's duty to provide all information necessary to demonstrate compliance (Art. 28(3)(h)
GDPR)."* C05, C08 and C20 are commercial agreements with general books-and-records audits. The
extraction model reads the label and reports them as present; the checker reads the definition
and rejects them - sometimes. Why the checker decides differently between runs is open (as in
F7); its call covers all present findings of a contract at once, so its prompt can still differ
in the other findings.

**Layer.** Checks (maker-checker) and definition.

**Impact.** None on Q1-Q8: audit rights are required only in data processing agreements. The
direction of the checker is safe by design - it can only turn PRESENT into UNCLEAR, which adds
review work but never hides a gap. Under the strict definition, though, the *accepted* cases are
wrong "present" findings (C20 with gpt-4.1-mini in every run), and a question like "which
commercial agreements lack an audit right?" would not list them.

**Fix.** Open - question for Legal: does a general audit right count, or only the GDPR audit right
of the controller? Then align label and definition in `catalogue.py` (e.g. "General commercial
audit rights are NOT this clause"), bump `PROMPT_VERSION`, re-run the evaluation.

**Lesson.** The checker is a model too. It may only ever make a finding *less* certain, and its
disagreement goes to a human. And a label that says more than the definition invites a model to
answer the label.

**Reproduce.** `python -m eval.repeat --runs 2 --label gpt-4.1 --chat-deployment gpt-4.1`
(about $0.52 per run). Automated test missing.

---

## F12 - Bigger model, other reading than the CUAD label (C13, gpt-4.1)

**Symptom.** Agreement with the CUAD lawyers' labels drops from 19 of 20 (gpt-4.1-mini, every
run) to 18 of 20 (gpt-4.1, both runs). The new disagreement is C13.

**Evidence** (2026-10-30, both gpt-4.1 runs identical):

```
gpt-4.1       C13 liability_limitation: PRESENT (model PRESENT), confidence 0.95, ["checker_agreed"]
              quote: "Neither MICOA nor the Agency shall be entitled to punitive and/or exemplary damages."
gpt-4.1-mini  C13 liability_limitation: ABSENT (model ABSENT), confidence 0.6,
              ["signal_despite_absent: 'two-year period of development; but in no event will repayment b..."]
labels.csv    C13: cap_on_liability=False, uncapped_liability=False
evaluation    CUAD disagreements: C03 (register ABSENT, label cap), C13 (register PRESENT, label no cap)
```

**Root cause.** Our definition counts *"an exclusion of categories of damages (e.g. indirect or
consequential damages, lost profits)"* as a limitation of liability; the quote excludes punitive
and exemplary damages. The CUAD column is a cap on liability. By our own definition gpt-4.1 is
right and the smaller model's ABSENT is the miss - its better CUAD score partly comes from
missing the clause. Its absence signal flagged another passage, so its ABSENT goes to review
(confidence 0.6) anyway.

**Layer.** Definition.

**Fix.** Open - question for Legal: does excluding punitive damages alone count as a limitation of
liability in Riverty's playbook? The answer goes into `catalogue.py` (like F8).

**Lesson.** Agreement with someone else's labels is not accuracy. Before switching models, read
the disagreements, not only the score.

**Reproduce.** As F11; then `eval/results/2026-10-30_extract-v2_gpt-4.1_run1.txt` (CUAD block).

---

F13–F17 were found by the repository audit (a workflow of reviewers with an adversarial second
check, 2026-10-30) and then reproduced one by one, read-only, on copies of the databases
(`var/register.sqlite` and `var/workbench.sqlite` had the same SHA-256 before and after).

## F13 - Two requests at once break the workflow database (api)

**Symptom.** When two requests to the workflow database overlap – two reviewers, two windows,
a refresh during a review – many fail with HTTP 500. The audit log then shows "No actions yet."
instead of an error: the traceability screen silently claims nothing happened.

**Evidence** (10 concurrent GET /runs and GET /audit in-process, then against a real uvicorn):

```
burst 1/3 (10 concurrent) /runs: ['500', '500', '200', '500', '200', '500', '500', '200', '200', '500']  -> 4/10 ok
burst 3/3 (10 concurrent) /audit: ['500', '500', '500', '500', '500', '200', '200', '500', '500', '500']  -> 2/10 ok
sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread.
The object was created in thread id 10288 and this is thread id 27320.
  status sent 500 | ProgrammingError at api/workflow.py:122  rows = wb.execute("SELECT ts, actor, action, target, details_json FROM audit ...
  status sent 200 | ProgrammingError at api/workbench.py:62  con.close()
real uvicorn: 215 of 360 concurrent requests -> 500 "Internal Server Error"; 100 of 100 sequential -> 200
```

**Root cause.** `api/workbench.py:51` opens the connection with `sqlite3.connect(path, timeout=30)`.
FastAPI runs the setup of a sync `yield` dependency, the endpoint and the teardown as separate
thread-pool calls, which can land on different threads, and Python's SQLite binding refuses a
connection used from another thread. The register connection (`pipeline/store.py:95`) already
passes `check_same_thread=False`. The UI hides the failure: `AuditLog.tsx:35`
`api.audit().then(setEvents).catch(() => setEvents([]))`.

**Layer.** API (and frontend for the silent empty state). Sequential tests can never see it.

**Fix.** `api/workbench.py` opens the connection with `check_same_thread=False`, like the
register connection. Each connection is still opened, used and closed by exactly one request, so
the check protected nothing here. The audit log and the what-if table now show an error instead
of an empty state (fail loudly, decision 44).

**Proof.** The regression test was written first and failed:

```
tests/test_api_concurrency.py  (10 concurrent GETs, three bursts, /runs and /audit)
before:  AssertionError: assert [200, 'Progra...ngError', ...] == [200, 200, 20...200, 200, ...]
after:   55 passed
real uvicorn, the same repro script, three runs (keep-alive and not):
         180 of 180 concurrent requests -> 200; 0 "Exception in ASGI application", 0 x 500
```

**Reproduce.** `python -m pytest tests/test_api_concurrency.py` (automated test).

---

## F14 - A forced re-ingest damages two contracts (M01, M14)

**Symptom.** `python -m pipeline.run --only M01,M14 --force` reports success, but afterwards
neither contract can be found by search, M14 has lost its injection flag, and at the next
families pass M01 – the original – becomes the duplicate of its copy M15 (F6 again).

**Evidence** (on a register copy, 2026-10-30):

```
$ REGISTER_DB=<copy> python -m pipeline.run --only M01,M14 --force
ingested 2: M01, M14
chunks: 25
run cost: $0.0000 in 0 model calls

before  M14: chunks=13  chunks_fts=13  embeddings=13  flags='["prompt_injection_suspected"]'
after   M14: chunks=13  chunks_fts=0   embeddings=0   flags=None
        M01: chunks_fts 12 -> 0, embeddings 12 -> 0, flags '[]' -> None,
             ingested_at '2026-10-30T12:09:08+00:00' -> '2026-10-30T18:12:20+00:00'
search 'Urban Feet': before top5=['M14:001', 'M14:012', ...] -> after top5=[]
governing_law_not NL: M14 FOUR_EYES -> CONFIRM
a later plain `python -m pipeline.run`: nothing printed, damage persists
after `--reassess` (next families pass): M01 duplicate_of='M15'
  Q8   1.00 1.00 ['M15'] / ['M15']  ->  Q8   0.00 0.00 ['M01'] / ['M15']
```

**Root cause.** Four steps that are each reasonable on their own:
1. `--force` blanks the file hash, so ingest re-reads the file (`run.py:28-31`), and the
   documents row is rewritten with `INSERT OR REPLACE` without the flags column – flags,
   duplicate link and the first ingest time are lost (`ingest.py:183-189`).
2. Re-chunking deletes the document's full-text rows and embeddings (`chunking.py:150-152`).
3. The text hash did not change, so the document is not "pending" and extraction is skipped
   (`run.py:36`). Only the extraction branch rebuilds the full-text rows and context lines
   (`index.contextualise`), embeddings need the context line, and the injection flag is written
   only by extraction (`extract.py:369-370`).
4. Families keep the earlier-ingested document as the original (`families.py:41-42`); the
   re-ingest made M01 the later one.

**Layer.** Ingest / run orchestration. The evaluation did not see the damage until families ran
again; three tests then failed (Q8, coverage, summary).

**Fix.** `pipeline/run.py` rebuilds everything derived from a document in the same pass that
reads it again: a document read again but not extracted again (same text) has its stored
findings re-checked without a model call (`extract.reassess(only=...)`, which rewrites its
flags); families, search rows and embeddings then follow every document that was read or
extracted. `pipeline/ingest.py` keeps the first ingest time, so the original stays the original.
`--force` still extracts only when the text changed - a repair run must not re-roll the model's
answers (F7). The monitoring view takes "last ingest" from the audit log.

**Proof.** The regression test was written first and failed (`AssertionError: M01 assert 0 ==
12` - no search rows). After the fix, the same command on a register copy:

```
$ REGISTER_DB=<copy> python -m pipeline.run --only M01,M14 --force
ingested 2: M01, M14
chunks: 25
reassessed 2 documents without model calls
families: duplicates={'M15': 'M01'} amendments={'M05-A': 'M05'} base agreement not in register=['C16'] legacy name hits=14
embedded 25 chunks with text-embedding-3-small
run cost: $0.0000 in 2 model calls
before = after:
M01: chunks=12 chunks_fts=12 embeddings=12 flags=[] duplicate_of=None ingested_at=2026-10-30T12:09:08+00:00
M14: chunks=13 chunks_fts=13 embeddings=13 flags=["prompt_injection_suspected"] duplicate_of=None ingested_at=2026-10-30T12:09:08+00:00
M15: ... duplicate_of=M01
after the next families pass (--reassess):  Q8   1.00 1.00 ['M15'] / ['M15'] / []
```

**Reproduce.** `python -m pytest tests/test_ingest.py` (automated test, works on a copy).

---

## F15 - Keyword search cuts before it filters (index/search)

**Symptom.** `GET /search` with a document type can return an empty keyword (BM25) list
although the filtered contracts contain matching chunks. The fused result is then 100 %
vector hits – hybrid search silently became vector search, with no warning in the response.

**Evidence** (register copy, fake zero-vector adapter, no model call):

```
q='neither side has to pay more than the fees of the last year' doc_type=data_processing_agreement
  (1) search.bm25_ranking(con, q, allowed): 0 hits
  (2) direct FTS restricted to the allowed doc ids: 31 matching chunks
  whole register: 853 matching chunks; doc types of the global top 200:
  {'merchant_agreement': 28, 'other_commercial_agreement': 170, 'amendment': 2}
GET /search {'q': 'total fees paid in the twelve months', 'doc_type': 'data_processing_agreement', 'k': 5}
  -> HTTP 200; bm25: []; fused from the vector list: 5/5
sweep: 39 of 116 (query, doc_type) pairs return a shorter BM25 list than the filtered query (10 empty, 29 short)
```

**Root cause.** `search.py:43-45` takes the top 200 BM25 hits of the whole register and filters
by document afterwards; the vector ranking filters first (`search.py:53`). Related but separate:
the query builder keeps common words longer than two letters ("the", "and", "has"), so long
queries match almost every chunk, and the tokenizer does not stem ("audit" does not match
"audits").

**Layer.** Index/search. Register questions Q1–Q8 do not use search; the live search station
(explorer station 6) does.

**Fix.** The document filter is part of the full-text query (`AND doc_id IN (...)`), and the
list is cut to the requested depth in SQL. Without a filter the output is unchanged. The module
docstring now says that duplicates are left out whenever a filter is set. Not changed (open, for
the retrieval evaluation): common words as query terms and the missing stemming.

**Proof.** The regression test was written first and failed:

```
tests/test_api_register.py::test_keyword_search_filters_before_it_cuts
  data_processing_agreement: AssertionError: assert 0 == 31
  merchant_agreement:        AssertionError: assert 26 == 50
after:  59 passed; unfiltered BM25 list identical to before (checked);
        demo query (merchant agreements) top 3 unchanged ['M02:008', 'M06:008', 'M11:008'], 50 hits instead of 26
```

**Reproduce.** `python -m pytest tests/test_api_register.py -k keyword_search` (automated test).

---

## F16 - "Not governed by US law" lists every US contract; the coverage assertion cannot fail

**Symptom.** A Workbench run "contracts not governed by US law" reports all 14 checked contracts
under a US state's law as "other governing law" and routes them as routine (CONFIRM).
Asking for a state (US-NY) is refused.

**Evidence** (register copy):

```
governing_law values: DE 21, NL 4, US-CA 4, GB 3, US-NY 3, None 2, US-TX 2, CA-BC 1, IL 1, US-AR 1, US-DE 1, ...
run_check governing_law_not law=US:
  counts {'other_law': 43, 'law_unknown': 1, 'same_law': 0}
  C01  governing_law=US-CA  status=OTHER_LAW  triage=CONFIRM
  C03  governing_law=US-NY  status=OTHER_LAW  triage=CONFIRM
POST /runs law=US-NY -> 422 "law must be a two-letter country code, e.g. DE"
coverage assert: never fired in 2000 fuzzed run_check calls; removed under python -O
```

**Root cause.** `portfolio.py:175` compares `law == params["law"]`, but the register stores ISO
3166 codes with a subdivision for federal states (`US-CA`, `CA-BC`), as the extraction schema
asks. The coverage assertion (`portfolio.py:210`) counts two lists built by the same loop, so it
is true by construction; the module docstring presents it as the F10 safeguard.

**Layer.** Queries (portfolio check). Q5 asks about DE and is not affected.

**Fix.** The check compares the country part of the code (`US-NY` → `US`); `queries.by_law`, used
by the evaluation for Q5, does the same in SQL (`substr(governing_law, 1, 2)`). The assertion was
removed; the module docstring and explorer station 7 now name the three real guarantees (scope
read from all documents incl. unextracted ones, unknown types always in scope, one list per
contract), and the tests count scope = checked + excluded against the register.

**Proof.** The regression test on the hand-made register was written first and failed
(`assert ('A1' not in {'A1': 'OTHER_LAW', 'I1': 'OTHER_LAW'})`). After the fix, on the register:

```
law=US counts           {'other_law': 29, 'law_unknown': 1, 'same_law': 14}   (before: 43 / 1 / 0)
Q5 (DE, merchant) counts {'other_law': 5, 'law_unknown': 0, 'same_law': 14}   (unchanged)
evaluation identical; 60 passed
```

**Reproduce.** `python -m pytest tests/test_portfolio.py -k law_check` (automated test).

---

## F17 - A file named like an existing contract is merged into it (ingest)

**Symptom.** A file whose name starts with an existing id (`M03_copy.pdf`, `M03_Bergmann_v2.pdf`)
does not become a document of its own. It is grouped under M03, only the first file is read,
and the second contract never appears – not even as excluded with a reason.

**Evidence** (temporary folders, `ingest.discover`):

```
source folder: ['M03_Bergmann.pdf']  inbox: ['M03_Bergmann_v2.pdf']   (a copy of M04_Velo.pdf)
  1 document(s): doc_id='M03' kind='pdf' files=['M03_Bergmann.pdf', 'M03_Bergmann_v2.pdf']
  read_pages(merged M03): text mentions 'Velo': False; mentions 'Bergmann': True
source folder: ['M03_Bergmann.pdf', 'M03_notes.txt']
  doc_id='M03' kind='txt' files=['M03_Bergmann.pdf', 'M03_notes.txt']
  read_pages(M03): first 40 chars of page 1: '%PDF-1.4\n%���� ReportLab Generated PDF d'
today's data: only M20 is grouped (M20_Buerowelt_p1.jpg, M20_Buerowelt_p2.jpg) - as intended
```

**Root cause.** `ingest.py:72-76` derives the id from the leading pattern of every file name and
puts every file with that id into one group – meant for the pages of one JPEG scan. `read_pages`
reads only `files[0]` (`ingest.py:106`, `114`), and the group's kind is the last file's extension.

**Layer.** Ingest. Latent: today's register is not affected; the inbox demo and every new file are.

**Fix.** `ingest.discover` gives every file its own document, except the page images of one
scan (`_p1`, `_p2` with the same name). The first file in sorted order keeps the short id
(M03); a further file with the same prefix keeps its name as id (`M03_copy`), so it is
registered - and marked as a duplicate by the families step if its text is the same. Removed
the unreachable skip for `readme.md` and `labels.csv` (those extensions are never read).

**Proof.** The regression test failed on the old code
(`{'M03': (['M03_Bergmann.pdf', 'M03_copy.pdf', 'M03_notes.txt', 'M03_Bergmann_v2.pdf'], 'pdf')}`)
and passes now: M03, M03_copy, M03_notes, M03_Bergmann_v2 and the two-page scan M20 are separate
as intended. The 47 ids of today's register are unchanged (evaluation identical).

**Reproduce.** `python -m pytest tests/test_ingest.py` (automated test).

---

## Engineering issues (short)

| Issue | Fix |
| --- | --- |
| No quota for the newest models in the EU data zone on the trial account | gpt-4.1-mini Global Standard for the prototype; EU data zone required for production |
| HTTP 429 rate limit on embeddings | honour `Retry-After`, batches of 16 |
| SQLite "bad parameter or other API misuse" under parallel extraction | worker threads never touch the shared connection; one connection per thread for cost logging |
| Found while preparing the model comparison (code reading, no wrong number yet): a deployment without an entry in `PRICES_PER_MILLION` was logged with cost $0 - silently, so the cost view would have shown a bigger model as free | `config.check_prices()` - the pipeline refuses to start without a price for every configured model (fail loudly, like F2) |
| Found by the repo audit (2026-10-30): `test_reason_required_for_review_rows_and_corrections` relied on M08 being a REVIEW row in Q1. M08 is CONFIRM (ABSENT, 0.9) in 4 of 5 repeat registers (F7), so after a rebuild the suite turns red without a code change: `assert 201 == 422` | The test uses M14 (four eyes in every build because of the injected note); the module docstring says which rows are stable. Proof: `tests/test_api_review.py` 6 of 6 passed against the production register and all five repeat registers, including the four where M08 is CONFIRM |
| Found by the browser walkthrough of the register review (before commit): the contract file is a full-screen drawer that covers the reviewer switch in the header, so the second pair of eyes could not be given without closing the file (`waiting for getByRole('combobox', { name: 'Signed in as' })` - timeout) | After the first approval the review panel offers "Continue as Legal Reviewer B" (a switch context next to the user context) |
| First API smoke test on the laptop "passed" against the wrong server: port 8000 belongs to another local app (`/health` answered `{"status":"ok","scenario":"sunny_surplus"}`), our uvicorn failed with WinError 10048 | API runs on port 8010; `/health` now names the service (`"service": "legal-workbench-api"`) and the test checks it |

## Caveat for the presentation

Prompt and checks were improved on the same gold set we measure on (risk of overfitting).
Step 6 adds a held-out set that is not looked at before the final measurement.
