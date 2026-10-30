# Pipeline explorer – content per station

Source for the explorer in the frontend (decision 49): every step of the pipeline and the
workflow, explained with a diagram idea and a live example from the register. Written for the
interview audience (engineers and Legal at Riverty), in English. Numbers are from the run on
the demo laptop (2026-10-30, prompt `extract-v2`, gpt-4.1-mini).

**Rule:** when a step changes, update its station here in the same commit (CLAUDE.md).

Per station: **What** (plain words) · **In our system** (real numbers) · **Why this way**
(decision no., see `docs/context/decisions.md`) · **What went wrong** (failure case, see
`docs/failure-cases.md`) · **Live** (API call) · **Diagram**.

In the talk, three stations are shown live (chunking, guardrail sandwich, search); the others
are ready for questions.

---

## 1. Sources and ingest (text layer or OCR)

**What.** Turn every file into text with the position of every word on the page.

**In our system.** 47 documents: 20 synthetic merchant agreements (M01–M20) plus one
amendment (M05-A), 6 data processing agreements (V01–V06), 20 public CUAD contracts
(C01–C20, plain text). PDFs with a text layer are read directly; scanned PDFs (M16, M18) and
JPEG scans (M20, two pages) are rendered at 200 dpi and read by Tesseract (German + English).
Mean OCR confidence 93–95 %; below 70 % a document is marked LOW_QUALITY and the confidence of
all its findings is capped. Unchanged files are skipped (file hash). In Azure: Content
Understanding instead of Tesseract; a SharePoint connector instead of the watch folder.

**Why this way.** Specialised document pipeline, multimodal model only as fallback (10);
watch folder as stand-in for SharePoint (35).

**What went wrong.** F2: without the German language data Tesseract silently read "Händler"
as "Handler" – at 90.8 % confidence. The pipeline now refuses to start without it. F9: the same
scan gives slightly different OCR text on another machine – no effect on results, but the
reason the evaluation must run on the demo machine.

**Live.** `GET /documents/M18/pages/1` (words with boxes, `source: ocr`) and
`/documents/M18/pages/1/image`.

**Diagram.** File → text layer? → yes: words + boxes / no: render → OCR → words + boxes +
confidence → LOW_QUALITY below 70 %.

---

## 2. Chunking

**What.** Cut a contract into pieces you can point to – like chapters in a book.

**In our system.** Headers, footers and the watermark are removed; then the text is cut at
clause headings ("7. Liability", "§ 7 Haftung", "ARTICLE V", "Annex 3"). Sections longer than
2,500 characters are split into ~1,500-character windows with overlap. 938 chunks from 47
documents; a merchant agreement has 12. Each chunk gets a context line (contract, parties,
date, law, section). Chunks are used for search and for "found in section 7, page 2" –
**not** to show the model only parts: extraction always reads the whole contract.

**Why this way.** A clause is the unit lawyers think in; fixed-size pieces cut clauses in
half and the evidence would start mid-sentence.

**Live.** `GET /documents/M09/chunks?compare=fixed&size=2000`. In M09 the liability clause
runs from page 1 to page 3 (page 2 is almost empty – a trap in the test set) and stays one
chunk. Fixed 2,000-character windows put the heading "7. Liability" into one window and the
clause text into the next.

**Diagram.** The same contract twice, side by side: clause-based chunks vs. fixed windows,
with page breaks; a toggle switches between them, the cut is highlighted.

---

## 3. Extraction (one structured call per contract)

**What.** The model reads the whole contract once and fills in a form: type, parties, date,
law, amendment data, and for every clause in Legal's catalogue PRESENT / ABSENT / UNCLEAR with
a verbatim quote.

