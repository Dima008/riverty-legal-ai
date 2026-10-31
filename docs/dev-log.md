# Development log

One entry per work step (one step = one commit that changes code or behaviour), newest first.
Five points each: problem, cause, technique and why, rejected alternative, metric before → after.
Written with skill `dev-log`; the pre-commit hook refuses code commits without an entry.
Failures are detailed in `failure-cases.md`, decisions in `context/decisions.md` (Notion).

---

## 2026-10-31 · Honest statistics: how low could the true recall still be?

- **Problem:** The evaluation reported "recall 1.00" per question. On 5, 2 or even 1 expected
  contract that sounds like proof and is not – the fact-checker of the research flagged it.
- **Cause:** Point estimates without uncertainty; the gold set is small and the system was tuned
  on it.
- **Technique and why:** `recall_lower_bound()` – the exact one-sided 95 % Clopper-Pearson bound,
  computed by bisection on the binomial tail with `math.comb` (no new dependency), rounded down so
  it never overstates. Reported per question, pooled with an explicit caveat (shared documents,
  tuned on the set). The repeated runs get their names from the literature: pass^k (correct in
  every run) and run-to-run agreement of the findings (says nothing about correctness).
- **Rejected alternative:** The normal approximation (wrong at n = 5 and at 100 %); scipy for one
  formula; the "rule of three" (an approximation of the same bound).
- **Metric before → after:** Q1 "recall 1.00" → "1.00, true recall ≥ 0.54"; Q6/Q7 (2 contracts)
  ≥ 0.22; Q8 (1 contract) ≥ 0.05; all 28 together ≥ 0.89 with the caveat. Tests 67 → 70. New report
  `eval/results/2026-10-31_extract-v2_stats.txt` (numbers unchanged, one column more).
- **Links:** `eval/check_register.py`, `api/quality.py`, `tests/test_eval_stats.py`, `docs/research.md`

---

## 2026-10-31 · "Not found" instead of "Missing"

- **Problem:** "Missing" reads like a verdict on the contract ("the contract is deficient"),
  although the system only observes that no passage meets the playbook definition.
- **Cause:** The status label was written from the question ("which contracts lack X?"), not from
  what the system can state (decision 21: observations, not legal judgments).
- **Technique and why:** The register status ABSENT is shown as "Clause not found" / "Not found"
  (German "Klausel nicht gefunden" / "Nicht gefunden"); one change in `labels.ts` and the German
  dictionary, plus the chapter texts that name the three states. The questions keep "lack" and
  the top-k tiles in chapter 2 keep "missing" – there it is exactly the wrong reading being shown.
  Confirmed by Dima (decision 74).
