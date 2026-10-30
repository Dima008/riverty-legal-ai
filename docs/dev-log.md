# Development log

One entry per work step (one step = one commit that changes code or behaviour), newest first.
Five points each: problem, cause, technique and why, rejected alternative, metric before → after.
Written with skill `dev-log`; the pre-commit hook refuses code commits without an entry.
Failures are detailed in `failure-cases.md`, decisions in `context/decisions.md` (Notion).

---

## 2026-10-30 · Monitoring: cost, latency, pipeline state, review workload, override rate

- **Problem:** Nothing showed how the system behaves in operation: what model calls cost and how
  long they take, whether documents failed, how much review work is open and how often
  reviewers overrule the system – the numbers the briefing names for the monthly review with Legal.
- **Cause:** The data existed (`llm_calls`, the register's audit log, the workflow database,
  stored evaluation runs) but no view combined it.
- **Technique and why:** `GET /monitoring`: model calls per purpose (calls, cost, tokens,
  p50 / p95 / max latency) and per day; pipeline (status, flags, extraction failures, last
  ingest, prompt versions); workflow (runs, triage, review states, open and disputed rows,
  decisions, override rate = rejected + corrected / all decisions, archive copies and refusals);
  quality of every stored evaluation run. Computed on request, no extra storage.
- **Rejected alternative:** A separate metrics store or Application Insights already in the
  prototype (target in Azure, overhead now); counting overrides per run only (hides the trend).
- **Metric before → after:** Monitored signals 0 → 4 groups. First readings: extraction p50 5.0 s,
  p95 36.1 s; checker p50 1.7 s; one embedding call 40 s (rate-limit retry); 3 flagged documents
  (M14 injection, C11 contradiction, C16 base missing); 0 extraction failures. Test: 1 confirmation
  + 1 rejection → override rate 0.5, 3 rows open. 49 tests green.
- **Links:** decision 63 (Notion pending); `api/quality.py`

---

## 2026-10-30 · Compare two contracts: duplicate against original, contract against contract

- **Problem:** Dima wants to look into the contract a duplicate is similar to, and to compare any
  two contracts – the second meaning of "compare" in the task (contract against contract).
- **Cause:** The register only stored *that* M15 is a copy of M01, not *how* the two relate.
- **Technique and why:** `pipeline/compare.py`, deterministic: relation (duplicate, family),
  same file / same text by hash, overall similarity, metadata differences, every playbook clause
  for both, and the text section by section – paired by section number, otherwise by the most
  similar text – with word-level differences. `GET /compare?a=&b=`. No model call, so it is free
  and repeatable.
- **Rejected alternative:** A model call that "describes the differences" (costs money, can
  invent differences); one diff over the whole text (unreadable for a lawyer).
- **Metric before → after:** M15 vs M01: duplicate, same text, different file, 100 %, 0 changed
  sections. M01 vs M02 (same template): 92.8 %, 8 sections identical, 4 changed; "7. Liability" vs
  "7. Responsibility for Damages" only 43.8 % alike although the register finds a liability cap in
  both. 4 new tests, 47 green.
- **Links:** decision 62 (Notion pending); `pipeline/compare.py`, `api/register.py` (`/compare`)

---

## 2026-10-30 · Evaluation as data: evaluate() and render(), JSON results, GET /evaluation

- **Problem:** Evaluation results existed only as a printed text report; the quality view,
  monitoring and the planned model comparison need the numbers, and the configuration of each
  run (model, prompt version) was not recorded with it.
- **Cause:** `eval/check_register.py` computed and printed in one function.
- **Technique and why:** `evaluate()` returns every number as data (questions, ablation,
  metadata, CUAD, cost, configuration read from the register); `render()` prints the old report;
  `--json` stores the numbers next to the text. `GET /evaluation` serves the live evaluation and
  all stored runs, with the honest caveat (tuned on the same set). A test checks that the
  evaluation and the workbench (`POST /runs`) report the same contracts.
- **Rejected alternative:** Parse the text report in the UI (brittle); a second evaluation
  implementation for the API (two answers to one question).
- **Metric before → after:** Report byte-identical to the old version (33 lines, empty diff).
  Machine-readable runs: 0 → 1 (`2026-10-30_extract-v2_laptop.json`). Evaluation and workbench
  agree on 8 of 8 questions (new test). 43 tests green.
- **Links:** decision 61 (Notion pending); `eval/check_register.py`, `api/quality.py`

---

## 2026-10-30 · Contract register as a matrix against the playbook, with a contract file

- **Problem:** Dima could not see the contracts at all without asking a question first, nor
  what they are compared with ("Where are the contracts? What am I comparing?").
