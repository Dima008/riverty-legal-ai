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

## Engineering issues (short)

| Issue | Fix |
| --- | --- |
| No quota for the newest models in the EU data zone on the trial account | gpt-4.1-mini Global Standard for the prototype; EU data zone required for production |
| HTTP 429 rate limit on embeddings | honour `Retry-After`, batches of 16 |
| SQLite "bad parameter or other API misuse" under parallel extraction | worker threads never touch the shared connection; one connection per thread for cost logging |
| Found while preparing the model comparison (code reading, no wrong number yet): a deployment without an entry in `PRICES_PER_MILLION` was logged with cost $0 - silently, so the cost view would have shown a bigger model as free | `config.check_prices()` - the pipeline refuses to start without a price for every configured model (fail loudly, like F2) |
| First API smoke test on the laptop "passed" against the wrong server: port 8000 belongs to another local app (`/health` answered `{"status":"ok","scenario":"sunny_surplus"}`), our uvicorn failed with WinError 10048 | API runs on port 8010; `/health` now names the service (`"service": "legal-workbench-api"`) and the test checks it |

## Caveat for the presentation

Prompt and checks were improved on the same gold set we measure on (risk of overfitting).
Step 6 adds a held-out set that is not looked at before the final measurement.