- **Rejected alternative:** "Absent" (the internal code word, not lawyers' language); keeping
  "Missing" and relying on the note "an observation, not a legal assessment".
- **Metric before → after:** Screens and chapters calling the state "Missing": all → none.
  English walkthroughs (reviews, what-if) and the German walkthrough 14/14 still green; tsc green.
- **Links:** decisions 21, 74; `web/src/labels.ts`, `web/src/i18n.tsx`, `docs/approach.md`

---

## 2026-10-31 · Chapters 2, 3, 4 and 7 of the talk

- **Problem:** Six chapters were still placeholders three days before the dress rehearsal.
- **Cause:** Building them one after the other would take the whole weekend.
- **Technique and why:** Three subagents in separate git worktrees, each with chapter 1 as the
  template, `docs/approach.md` as the source of content and numbers, and one rule: every figure
  carries its justification. They could only create files of their own chapter; I copied and
  reviewed every file. Chapter 2: today's process as swimlanes, root causes → responses, top-k
  against the register live (k selector, M14 missed from k = 10), the quality goal. Chapter 4: the
  same lanes for tomorrow, compile once vs. ask many times, five flip cards. Chapter 3: the Double
  Diamond with the real artefacts, the paper trail counted from the files themselves, a decision
  explorer, the AI loop. Chapter 7: one map with a target | prototype toggle and a service card per
  box, the boundaries. Shared fixes from their reports: one SVG arrow marker per diagram (several
  diagrams on a page shared one id – arrowheads could vanish), and a step revealed with → scrolls
  into view.
- **Rejected alternative:** Merging the agents' branches (they started from an older commit);
  letting agents edit shared files (conflicts, and the shared parts need one owner).
- **Metric before → after:** Chapters with content 3 → 7 of 10; figures with a justification 2 →
  15. Walking the whole talk with →: 25 steps from chapter 1 to the live doorway, 0 console
  errors, no horizontal overflow; agents' walkthroughs 33/33, all steps, 28/28. Build green.
- **Links:** `web/src/story/chapters/` (Problem, Solution, Approach, Architecture),
  `web/src/story/Flow.tsx`, `web/src/story/Story.tsx`

---

## 2026-10-31 · Follow one contract through the pipeline (GET /documents/{id}/journey)

- **Problem:** Chapter 5 shows one contract travelling through the pipeline with time, tokens and
  cost per station ("see what works while it runs"). The numbers existed, spread over six tables.
- **Cause:** No endpoint put them together per contract.
- **Technique and why:** `GET /documents/{id}/journey` reads pages and OCR, sections, the latest
  extraction and checker call (tokens, seconds, cents), findings and how many the checks changed,
  family and former names, search rows and embeddings, and what the register reports – no model
  call, nothing estimated. Embeddings are batched across contracts, so only their number is shown,
  not an invented share of the cost.
- **Rejected alternative:** Recording timings with a new pipeline-event table (pipeline change
  days before the interview, and the register already has every number); estimating the
  embedding cost per contract.
- **Metric before → after:** Numbers for the M18 journey: typed into the plan → read live
  (OCR 93.4 %, 12 sections, 1,946 → 380 tokens, 5.9 s + 1.2 s, $0.0012). Tests 66 → 67.
- **Links:** `api/register.py` (`get_journey`), `tests/test_api_register.py`, `docs/explorer.md`

---

## 2026-10-31 · Building blocks of the presentation, and chapter 1 as the template

- **Problem:** Nine of ten chapters were placeholders. Dima's rule – every diagram is created
  *and* justified – needs one consistent form for figures, and a talk needs builds (reveal step by
  step) that survive a reload.
- **Cause:** The frame had chapters but no figure, diagram or step mechanism.
- **Technique and why:** `story/Figure.tsx`: every figure carries "shows · why it exists · why it
  looks like this · behind it", one click under the figure. `story/Flow.tsx`: boxes, arrows and
  swimlanes from plain data as SVG, coloured by who acts (person, code, model, data, outside
  system, gate) – decision 9 visible at a glance, no diagram library. Steps per chapter in
  `chapters.ts` and in the address (`#/story/task/1`): → reveals the next step, then the next
  chapter; ← goes back to the previous chapter's last step. The rail is coloured by Double Diamond
  phase. Chapter 1 imports Riverty's task text from `docs/context/case-study.md` (one source) and
  marks the nine sentences every requirement comes from, each with requirement, what was built
  and the decisions; then the cost calculator (assumption, sliders). Found while testing: my class
  `.step` collided with the check timeline's `.step` (a 20-px grid column) – renamed `.reveal`.
- **Rejected alternative:** A slide library (reveal.js) or a diagram library (two more things to
  explain, and the tool would not be part of the same page); copying the task text into the
  component (a second source that drifts).
- **Metric before → after:** Chapters with content 2 → 3 of 10; figures with a justification 0 →
  2. Story walkthrough 12 of 12 (updated for steps), 0 console errors; build green.
- **Links:** decisions 19, 66, 68; `web/src/story/Figure.tsx`, `Flow.tsx`, `chapters/Task.tsx`

---

## 2026-10-31 · The tool speaks German or English; the presentation stays English

- **Problem:** Riverty's legal team works in German, but every screen of the Legal Workbench was
  English – against the design principle "lawyers' language" (decision 74).
- **Cause:** Texts were written directly into the components; there was no translation layer.
- **Technique and why:** `web/src/i18n.tsx` without a library: the English text is the key,
  `t("Clause missing")` returns the German entry or – if one is missing – the English text, never
  an empty string; placeholders like `{done}` are filled after the lookup. A switch EN | DE sits in
  the header of the tool layer only and is remembered in the browser (works without storage too).
  Contract quotes, playbook definitions, model reasons and server messages are never translated:
  they are evidence or come from the server as they are. Example questions use the German wording
  the API already provides, while the run keeps the English question. Built by a subagent with a
  glossary of legal terms; every entry reviewed before the commit ("{n} × alt" → "{n} frühere").
- **Rejected alternative:** An i18n library (a dependency for one dictionary); translating the 10
  chapters as well (two versions to keep in sync, the talk is in English); a German-only tool (the
  panel reads English).
- **Metric before → after:** Screens in German: 0 → all tool screens; 286 German entries, every
  literal key covered (script check); 16 files. Edge: German walkthrough 14 of 14 checks; the three
  English walkthroughs (story, reviews, what-if) unchanged and green; 0 console errors; build green.
- **Links:** decision 74; `web/src/i18n.tsx`, `web/src/App.tsx`, `web/src/labels.ts`

---

## 2026-10-31 · Top-k against the register, measured (chapter 2)

- **Problem:** The central argument of the talk – top-k retrieval cannot prove that a clause is
  missing – rested on reasoning and on a one-off measurement by a planning agent; the chapter text
  marked its numbers "to reproduce".
- **Cause:** No script measured what a RAG system would answer to a completeness question.
- **Technique and why:** `eval/negative_search.py` ranks the passages of the 19 merchant
  agreements for "limitation of liability" with keyword search (BM25, no model call) and reads
  "not in the top k" as "missing" – the only reading top-k allows – for k = 5, 10, 20, 40, next to
  the register's answer. Stored in `eval/results/2026-10-31_negative_search.*`.
- **Rejected alternative:** Hybrid search with vectors (a model call per question and the same
  structural limit); asking a model with the top-k passages (adds variance, hides the mechanism).
- **Metric before → after:** Claim → measured: 8 of 19 contracts contain the words; k = 5: 14
  flagged, 9 false alarms, precision 0.36, recall 1.00; k ≥ 10: precision 0.36, recall 0.80 – M14
  missed because its injected sentence ranks 8th. Register: 1.00 / 1.00.
- **Links:** `eval/negative_search.py`, `docs/approach.md` chapter 2; decisions 5, 37, 41

---

## 2026-10-31 · Review in the contract register, reused by every run; the archive gate is clickable

- **Problem:** A review belonged to one run. Asking Q1 again showed M14 as "to look at" although
  two lawyers had decided it the day before, so review work grew with every question. A lawyer
  browsing the register could not decide or escalate a finding there at all. And the archive
  button was disabled before approval, so the server-side tool gate could never be shown.
- **Cause:** Reviews were keyed by run (decision 56: runs are snapshots); nothing tied a review
  to the finding it was about.
- **Technique and why:** A review now belongs to a finding *version* – document, clause, text
  hash, prompt version, status (`finding_reviews`, `api/findings.py`). Runs merge their own
  reviews with those of the same version from the register and other runs; a review made in a run
  is also stored per finding. Same rules everywhere (reason, four eyes, one vote per person,
  DISPUTED); ESCALATED needs a reason, is not a vote and raises the finding to four eyes. A changed
  text, extraction or status makes old reviews "earlier version" – never carried over silently.
  In the UI: a review panel in the contract file, marks in the matrix (✓ ½ ⚑ ! ✗), sources
  shown on every review; the archive button stays clickable and the 409 refusal is visible.
  The walkthrough found that the full-screen file covers the reviewer switch, so the panel offers
  "Continue as Legal Reviewer B".
- **Rejected alternative:** Reviews only per run (double work); one review per finding without a
  version (a changed result would count as reviewed); a third simulated user for escalations
  (changes the demo cast, decision 54).
- **Metric before → after:** A finding decided once is open again in the next run → reused
  (M14 confirmed in the register shows "Confirmed, in the register" in a new Q1 run and unlocks
  the archive copy). Archive refusals shown in the UI: 0 → visible with the server's message and
  audited. Tests 60 → 66 green (6 new); Edge walkthrough `reviews.mjs` 8 of 8, 0 console errors;
  build green.
- **Links:** decisions 71, 73; `api/findings.py`, `api/review.py`, `api/workbench.py`,
  `pipeline/portfolio.py`, `web/src/register/FindingReview.tsx`, `tests/test_api_findings.py`;
  explorer station 9

---

## 2026-10-30 · Review test no longer depends on one model answer

- **Problem:** `test_reason_required_for_review_rows_and_corrections` passed on today's register
  and failed on 4 of 5 repeat registers (`assert 201 == 422`) – the suite could turn red after a
  rebuild without any code change. That breaks the rule "tests check invariants, not one model
  answer" (F7). Found by the repo audit.
- **Cause:** The test assumed M08 is a REVIEW row in Q1. M08 is UNCLEAR (REVIEW) in two builds and
  ABSENT at 0.9 (CONFIRM) in four.
- **Technique and why:** Use M14, which is FOUR_EYES in every build because its injected note is
  found deterministically in the text; the test now also checks that a correction on a four-eyes
  row needs a second reviewer. The module docstring names which rows are stable and which move.
- **Rejected alternative:** Pick "the first REVIEW row" at run time (Q1 may have none in some
  builds, and the test would silently test nothing); pin the register (hides the problem).
- **Metric before → after:** `tests/test_api_review.py` against six registers (production, five
  repeat runs): 2 of 6 → 6 of 6 fully green. Tests 60 green.
- **Links:** engineering issue in `docs/failure-cases.md`; `tests/test_api_review.py`

---

## 2026-10-30 · F16: the law check compares the country; the coverage guarantee is named, not asserted

- **Problem:** "Contracts not governed by US law" reported all 14 checked contracts under a US
  state's law as "other law" and routed them as routine. And the coverage assertion, presented in
  the docstring as the F10 safeguard, could never fail (it counted two lists built by the same
  loop) and disappears under `python -O`. Found by the repo audit.
- **Cause:** The register stores ISO 3166 codes with the state for federal countries (US-NY,
  CA-BC), as the extraction schema asks; the check and `queries.by_law` compared the full code.
- **Technique and why:** Compare the country part (`law.split("-")[0]`, in SQL `substr(.., 1, 2)`).
  Replace the tautological assertion by naming the three mechanisms that really guarantee
  coverage, which the tests already check against the register. Regression test on the
  hand-made register, written first.
- **Rejected alternative:** Accept "US-NY" as a parameter (a lawyer asks about a country first;
  states can come later); keep the assertion as decoration (claims a check that does not exist).
- **Metric before → after:** law=US: other law 43 → 29, same law 0 → 14; Q5 (DE) unchanged
  (5 / 0 / 14); evaluation identical. Tests 59 → 60.
- **Links:** failure case F16 (and F10); `pipeline/portfolio.py`, `pipeline/queries.py`,
  `tests/test_portfolio.py`; explorer station 7

---

## 2026-10-30 · F15: keyword search filters before it cuts

- **Problem:** With a document-type filter, the keyword (BM25) list of `GET /search` could come
  back empty although the filtered contracts contain matching passages; the fused result was then
  pure vector search, without a warning. 39 of 116 realistic query/filter pairs were affected
  (10 empty, 29 short). Found by the repo audit.
- **Cause:** `bm25_ranking` took the top 200 hits of the whole register and filtered by document
  afterwards; long queries match almost every chunk ("the", "has"), so the 200 were often all
  from other contract types. The vector ranking already filtered first.
- **Technique and why:** The filter is part of the full-text query (`AND doc_id IN (...)`) and
  the cut to `depth` happens in SQL. The regression test states the invariant instead of
  repeating the SQL: every matching passage of the filtered contracts is ranked, up to the depth,
  and nothing else. Written first, red.
- **Rejected alternative:** A bigger LIMIT (moves the cliff, does not remove it); filtering in
  Python over all matches (loads every hit for each query). Stop words and stemming stay as they
  are until the retrieval evaluation measures them.
- **Metric before → after:** BM25 hits with the DPA filter for the test query 0 → 31; demo query
  (merchant agreements) 26 → 50 hits, top 3 unchanged; unfiltered lists identical. Tests 57 → 59.
- **Links:** failure case F15; `pipeline/search.py`, `tests/test_api_register.py`; explorer station 6

---

## 2026-10-30 · F14, F17: reading a contract again rebuilds everything; every file is its own document

- **Problem:** `pipeline.run --only M01,M14 --force` left both contracts unsearchable (search rows
  and embeddings 0), dropped M14's injection flag, and at the next families pass made the
  original M01 the copy of M15 (Q8 1.00 → 0.00). And a new file named like an existing contract
  (`M03_copy.pdf`) was merged into M03 and never read. Both found by the repo audit.
- **Cause:** Re-chunking deletes a document's search rows and embeddings, but only the extraction
  branch rebuilt them – and extraction is skipped when the text did not change. Ingest rewrote
  the document row (flags gone, ingest time reset), and families keep the earlier document as
  the original. `discover` grouped every file with the same id prefix – meant for scan pages.
- **Technique and why:** Everything derived is rebuilt in the same pass that reads a document
  again: same text → the stored findings are re-checked without a model call (`reassess` for
  those documents), then families, search rows and embeddings for every document touched. The
  first ingest time is kept. `--force` still extracts only when the text changed, so a repair
  run does not re-roll the model's answers (F7). Only the pages of one scan share a document;
  any other file gets its own id. Both regression tests were written first and failed.
- **Rejected alternative:** Re-extract every re-read document (costs model calls and can flip
  findings, F7, for an unchanged text); skip re-chunking when the text is unchanged (hides the
  real gap: derived data rebuilt only in one branch); keep grouping by prefix and warn.
- **Metric before → after:** The F14 command on a register copy: search rows / embeddings of
  M01 and M14 0 / 0 → 12 / 12 and 13 / 13, M14 injection flag lost → kept, Q8 after the next
  families pass 0.00 → 1.00, cost $0.0000 (2 embedding calls, no extraction). Files merged into
  one document in the F17 folder: 4 → 1 each. Evaluation identical; tests 55 → 57 green.
- **Links:** failure cases F14, F17 (and F6); `pipeline/run.py`, `pipeline/ingest.py`,
  `pipeline/extract.py` (`reassess(only=...)`), `api/quality.py`, `tests/test_ingest.py`;
  explorer stations 1 and 5

---

## 2026-10-30 · F13: two requests at once no longer break the workflow database

- **Problem:** When two requests overlapped – two reviewers, a refresh during a review – many
  failed with HTTP 500, and the audit log then showed "No actions yet.": the traceability screen
  silently claimed that nothing had happened. Found by the repo audit, not by any test.
- **Cause:** The workflow-database connection was opened without `check_same_thread=False`.
  FastAPI opens, uses and closes a sync `yield` dependency in separate thread-pool calls that can
  run on different threads. The UI turned the failed request into an empty list.
- **Technique and why:** The same flag the register connection already uses – one connection
  still serves exactly one request, so the check guarded nothing. A regression test fires 10
  concurrent requests three times on /runs and /audit; it was written first and failed. The audit
  log and the what-if table show errors instead of empty states (fail loudly, decision 44).
- **Rejected alternative:** A lock around every request (serialises the API for nothing); one
  shared connection (state shared between requests); an async SQLite driver (a new dependency
  days before the interview).
- **Metric before → after:** Concurrent requests failing on a real uvicorn server: 215 of 360 →
  0 of 180 (three runs, 0 server exceptions). In-process: 38 of 60 raised → 0 (test). Tests
  53 → 55 green.
- **Links:** failure case F13; `api/workbench.py`, `tests/test_api_concurrency.py`,
  `web/src/AuditLog.tsx`

---

## 2026-10-30 · Storyline approved: 10 chapters in five acts, 17:15 min

- **Problem:** The chapter list was a draft (four acts, 18:45 min) – too little buffer for
  questions, and architecture and operations sat under "Proof".
- **Cause:** It was written before the site workflow had compared the three outlines.
- **Technique and why:** Adopted the synthesis Dima approved (decision 68): acts Why · How · Proof ·
  Operate · Live, new titles, leads and minutes in `story/chapters.ts`, the act list exported from
  there so the rail follows it. Dima also confirmed decisions 21 and 26 and decided 69–72 (no model
  switch in the frontend, bugs before readability, a clickable archive button, a sealed held-out set).
- **Rejected alternative:** Keep 18:45 min (2 min less for questions); architecture before the
  pipeline (the pipeline map is the base picture for chapters 6 and 8).
- **Metric before → after:** Planned time 18:45 → 17:15 min (buffer 1:15 → 2:45); acts 4 → 5.
  Story walkthrough 12 of 12 checks, tsc green.
- **Links:** decisions 21, 26, 68–72 (Notion pending); `web/src/story/chapters.ts`

---

## 2026-10-30 · "Switch a safeguard off" as a panel in the proof chapter

- **Problem:** The replay existed only as API and CLI. In the talk it has to be clickable,
  readable for lawyers and fast enough to answer while the panel watches.
- **Cause:** The first version returned the layer list together with the table "each layer off on
  its own" (7.8 s on the first call), so the switches would have waited for it.
- **Technique and why:** One switch per safeguard, grouped like the sandwich, each with what it
  guards against and its failure cases (F1, F7, …). Presets for the beats of the story (both
  quote checks off, recall first off, injection guard off, the model alone). Results in lawyers'
  terms: "M08, M10 slip through", tiles "3/5" per question, and a table of what a lawyer would
  see differently (status and review level before and after, signals no longer raised). Below,
  the table "each safeguard off on its own" – a click on a row switches exactly that layer off.
  The layer list is its own instant endpoint; the table loads in the background and is cached.
  Placed in the chapter "Measured, not claimed" for now.
- **Rejected alternative:** A chart of recall per layer (hides which contract slips through and
  who loses the second look); a separate lab page outside the story (breaks the flow of the talk).
- **Metric before → after:** Switches visible: 0 → 8. Time per click (API): 0.69–0.81 s; table:
  7.8 s on the first call, then 0.004 s. Edge walkthrough (`whatif.mjs`): 7 of 7 checks pass
  (presets, switch, table row, arrow keys on a switch do not turn the page, phone width 390 px:
  horizontal overflow 193 px → 0), 0 console errors. Tests 53 green, build green.
- **Links:** decision 67; `web/src/story/WhatIf.tsx`, `web/src/api.ts`, `api/quality.py`

---

## 2026-10-30 · What if a safeguard were missing? Live failure demo by replay

- **Problem:** Dima wants to show problems live – a missing check, a technique not used, a weak
  prompt. "The checker catches F1" was only told, never shown; and live model calls with a bad
  prompt cost money, take time and can vary (F7) in front of the panel.
- **Cause:** The checks ran as one fixed stack; a layer could not be removed without editing code.
- **Technique and why:** Every safeguard got a switch (`off` in `extract.assess` / `reassess`,
  default: nothing off). `eval/what_if.py` copies the register into memory (SQLite backup),
  replays the stored model answers with the chosen layers off, re-links the families and
  answers Q1–Q8 exactly as production does – no model call, the same result every time. Layers
  are cut by purpose, not by code line: "injection guard" removes the quote fence, the confidence
  cap and the four-eyes flag together. Two invariants are tests: with nothing switched off the
  replay equals the register, and a safeguard only ever adds caution (switching one off never
  finds more, reports more or sends more to a human). "Model alone" computed this way equals the
  evaluation's ablation. API: `GET /what-if?off=…`, `GET /what-if/layers`; CLI `python -m eval.what_if`.
- **Rejected alternative:** Live calls with weakened prompts as the main demo (cost, latency,
  variance; stays an option for one contract); recomputing "without layer X" from the stored
  flags (a second copy of the confidence logic); replaying into the production register.
- **Metric before → after:** Safeguards that can be shown switched off: 0 → 8. Replay with nothing
  off = register: 235 of 235 findings identical, 0.72 s; table of all layers 7.8 s (then cached).
  One layer off at a time, Q1–Q8 recall stays 1.00 – the checks overlap: vocabulary check and
  checker both catch M08 and M10. Both off → Q1 0.60 (M08, M10 slip through); recall first off →
  Q1 0.60; injection guard off → M14 loses the four-eyes check (3 findings); absence signals off
  → 5 findings lose their review; amendment check off → C11 drops out of every answer (F10); quote
  check and OCR guard → no change on today's data (every model quote exists; no low-quality scan
  yet – the handwritten H01 will test it). Tests 49 → 53 green; evaluation unchanged.
