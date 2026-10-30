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
| F7 | Same contract, same prompt, different answer (M10) | extraction | checks catch both variants | accepted, measured in step 6 |
| F8 | Gold label disagrees with our definition (CUAD C03) | definition | evaluation | question for Legal |

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

**Lesson.** One run is not a measurement. Step 6 measures consistency over several runs.

---

## F8 – Label disagreement (CUAD C03)

CUAD lawyers labelled a termination-payment formula as "cap on liability". Under our playbook
definition it is not. This is a definition question for Legal, not a model error – and a
reminder that gold labels are decisions too.

---

## Engineering issues (short)

| Issue | Fix |
| --- | --- |
| No quota for the newest models in the EU data zone on the trial account | gpt-4.1-mini Global Standard for the prototype; EU data zone required for production |
| HTTP 429 rate limit on embeddings | honour `Retry-After`, batches of 16 |
| SQLite "bad parameter or other API misuse" under parallel extraction | worker threads never touch the shared connection; one connection per thread for cost logging |

## Caveat for the presentation

Prompt and checks were improved on the same gold set we measure on (risk of overfitting).
Step 6 adds a held-out set that is not looked at before the final measurement.