**In our system.** One call per contract over the whole text, sections marked [S1]…[Sn],
the contract wrapped in `<contract>` and declared untrusted data. Strict JSON schema
(structured output), temperature 0, prompt version `extract-v2`. Clause definitions come from
`pipeline/catalogue.py` (Legal's playbook as data). 47 extraction calls cost $0.10.

**Why this way.** Absence can only be shown by reading everything; top-k retrieval can never
prove that something is missing (37). Small model plus checks; bigger model only when
measurements demand it (42). Catalogue as data, every change is a new prompt version (40).

**What went wrong.** F3: a reseller agreement was typed as merchant agreement until the
prompt defined each type. F4: the model joined two quotes with "..." against the rule – quotes
are now checked part by part.

**Live.** `GET /documents/M08/prompt` (system prompt, catalogue, contract with markers,
output schema).

**Diagram.** System prompt (rules) + catalogue + contract → model → filled form (JSON).

---

## 4. Guardrail sandwich (checks after the model)

**What.** The model's answer is a proposal. Deterministic checks and an independent second
call decide what goes into the register. The prompt asks, the checks enforce.

**In our system.** For every PRESENT finding: the quote must exist in the source (fuzzy
≥ 90), must not come from a suspected injection passage, must contain vocabulary of its
clause type, and a checker call that sees only definition and quote must agree (maker-checker,
$0.013 for 39 calls). For ABSENT: narrow absence signals ("limitation of liability", "shall
not exceed") question it. Document signals (OCR, injection) cap the confidence. Confidence is
computed from these signals, never asked from the model. Every finding keeps `model_status`
(what the model said) next to `status` (what the register says).

**Why this way.** Deterministic first, LLM only for meaning (9); quote required and verified
(6); maker-checker (38); confidence from signals (39).

**What went wrong.** F1: in M08 the model filed the data-protection clause as a limitation of
liability – with a real quote. Quote verification passed; vocabulary check and checker caught
it. F7: the same prompt at temperature 0 gives different answers (M10). Model alone: Q1
recall 0.80 in one run, 0.60 in the next; with the checks 1.00 both times.

**Live.** `GET /documents/M08/findings` → `liability_limitation.layers`:

```
     model                         PRESENT
OK   quote_found_in_source         match 100, page 1
OK   quote_not_from_injection
FAIL quote_has_clause_vocabulary
FAIL checker_four_eyes             "refers to a data processing agreement ... no cap"
     register                      UNCLEAR, confidence 0.35  -> goes to a lawyer
```

**Diagram.** A vertical stack: model on top, one row per check with ✓ / ✗, register result at
the bottom. Click a contract to replay its finding through the stack.

---

## 5. Contract families

**What.** A contract is only understood together with its copies and amendments.

**In our system.** Duplicates: identical or near-identical text for the same counterparty;
the document that was in the register first stays the original (M15 = copy of M01).
Amendments are linked to their base agreement by party and date (M05-A → M05). If an
amendment renames the provider, the old name in the base agreement is "resolved", not a
finding. An amendment whose base agreement is missing is flagged (C16) – an incomplete
family is a finding for Legal. An amendment only counts as one if type and amendment flag
agree; otherwise the document stays a contract and is flagged (F10).

**What went wrong.** F6: a new copy turned the original into the duplicate (sorted by name).
F10: the model marked services agreement C11 as an amendment; register queries skip
amendments, so C11 silently vanished from every answer although it lacks a liability cap.

**Live.** `GET /documents/M05` (family M05, M05-A; legacy name resolved), `GET /documents/C11`
(flag `amendment_contradiction`).

**Diagram.** Family tree: base agreement, amendments in date order, duplicates greyed out;
legacy names crossed out where an amendment renamed the party.

---

## 6. Index and search (for open questions)

**What.** Find passages for questions that are not in the catalogue ("where do we regulate
data deletion?").

**In our system.** Two rankings: full text (BM25, exact words, rare words count more) and
vectors (text-embedding-3-small, 1,536 numbers per chunk, finds paraphrases). Reciprocal Rank
Fusion merges them by rank: score = Σ 1 / (60 + rank). 938 vectors cost $0.0045. In Azure:
AI Search with hybrid queries, semantic ranker and permission filters.

**Why this way.** Hybrid index with permission filters (11); search is a tool for open
questions, not the architecture – it can never prove absence (37).

**Live.** `GET /search?q=neither side has to pay more than the fees of the last year&doc_type=merchant_agreement&k=3`

| Ranking | 1 | 2 | 3 |
| --- | --- | --- | --- |
| BM25 | M02 liability | M06 liability | M11 liability |
| Vector | M02 liability | M01 **fees** | M06 liability |
| Fused (RRF) | M02 liability | M06 liability | M01 fees |

The vector search finds "fees" similar; RRF lifts M06 because it is high in both lists.

**Diagram.** Three columns side by side, lines connecting the same chunk across columns.

---

## 7. Portfolio check and coverage

**What.** One question over every contract – answered from the register, not by searching.

**In our system.** A fixed list of check types (missing clause, legacy names, governing law,
duplicates); a plan names the check and its parameters, anything else is rejected. Every
contract in scope is either checked or excluded with a reason (duplicate, amendment, type
unknown, not extracted); `checked + excluded = in scope` is asserted on every run. No model
call: a question costs $0 – reading the contracts was paid once ($0.12 for 47).

**Why this way.** Compile, don't search (4); negative search checks every contract, with
coverage (5); filters, not vector search, select contracts (17).

**What went wrong.** F10 – a filter that excludes documents can hide a miss. Since then every
exclusion is listed with its reason.

**Live.** `POST /runs` with the plan of Q1 (`GET /examples`):
"20 merchant agreements in scope · 19 checked · excluded: M15 (duplicate of M01, the original
is checked) · reported: M03, M08, M10, M14, M18".

**Diagram.** A bar of all contracts in scope: checked (with result), excluded (with reason),
nothing in between.

---

## 8. Triage

**What.** Review effort where errors are likely or an attack is possible – not everywhere.

**In our system.** FOUR_EYES if the document contains a suspected injection or contradicting
metadata; REVIEW if UNCLEAR or confidence below 0.8; otherwise CONFIRM, with a deterministic
10 % spot-check sample. Only signals from the register, never the model's self-assessment.
Q1: M14 FOUR_EYES (injected note), M08 and M10 REVIEW (unclear), M03 and M18 CONFIRM.

**Why this way.** Risk-based human-in-the-loop (13), concrete rule (53).

**Live.** `rows[].triage` and `triage` totals in every run.

**Diagram.** Three lanes (confirm / review / four eyes) with the contracts sorted into them.

---

## 9. Review and four-eyes principle

**What.** The system proposes, people decide. Every reported contract gets a human decision;
critical ones need two different people.

**In our system.** A reviewer confirms, rejects or corrects a row (e.g. "the clause is there
after all"), with a reason – required for rejections, corrections and every REVIEW or
FOUR_EYES row. States: FOUND → IN_REVIEW (1 of 2, four-eyes only) → CONFIRMED / REJECTED /
CORRECTED; if the two reviewers disagree the row becomes DISPUTED and is escalated. The same
person cannot review a row twice. CONFIRM rows can be confirmed in one batch, but never
REVIEW or FOUR_EYES rows or spot-check samples: no bulk confirmation of critical cases.
Reviewers are simulated (reviewer A / B via a header); in production the user comes from the
Entra ID token.

**Why this way.** Risk-based human-in-the-loop (13); triage rule (53); simulated reviewers
(54). Automation bias is real: evidence before verdict, reasons on record.

**Live.** `POST /runs/{run_id}/reviews` as reviewer A on M14 → `IN_REVIEW`; again as A →
409 "the second review must come from a different person"; as B → `CONFIRMED`.

**Diagram.** State machine FOUND → IN_REVIEW → CONFIRMED / REJECTED / CORRECTED, with the
DISPUTED branch; two avatars (A, B) on the four-eyes path.

---

## 10. Archive copy to the contract storage

**What.** "You may solely use it to store an additional copy of a contract in a legally
compliant manner." So the storage API is only ever written to – and only after approval.

**In our system.** A separate write-only service (mock under `/storage-mock`): one
operation, `PUT /contracts/{sha256}`, nothing to read, list or delete. The workbench calls it
over HTTP through an adapter, exactly as it would call Riverty's service. Tool gate: the
archive copy is refused (409) until the row is CONFIRMED or CORRECTED – a FOUR_EYES row needs
both reviewers. Idempotency: every source file is identified by its SHA-256; the workbench
skips files it already archived, and the storage itself stores a hash only once (exclusive
create), so a double click or a retry never creates a second copy. The receipt records who
approved it. Every attempt, also the refused one, is in the audit log.

**Why this way.** Storage API write-only, only for contract copies, only after approval (2);
nothing with external effect without approval (core design).

**Live.** Demo run on M14: archive before approval → 409; A + B confirm; archive → `PUT
/storage-mock/contracts/cdb8c67f…` 201, receipt `rcpt-cdb8c67f83fe`, approved by A and B
(342 ms); archive again → 200 `already_archived`; one file in the storage.

**Diagram.** Gate in front of the storage: closed (red) until approved, then one arrow with
the file hash; a second click bounces off ("already archived").

## 11. Audit and cost

**What.** Who did what, when and why; what each run cost.

**In our system.** Every model call is recorded with tokens and cost (`llm_calls`); pipeline
events in the register's audit log; human and workflow actions (runs, reviews, archive) in the
workflow database (decision 56), which survives a rebuild of the register. Runs are snapshots:
the audit shows what the reviewer actually saw.

**Live.** `GET /summary` (`cost`), `GET /audit`.