- **Links:** decision 67 (Notion pending); `eval/what_if.py`, `pipeline/extract.py`,
  `api/quality.py`, `tests/test_what_if.py`; explorer station 4

---

## 2026-10-30 · One website: the case study first, the tool as the last stop

- **Problem:** Presentation and tool should be one website: click through from the case study to
  the tool, with the tool demo at the end. The app had only the tool (three tabs), no way to
  present, and no address for a chapter or a view.
- **Cause:** The frontend was built tool-first; the area lived in component state and was only
  mirrored into the address.
- **Technique and why:** Hash routes without a router library – `#/story/<chapter>` and
  `#/tool/<area>` – so the address says where you are, every chapter can be bookmarked for the talk
  and the page works on any static host. Two layers in the header ("Case study" | "Legal
  Workbench"); the tool's tabs become the second level. Chapters are data (`story/chapters.ts`:
  act, title, lead, speaking time), so the storyline changes in one place and the rail shows the
  planned time. Keys ← → and PageUp / PageDown (what presenter clickers send) turn the page only
  in the story and never while a control needs them. Switching layers returns to the last chapter
  or view. Old links (`#register`) still work. Chapter bodies stay placeholders until the
  storyline is approved; the "live" chapter already launches the three tool views.
- **Rejected alternative:** Separate slides (PowerPoint, reveal.js) – two things to keep in sync,
  and the tool would not be the end of the same page; react-router – a dependency for two route
  levels.