- **Cause:** The workbench only showed the rows a question reported; the comparison standard
  (Legal's playbook) lived in `catalogue.py` and was invisible in the UI.
- **Technique and why:** `GET /matrix` returns every document with one cell per playbook clause
  (found / missing / unclear, required or not for its type, whether the checks overruled the
  model) plus open and resolved former names. The UI shows it as a matrix with the playbook
  definitions on top; a click opens the contract file (drawer) with the original page, all
  findings in playbook order (required first), the checks and the definition. No model call.
- **Rejected alternative:** A plain contract list without the standard; the contract file as a
  separate page (loses the matrix context).
- **Metric before → after:** Contracts visible without a question: 0 → 47. The matrix agrees
  with the gold set: Q1 from the matrix = gold answer (test); 9 merchant agreements with a
  required gap = union of Q1, Q3, Q4; 3 DPAs = Q6 ∪ Q7; 5 open former names = Q2. Edge
  walkthrough: 7 screenshots, 0 errors; 2 defects found and fixed (findings in alphabetical
  instead of playbook order, plural document type in the file header). 41 tests green.
- **Links:** decision 60 (Notion pending); `api/register.py` (`/matrix`), `web/src/register/*`,
  `web/src/components/Finding.tsx`

---

## 2026-10-30 · Development log and session summary as a fixed routine

- **Problem:** Reasons, rejected alternatives and numbers of each step were spread over commit
  messages, chat and Notion; nothing collected them per step for the presentation.
- **Cause:** No fixed place for them, and a rule in CLAUDE.md alone is a request, not a check.
- **Technique and why:** `docs/dev-log.md` with five fixed points per step; skill `dev-log`;
  the pre-commit hook refuses a commit that changes code without a new entry; skill
  `session-summary` writes a short German summary to Notion "Sitzungsprotokolle" at the end
  of a session. Same principle as the product: the prompt asks, the check enforces.
- **Rejected alternative:** Rule in CLAUDE.md only (nothing enforces it); a Claude Code stop
  hook after every answer (fires in the middle of a step too).
- **Metric before → after:** 0 of 9 steps of today documented this way → 9 entries, backfilled
  from commits, test runs and screenshots. Hook test: code change without entry → blocked;
  with `SKIP_DEVLOG=1` → allowed; docs-only change → allowed.
- **Links:** decision 59; `.githooks/pre-commit`, `.claude/skills/dev-log`, `.claude/skills/session-summary`

## 2026-10-30 · Workbench redesign and hint highlighting for missing clauses

- **Problem:** The workbench worked but looked like a generic scaffold: questions as a grey wall
  of buttons, key numbers hidden in text, the evidence page at the very bottom, no identity.
- **Cause:** The first version focused on function; Fluent UI defaults without a layout design.
- **Technique and why:** One brand colour ramp (`web/src/theme.ts`), question cards, KPI tiles,
  result cards with a triage accent, the page as "paper" next to "model proposed → checks →
  register says" with the checks as a timeline. For a clause reported missing, the passage that
  triggered a hint is highlighted (API `kind: signal`) – the reviewer sees why it needs a look.
- **Rejected alternative:** Keep the table layout; use Riverty's corporate colours without
  confirmed values.
- **Metric before → after:** M14 evidence: page 1, nothing highlighted → page 3, the injected
  note highlighted (15 words, coverage 100 %). Scripted Edge walkthrough: 7 screenshots,
  0 browser errors; 40 tests green.
- **Links:** decision 58; `web/src/workbench/*`, `api/register.py` (highlight)

## 2026-10-30 · Legal Workbench frontend, first version

- **Problem:** No user interface for the end-to-end workflow.
- **Cause:** New deliverable (step 5).
- **Technique and why:** Vite + React + TypeScript + Fluent UI v9 (Riverty stack, Microsoft
  design system), typed API client, lawyers' language in one file (`labels.ts`). Verified with
  a scripted walkthrough in the installed Edge (playwright-core, no extra browser download).
- **Rejected alternative:** PDF.js for the evidence (decision 52); a project generator (more
  boilerplate to explain); TypeScript 7 (too new for the tooling).
- **Metric before → after:** First screenshots showed 5 defects (status text wrapping, technical
  flag names, source below the decision, wrong correction default, missing favicon) → all fixed,
  0 browser errors. `tsc` 0 errors; bundle 173 kB gzip.
- **Links:** decision 58

## 2026-10-30 · API step 3 – four-eyes review and gated archive copy

- **Problem:** No human approval and no archive copy; the contract storage may only be written,
  only after approval, and only once.
- **Cause:** New workflow step.
- **Technique and why:** Reviews with reason rules, four-eyes with two different people,
  DISPUTED on disagreement, batch only for routine rows; tool gate before the archive;
  idempotency by SHA-256 per file in the workbench and in the storage (exclusive create);
  write-only storage mock reached over HTTP through an adapter, like the real service.
- **Rejected alternative:** Archive right after the system's proposal; one hash over all pages of
  a scan; the mock as a direct function call (no real REST boundary).
- **Metric before → after:** End to end over real HTTP: archive before approval → 409; after A + B
  → stored in 342 ms; second click → "already archived", 1 file in the storage. 38 tests green.
- **Links:** decision 57; `api/review.py`, `api/storage_mock.py`

## 2026-10-30 · Explorer content as the single source for the frontend

- **Problem:** Explanations of every pipeline step existed (Notion, German) but not in a form the
  frontend can show.
- **Cause:** No English source per step with numbers, decision and failure.
- **Technique and why:** `docs/explorer.md`: per station what, real numbers, why (decision),
  what went wrong (failure), live API call, diagram idea; a CLAUDE.md rule keeps it current.
- **Rejected alternative:** Write the texts directly into React components (two places to keep
  in sync).
- **Metric before → after:** 0 → 11 stations documented.
- **Links:** decision 49

## 2026-10-30 · API step 2 – portfolio runs with coverage and triage

- **Problem:** A portfolio question needs an answer for every contract and must show what was not
  checked, and why.
- **Cause:** The query functions excluded duplicates and amendments silently – the reason F10
  stayed invisible.
- **Technique and why:** Fixed check types with plan validation (a planner can choose, never
  invent a query); coverage invariant "in scope = checked + excluded with reason", asserted on
  every run; triage rule; runs stored as snapshots in a separate workflow database.
- **Rejected alternative:** Free queries from a planner; workflow tables inside the register
  (lost on every rebuild).
- **Metric before → after:** 8 of 8 gold questions through `POST /runs`, identical to the
  evaluation; Q1: 20 in scope, 19 checked, M15 excluded with reason; a hand-made register proves
  unknown and unextracted documents stay visible. 32 tests green, 0 model calls.
- **Links:** decisions 53, 55, 56; `pipeline/portfolio.py`, `api/workflow.py`

## 2026-10-30 · API step 1 – read-only register, explorer data, quote highlight

- **Problem:** Frontend and explorer need intermediate results (chunks, check layers, rankings)
  and the quote highlighted on the original page.
- **Cause:** The pipeline was command-line only; quotes are verified on the cleaned text, not on
  the words of the page (which still contain headers and footers).
- **Technique and why:** FastAPI endpoints; highlight by aligning the quote's words with the
  page's words (difflib) – a 17-word page header at a page break is skipped as a gap; search
  split into BM25, vector and RRF so each list can be shown.
- **Rejected alternative:** Sliding-window fuzzy match (first attempt).
- **Metric before → after:** M09 quote across a page break: sliding window 80.9 %, 2 quote words
  lost, header words marked → alignment 100 % (45 of 45). 63 of 63 quotes in PDFs and scans
  found; 82 quotes in 0.6 s → 0.13 s. Search refactor: 8 of 8 queries identical to the old code.
- **Links:** decision 52; `pipeline/evidence.py`, `api/register.py`; engineering issue port 8000

## 2026-10-30 · Contracts stay visible when amendment metadata contradicts itself (F10)

- **Problem:** Services agreement C11 was missing from every portfolio answer, although it has
  no limitation of liability.
- **Cause:** The model set `is_amendment = true` while typing it `other_commercial_agreement`;
  queries skip amendments; no check compared the two fields.
- **Technique and why:** Deterministic consistency check: an amendment only if both fields agree,
  otherwise treat it as a contract (recall first) and flag it for review. Amendments without a
  base agreement are flagged as an incomplete family.
- **Rejected alternative:** Trust the `is_amendment` field; sharpen the prompt and re-extract
  (costs money, does not guarantee consistency).
- **Metric before → after:** 18 of 19 other commercial agreements visible, C11 missing from the
  liability answer → 19 of 19, C11 listed. Evaluation unchanged (1.0 on Q1–Q8); 0 model calls.
- **Links:** failure case F10, decision 51; `pipeline/extract.py`, `pipeline/families.py`

## 2026-10-30 · Demo laptop set up, first evaluation there, repo routines

- **Problem:** The live demo runs on the laptop, which had no environment and no register; rules
  like "never commit secrets" and "record every failure" existed only as text.
- **Cause:** Development so far ran in a cloud session; a rule in a prompt is not a check.
- **Technique and why:** Python 3.12 venv, Tesseract 5.4 with German data in the user folder (no
  admin rights), package versions pinned to the green run, evaluation on the laptop itself;
  skills `record-failure`, `log-decision`, `run-eval`; pre-commit hook against secrets.
- **Rejected alternative:** Python 3.13 (untested); copying language data with admin rights;
  minimum versions only; rules in CLAUDE.md only.
- **Metric before → after:** No register → 47 documents, 938 chunks (same as the cloud), recall
  and precision 1.0 on Q1–Q8, $0.1191 per run. Model alone on Q1: recall 0.60 (cloud 0.80), with
  checks 1.00. Hook: 3 of 3 fake secrets blocked, 0 false alarms on the repo.
- **Links:** failure cases F7 (new evidence), F9; decisions 47, 48, 50