- **Metric before → after:** Layers: tool only → story (10 chapters, 18:45 min planned) + tool.
  Edge walkthrough (`story.mjs`): 12 of 12 checks pass (keys, rail, launch, back to the last
  chapter, old links, last chapter stays), 0 console errors. Phone width 390 px: horizontal
  overflow 414 px → 0. `npm run build` green.
- **Links:** decision 66 (Notion pending); `web/src/routing.ts`, `web/src/story/`, `web/src/App.tsx`

---

## 2026-10-30 · Model comparison: gpt-4.1 against gpt-4.1-mini

- **Problem:** The small model alone misses traps (Q1 0.60–1.00 depending on the run). Would a
  bigger model make the checks unnecessary, and what would it cost? "Bigger is better" was an
  assumption (decision 42), not a measurement.
- **Cause:** Only one model had been measured, and one run is not a measurement (F7).
- **Technique and why:** The same harness as the variance measurement: `python -m eval.repeat
  --runs 2 --label gpt-4.1 --chat-deployment gpt-4.1` builds two fresh registers with gpt-4.1 as
  extractor and checker – same prompt v2, same checks – and evaluates them like production. The
  price went into `config.py` first (the price guard refuses a model without one). Then every
  disagreement was read in the register, not only the scores.
- **Rejected alternative:** Switch the production model after one run; compare only Q1; trust
  the CUAD score without reading the disagreements – it would have ranked the model that missed
  a clause higher (F12).
- **Metric before → after:** gpt-4.1-mini (3 runs) → gpt-4.1 (2 runs). Recall and precision on
  Q1–Q8 with checks: 1.00 → 1.00 in every run. Model alone on Q1: 1.00 / 0.80 / 0.80 → 1.00 /
  1.00. Findings stable, model / after the checks: 233 / 233 → 235 / 232 of 235 (the checker
  flips, F11). CUAD agreement: 19 → 18 of 20 (F12). Cost per run: $0.091–0.112 → $0.445–0.603
  (×5; cached prompt tokens 47k → 153k between the two gpt-4.1 runs, −26 %). Duration: 101–134 s
  → 245–252 s (×2). Production stays on gpt-4.1-mini.
- **Links:** failure cases F11, F12; decision 65 (Notion pending); `pipeline/config.py` (price),
  `eval/results/2026-10-30_extract-v2_gpt-4.1_*`, explorer station 4

---

## 2026-10-30 · Repeated runs measure the model's variance; price guard against "free" models

- **Problem:** "One run is not a measurement" (F7) – how much do the answers change between runs
  at temperature 0, and do the checks catch it? A second model could not be compared yet.
  Reading the cost code also showed that a model without a price was logged as $0, silently.
- **Cause:** Every experiment would have overwritten the production register; the cost lookup
  fell back to price 0 instead of failing.
- **Technique and why:** `REGISTER_DB` points a run at another register file; `pipeline.run
  --no-index` skips the search index; `eval/repeat.py` builds N fresh registers (optionally with
  another deployment), evaluates each like production and writes a summary: answers per question
  per run, and which findings flipped – before and after the checks. `config.check_prices()`
  stops the pipeline before the first call if a configured model has no price (fail loudly, F2).
- **Rejected alternative:** Re-extract into the production register (loses the reference run);
  measure variance only on Q1 (hides which findings flip); warn about a missing price in the log.
- **Metric before → after:** Runs compared: 2 → 5. Findings stable in every run: 233 of 235;
  only M08 and M10 flip, every wrong "present" became "unclear". Recall and precision 1.0 on
  Q1–Q8 in all runs; model alone on Q1: 1.00 / 0.80 / 0.80. Cost per run $0.112 / $0.108 / $0.091
  (cached prompt tokens 47k → 62k → 118k), 101–134 s per run. Missing price: logged as $0 →
  refused before start. 49 tests green.
- **Links:** failure case F7 (now measured), engineering issue "price"; decision 64 (Notion
  pending); `eval/repeat.py`, `pipeline/config.py`, `pipeline/run.py`

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
