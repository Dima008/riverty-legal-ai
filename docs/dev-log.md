# Development log

One entry per work step (one step = one commit that changes code or behaviour), newest first.
Five points each: problem, cause, technique and why, rejected alternative, metric before → after.
Written with skill `dev-log`; the pre-commit hook refuses code commits without an entry.
Failures are detailed in `failure-cases.md`, decisions in `context/decisions.md` (Notion).

---

## 2026-11-02 · The live click script follows the new Workbench

- **Problem:** The note of the card 'live' still walked the old Workbench ("I ask Q1", a table "to
  look at", M08 "highlighted" as evidence) – the tool now shows analysis boxes, a contract step and
  every contract in green / orange / red, and M08's rejected passage is only outlined.
- **Cause:** The Workbench changed (decision 95) after the notes pass.
- **Technique and why:** The six numbered steps still match the six boxes on the card: choose the
  analysis; the contracts and Confirm the plan; the answer with every contract in its colour (H01
  orange: a poor scan cannot prove an absence); M08 outlined as rejected, then M01 green with its
  passage in yellow; four eyes on M14; the archive copy. Ids come from the register snapshot; a new
  guard checks that M01 is green.
- **Rejected alternative:** Keeping "highlighted" for M08 (it is not evidence, F41).
- **Metric before → after:** 'live' note 148 → 181 spoken words, needs 96 s of its 115 s (the rest
  is clicking time, decision 92); main track still 1319 s (21:59); no guard fires.
- **Links:** decisions 92, 95; `web/src/deck/slides/act6.tsx`, `docs/demo.md`

## 2026-11-02 · The Workbench as Dima described it: analysis, contracts, Go, every contract green / orange / red, the passage in yellow

- **Problem:** Dima: "I choose the analysis in clear boxes, then the contracts, then Go; then I see
  which are positive, orange and red; I click one and see the confirmed passage or the missing one –
  the page in the middle with the yellow marking, the finding on the right." The answer showed only
  the reported contracts; the 14 that contain the clause were grey tiles that were not counted and
  opened the wrong file in Q2, Q5 and Q8; a rejected quote was yellow like evidence (M08).
- **Cause:** A run returned only the evaluation's reported rows, and the UI had no rule for
  "positive"; one highlight colour served three meanings.
- **Technique and why:** Decision 95, from a design round (three designs, scored and merged):
  five separate analysis boxes (missing clause, find a clause, former company name, governing law,
  copies) and a visible contract step with filters and the scope preview; the answer shows every
  contract in scope as a lane per colour with counts that add up. One colour rule on the server
  (tested): red = the issue is there, orange = the register cannot settle it, a person looks (poor
  scan, a doubtful Found, an unconfirmed law, a Legal correction), green = positive with evidence.
  The reported rows stay exactly the evaluation's answer; all other evaluated contracts go into a
  separate list with their evidence. Yellow only for checked evidence, an orange dashed outline for
  a rejected passage, red for text addressed to AI systems. Every detail view says how we know – also
  for "not found" (pages read, typical wordings searched). Green rows can be challenged in place.
- **Rejected alternative:** One mixed box of questions (decision 93); more reported rows (breaks the
  evaluation's count test); loading green evidence live per contract (about 28 calls for Q1).
- **Metric before → after:** Q1 green contracts visible 0 → 14, each opening with its passage in
  yellow (14 of 14); Q2 0 → 39, Q8 0 → 46 green; M08's rejected quote yellow → outlined; window
  scroll at 1366x768 on the plan screen 12–51 px → 0; pytest 159 → 176 passed; eval Q1–Q8 1.00, CUAD
  19/20; F37–F45 recorded and fixed.
- **Links:** decision 95; F37–F45; `pipeline/portfolio.py`, `api/workflow.py`,
  `web/src/workbench/AnalysisStep.tsx`, `ContractsStep.tsx`, `Lanes.tsx`, `answerRows.ts`,
  `web/src/components/HowWeKnow.tsx`, `tests/test_portfolio_lights.py`

## 2026-11-02 · Speaker notes for reading aloud: short sentences, every key idea explained once, room for Dima's introduction

- **Problem:** Dima reads the notes aloud at B2. Many sentences were long, joined by dashes or
  nested; some key ideas (compile, don't search; maker-checker; model_status vs status; recall
  first) were used but never explained in plain words. The title had no room for his own
  introduction (3 s left at 22:00).
- **Cause:** The notes grew card by card; each pass added explanations, none rewrote for reading.
- **Technique and why:** One pass over notes, pronunciation hints and seconds only: sentences of at
  most 15 words, one idea each, no dashes; every key idea explained once at its first mention
  (table in the pass report); the panel's fact-checked one-liners on human, checks and azure. Room
  came from removing repeats (the title's question now only on part-1; three repeats on today), not
  content. The title is "Hello, I'm Dima." + a visible, unspoken placeholder "[Here you introduce
  yourself – in your own words.]" + what the project is + the agenda. An independent check found
  one lost phrase ("nobody enjoys it"), an ambiguous "capped", a wrong reference and "synthetic
  data" on the azure screen (CUAD is public) – all fixed. Two new guards keep the azure note true
  (only `pipeline/llm.py` calls the model; no Dockerfile or Terraform yet).
- **Rejected alternative:** Moving another card to the deep dives for the 15 s; cutting sentences.
- **Metric before → after:** honest main track 1320 s with 3 s for Dima's introduction → 1319 s
  (21:59) with 15 s; longest note sentence 30+ → 15 words; dashes in main-track notes many → 0;
  `newcards.mjs`, `deck.mjs`, `honest.mjs` without problems; no dev-guard console errors.
- **Links:** decisions 90, 96; `web/src/deck/slides/act1.tsx`–`act6.tsx`, `proof.tsx`,
  `docs/approach.md`

## 2026-11-01 · Dima's speaker notes in, every correctness fix in, and honest time: 29 cards in 22:00

- **Problem:** Dima added speaker-note wishes in Notion (the intro before the task sentences, the
  six sentences, "a missing clause has no passage", the agent that stops early unnoticed), and the
  independent order pass of 71d5cf9 found 1 blocker and 18 should-fix items (planned shown as
  built, terms before their explanation). Measured honestly at 115 spoken words per minute, the
  talk then needed 24:39 – over Dima's hard maximum of 22:00 – while the cards claimed 19:53.
- **Cause:** The card seconds were set from a 2-words-per-second budget, not from the real
  speaking pace; every new explanation added time nobody counted.
- **Technique and why:** No content cuts (Dima): his sentences went in word for word, the order
  pass's correctness fixes were applied, time-only trims were skipped. Every card got honest
  seconds (115 wpm + 1 s per build, `honest.mjs`). Decision 96: injection, what-if, sharepoint and
  cost moved to the deep dives (nothing deleted); what they introduced first is picked up once on a
  remaining card (four eyes for M14's hidden instruction on 'human', 12 cents and Prompt Shields
  on 'what-we-use', "the same lawyers answer more questions" on 'run-it'). The title says "In
  about twenty minutes".
- **Rejected alternative:** Accepting about 25 minutes; speaking at about 130 wpm; trimming
  sentences against Dima's rule.
- **Metric before → after:** main track 33 cards, claimed 1193 s but honestly 1479 s → 29 cards,
  1320 s honest (22:00), 18 deep dives; order-pass findings 19 of 19 blocker/should-fix handled
  (time-only trims skipped by rule); `newcards.mjs` all cards without problems; `deck.mjs` 50 of 50;
  no dev-guard console errors.
- **Links:** decisions 90 (Nachtrag), 95, 96; `web/src/deck/slides.ts`, `slides/act1.tsx`–`act6.tsx`,
  `proof.tsx`, `deep.tsx`

## 2026-11-01 · Keep the register on extract-v2 for the interview (law quote switched off)

- **Problem:** With extract-v3 in the code, a restarted watcher or any `pipeline.run` would re-read
  all 47 contracts before the talk – and on the copy, model variance turned M08 from "found,
  overruled by the checks" into "not found", the example three cards and the live demo use.
- **Cause:** The idempotency key is the prompt version; a new version means a full re-read.
- **Technique and why:** Decision 97: `PROMPT_VERSION` back to extract-v2 and the
  `governing_law_quote` schema field out, in one small commit that a revert switches on again.
  Everything else of F26/F35/F36 stays live: v2 answers have no law quote, so `check_law` returns
  "not checked", a good scan keeps its old answer, a poor scan is still reported (F36).
- **Rejected alternative:** Swapping now and moving the demo example to M10 (more change right
  before the interview; M10 can flip as well).
- **Metric before → after:** `tools.demo status` on a copy of the real register: "NO – 47 contracts
  … would read them again" → "ready for the live demo: yes"; pytest 159 passed; eval Q1–Q8 1.00,
  CUAD 19/20, unchanged.
- **Links:** decision 97; F26; `pipeline/config.py`, `pipeline/extract.py`

## 2026-11-01 · The governing law gets a checked quote (F26), escalation needs a reason (F35), a poor scan cannot hide a contract from Q5 (F36)

- **Problem:** Dima opened C09 in the Workbench: "the register read US-MA" – no quote, no page, so
  a lawyer confirms the law blind (F26). The panel-question review found two more gaps: a finding
  escalated in the register could be confirmed in an answer by two people without a reason (F35),
  and a poor scan whose law was read as DE dropped out of Q5 silently (F36).
- **Cause:** The extraction schema asked for the law as an ISO code only; the run's reason rule
  ignored the escalation; the poor-scan rule existed only for clauses and former names.
- **Technique and why:** Decision 94: the model returns the choice-of-law sentence word for word
  (a schema field, the reader keeps its 8 rules), and code checks it like a clause quote: it must
  be found in the contract, and the found passage must contain a sentence with a law word
  ("law", "governed", "Recht", "unterliegt", "beheerst") that names the jurisdiction of the code
  (US-MA → Massachusetts). A party's place of incorporation does not count. The page and span are
  stored and highlighted in the Workbench. A poor scan or an unconfirmed law becomes a review row
  (LAW_NOT_CONFIRMED), counted on its own. One helper decides when a reason is required, for runs
  and the register. The store adds the new columns to an existing register without losing rows.
  `tools.demo status` now says NO when the watcher would re-read contracts of an older prompt
  version.
- **Rejected alternative:** Finding the passage with patterns and no model (heuristic only);
  checking the jurisdiction word in the model's quote instead of the contract (a quote can add a
  word); a third model call just for the law (one more prompt).
- **Metric before → after:** on a fresh extract-v3 copy of all 47 documents ($0.1225): Q1–Q8 recall
  and precision 1.00, 45 law passages, C05's law corrected and caught (US-CA → US-MA, flagged by the
  check); 2 of 235 clauses changed by model variance (M08, C08). Review cases that passed before and
  are flagged now: 4 of 4 (preamble, "the German version prevails", two sentences, an address);
  F35: 201 → 422 in both endpoints; F36: M01 as a simulated poor scan not reported → REVIEW row.
  pytest 116 → 159 passed; eval on the real register unchanged (1.00, metadata 27/27, CUAD 19/20).
- **Links:** decisions 94, 97; F26, F35, F36; `pipeline/extract.py` (`check_law`, `law_sentences`),
  `pipeline/queries.py`, `pipeline/portfolio.py`, `pipeline/store.py`, `api/review.py`,
  `tools/demo.py`, `web/src/components/FindingCard.tsx`, `tests/test_law_check.py`

## 2026-11-01 · Look up in the register, work in the Workbench: three steps, the decision always in view

- **Problem:** Dima found the tool unclear: what does the register do, what the Workbench? He
  could not filter contracts in the Workbench, and a new contract was not visible in the tool at
  all. Screenshots showed both tabs listing all contracts, opening evidence and taking reviews;
  "Confirm finding" below the fold (y 1067 at 1366x768, 1697 in the contract file); about 18
  marks on one finding; the header scrolling away during four eyes.
- **Cause:** The register grew a review form (decision 73) and a scope hand-over (decision 75)
  next to the Workbench's own; every answer was one long page; nothing watched the register for
  changes.
- **Technique and why:** Decision 91 from a design round (three independent designs, scored,
  merged into one spec): the register only looks up (read-only contract file, "Decide in the
  Workbench →"); the Workbench is three steps with the run in the address – 1 Ask (all
  questions in one box, decision 93; "Narrow down" as the only way to choose contracts; a preview
  of the scope that shows no answer), 2 Answer (a tile per contract from the run's own snapshot,
  coverage, the list to look at), 3 Decide (page, finding card and a pinned decision panel). One
  status word, one next step and one "why" line per finding. New contracts: `stage` and
  `ingested_at` on documents and `GET /changes` (register version from the audit log, like a
  Graph delta link), polled every 3 s by the tool only; an older answer says "out of date" and
  offers "Ask again". F25 fixed (escalated findings counted). Former names count 6 (5 name one ·
  1 cannot be ruled out). Old components, CSS and 124 dead German entries removed.
- **Rejected alternative:** One surface with the register as the start page (the biggest change,
  the live demo would have to be rebuilt); keeping the structure and only tidying it (the
  duplication stays); register tick boxes next to "Narrow down" (two ideas of scope).
- **Metric before → after:** "Confirm finding" at 1366x768: y 1067 (after Q1) / 1255 (M08) →
  589–621 (M08), 628–660 (M14); "Store archive copy" 1226–1446 → 711–741; window scrolls in the
  click script about 5 → 0 (4 runs, EN/DE, 1366 and 1600); marks on the M08 screen 18 → 5; step 1
  2 pilot cards + 6 hidden → 8 of 8 visible; H01 on a copy: "being read" after 3.3 s, "48 contracts
  · 1 new" and "Out of date … Ask again" after 10.5 s, gone again 1.0 s after the reset. pytest
  102 → 116 passed; eval Q1–Q8 recall and precision 1.00, metadata 27/27, CUAD 19/20; tsc 0, build
  green; German entries missing 0; `app.css` 611 → 439 lines.
- **Links:** decisions 91, 93 (87 partly replaced); F25, F27–F34 (F34 open: a correction of a
  Found clause does not reach Q1); `api/register.py`, `api/workflow.py`, `api/review.py`,
  `api/quality.py`, `pipeline/portfolio.py`, `web/src/workbench/*`, `web/src/components/*`,
  `web/src/register/*`, `web/src/live.tsx`, `freshness.ts`, `filters.ts`

## 2026-11-01 · The talk follows Riverty's own outline, in six parts, with "what we use"

- **Problem:** Dima wants the talk to pick up the task's sentences and to use the structure the
  task proposes, without slide overload, plus an overview of what we use (prompts, methods). The
  decision-88 order had its own act names; a panel member could not map it to their outline.
- **Cause:** The acts were named after the problem-solving arc, not after Riverty's
  "Presentation outlining" bullets.
- **Technique and why:** Decision 90 (plan by the parallel session, approved by Dima): six parts –
  the problem, my approach, the technical solution, infrastructure, adoption, the basic
  implementation live as the finale. Each part opener shows its outline bullet word for word in a
  small quote line, guarded against the case study text (whitespace-normalised); content cards
  pick up their sentence in the notes. New card "what-we-use": two system prompts, read verbatim
  from `pipeline/extract.py?raw` (guards: exactly 2 prompts, 8 rules, 5 clauses), call counts from
  the stats file, built vs planned marked. New deep dive "prompts". test-set, embedding-map and
  register-index moved to the deep dives to stay under 20 minutes; the proof cards close part 3;
  the card "live" got 115 s for the redesigned Workbench (decision 92). The title note has a TODO
  in a code comment for Dima's own sentence – never invented, never spoken.
- **Rejected alternative:** A quote line on every content card (about 25 more lines, against the
  Gamma style); the live demo at the end of part 3 (an overrun would eat infrastructure and
  adoption); keeping test-set in the main track (about 20:15, over Riverty's 20 minutes).
- **Metric before → after:** main track 35 cards / 1138 s → 33 cards / 1193 s (19:53, Riverty's
  limit 20:00, Dima's hard maximum 22:00); deep dives 10 → 14; rendered word budget 0 problems,
  no dev-guard console errors; `newcards.mjs` 47 of 47 cards without problems; `deck.mjs` errors
  none (33 main cards, checkpoints per part).
- **Links:** decisions 90, 92; plan `talk-structure.md` (parallel session); `web/src/deck/slides.ts`,
  `types.ts`, `SlideView.tsx`, `slides/act1.tsx`–`act6.tsx`, `proof.tsx`, `deep.tsx`,
  `prompts-data.ts`, `docs/approach.md`

## 2026-11-01 · The talk in the order of the problem: nothing reaches ahead, and the live card works (F20)

- **Problem:** Dima asked for a check that the talk goes step by step – identify the problems,
  find the lever, weigh the approaches – and never reaches ahead. Four reviewers (arc, first
  mentions, interview panel, delivery) found about 70 terms, ids or numbers used before they
  were explained, two meta cards between "three guarantees" and the solution, the register
  result shown before the solution act, Legal's second pilot question raised but never answered,
  and adoption in about 17 s. The live-add card showed nothing at all for H01 (F20).
- **Cause:** The cards were built act by act over several days; each card was checked on its
  own, never the whole order. F20: the card fetched the findings once, before they existed.
- **Technique and why:** One approved plan (decision 88): the roadmap right after the title, the
  test set as the yardstick for the approaches, the solution along the target process, proof,
  operations, adoption, live, and a close with the lesson; "choices" moved to the deep dives.
  Then two rounds of a strict re-audit by a fresh reviewer, each followed by a fix round, with
  numbers recomputed from their sources and new dev guards for every fact that could drift
  (e.g. the errors the traps missed must be exactly C04 · C09, C10 · C11). Honesty fixes: the
  top-k measurement is named a keyword (BM25) search, the SharePoint card is marked "target
  design", the prototype model is named "Azure OpenAI (Global Standard, synthetic data)". The
  presenter view got clock checkpoints with skip hints. F20: the card asks again until the
  type is there and shows poor scan, not found, unclear and the former-name line (F19).
- **Rejected alternative:** Keeping "how I worked" in act 3 (a look back in the middle of the
  solution); register first in act 3 (the contracts of the Q1 answer would still be unknown);
  "choices" as a summary at the end (the densest text card, all said before). A third audit
  round on this order was skipped: decision 90 changes the act structure next.
- **Metric before → after:** 50 → 45 cards (now 35 in the main track, 10 deep dives), main track
  18:59 → 18:58 (1138 s);
  re-audit round 1: order ok, 2 major + 10 minor → fixed; round 2: 1 major + 10 minor → fixed;
  rendered word budget 0 problems, `newcards.mjs` 45 of 45 cards without problems, `deck.mjs`
  errors none, no card over 2 spoken words per second. F20: card blank for H01 → full answer
  after 11.0, 14.0 and 14.7 s in three runs on a copy, title fixed at y 157 px in every state.
- **Links:** decisions 88 (act structure since replaced by 90), 89; F19, F20;
  `web/src/deck/slides.ts`, `slides/act1.tsx`–`act6.tsx`, `proof.tsx`, `deep.tsx`,
  `deck/Presenter.tsx`, `tools/deck_data.py`

## 2026-11-01 · A poor scan cannot prove that a former name is gone (F19)

- **Problem:** The handwritten H01 names "Arvato Financial Solutions", but the former-name check
  counted it under "without hits". Legal's second pilot question would have missed a contract,
  silently – the expensive error.
- **Cause:** Tesseract reads the handwriting at a mean confidence of 61 (threshold 70) and spells
  the name "Arfto" and "Arvafr". The exact name search finds nothing, and "nothing found" was read
  as "no former name".
- **Technique and why:** The same rule as for clauses: on a poor scan, absence is not proven. A
  LOW_QUALITY document without an exact hit becomes a row NAME_NOT_RULED_OUT, triage REVIEW, with a
  fixed reason ("cannot be ruled out – poor scan (OCR confidence 61 %, threshold 70 %) – a person
  checks"). It is counted on its own, so the four counts still add up to "checked"
  (`pipeline/queries.py`, `portfolio.py`). The API gives every document and matrix row a
  `former_names` object; Q2 in the evaluation counts these rows as "to review", like UNCLEAR. The
  Workbench and the register show "Former name cannot be ruled out" in EN and DE.
- **Rejected alternative:** Fuzzy matching on the OCR text (false alarms on every scan); a fuzzy
  match of the counterparty the model read (maybe later); only mentioning it in the talk.
- **Metric before → after:** Q2 on a register copy with H01: 5 reported, H01 among 39 "without
  hits" → 6 reported (H01 REVIEW), 38 without hits, 1 not ruled out. Real register (47 documents):
  Q1–Q8 recall and precision 1.00, metadata 27/27, CUAD 19/20 – unchanged. pytest 95 → 102 passed
  (7 new tests, no model call; one demo test no longer assumes a register without rehearsals).
- **Links:** decision 89; F19 (and the F20 docs, whose card fix follows in the talk commit), F25
  recorded; `pipeline/queries.py`, `pipeline/portfolio.py`, `api/register.py`,
  `eval/check_register.py`, `tests/test_legacy_poor_scan.py`

## 2026-11-01 · The Legal Workbench redesigned: paper on a dark desk, the decision on the first screen

- **Problem:** The tool looked like a different product than the talk (another green, no display
  type), nothing led the eye, and at laptop size the decision – the point of the four-eyes demo –
  sat about three screens down. Small grey and amber text failed contrast on a projector.
- **Cause:** Every section used the same nested white card and 11–22 px type; the evidence grid
  stacked into one column below 1400 px; the palette was a placeholder (design audit, decision 77).
- **Technique and why:** Direction A from the audit: the frame from the talk (near-black header
  with the mint-to-cyan hairline, the tile logo, the display face, a dark desk behind the page
  viewer), light paper where lawyers read and decide. `tokens.css` holds the talk's values for the
  tool only (deck.css untouched); brand ramp around the mint hue. Step 1 folds into one line after
  a run; page and verdict side by side via container queries; the decision column scrolls with the
  window; injection and poor-scan warnings as a full-width bar; run overview as one answer sentence
  plus contract tiles; approval tracker with a locked archive step; checks behind a disclosure
  (open for UNCLEAR or overruled findings); German for every new text. Two reviewers (design,
  end-to-end) found F23 (the M14 injection highlighted as evidence under a "never evidence"
  warning), F24 (the year filter hid C02) and two layout bugs – all fixed.
- **Rejected alternative:** A fully dark tool (tables and white pages glare on a projector); only
  sharing accent colours (still feels like switching products); a decision column with its own
  scroll area (its lower part stayed below the fold).
- **Metric before → after:** decision at 1366x768: y = 2238 on a 2694 px page → fully visible after
  one wheel step; text elements below 4.5:1 contrast: --ink-3 4.0–4.4 and amber 3.7–4.0 → 0 (EN and
  DE, disabled buttons excepted); end-to-end demo path 116 of 119 → 120 of 120 checks; review
  findings 20 (5 major) → all major and most minor fixed; talk pages: 0 changed pixels / 0 changed
  computed styles; `npm run build` green, pytest 95 passed.
- **Links:** decisions 77, 87; F23, F24; `web/src/tokens.css`, `app.css`, `theme.ts`, `App.tsx`,
  `components/SafetyBar.tsx`, `Approvals.tsx`, `Loading.tsx`, `workbench/*`, `register/*`

## 2026-11-01 · A live contract that can be taken back: forget, the demo kit and H01

- **Problem:** Dima wants to add a contract live in the talk and show that its problems are
  found. The register had no way to remove a document again (known gap "deletion sync"), so every
  rehearsal would leave a 48th document and break the 47-document evaluation. The handwritten H01
  sat in `data/raw/handwritten`, where the next `pipeline.run` would have read it silently as a
  48th gold document.
- **Cause:** The pipeline only ever added; documents were keyed by id across 17 tables, an FTS
  index and the embeddings, and the watcher could not survive an error in one pass.
- **Technique and why:** H01 moved to `data/demo` (not a source folder; decision 82).
  `pipeline/forget.py` removes a document and everything derived from it in one transaction,
  including the family rebuild, keeps the model calls under a `forgotten:<id>@<time>` label (the
  money was spent) and never deletes a file outside the inbox. `INBOX_DIR` points the watcher at
  another folder, like `REGISTER_DB` for the register, so rehearsals run on copies.
  `tools/demo.py status|drop|reset` and `docs/demo.md` (the rehearsal kit). A dry-run verifier
  and a code reviewer attacked it: a reset during the model call crashed the watcher and merged
  the late calls into the next rehearsal (F21), and `--remove-file` could delete a gold PDF
  (F22) – both fixed; extraction now drops a result whose document was forgotten meanwhile, and
  one failed pass no longer ends the watcher. Measured on H01: F19 (the legacy name is not found
  on the poor scan) and F20 (the live-add card shows nothing) recorded, still open.
- **Rejected alternative:** H01 as the 48th gold document (every number of the talk changes right
  before the interview); deleting the model calls with the document (the cost view would lie);
  rehearsing only on the real register and restoring a backup (no proof that nothing else moved).
- **Metric before → after:** documents found by the pipeline 48 (H01 in data/raw) → 47; ways to
  remove a document 0 → 1; tests 88 → 95 (14 in `test_forget.py`, no model call); dry run on a
  register copy: H01 findings after 7.5–10.7 s, $0.0010 per drop, after reset every data table
  identical (47 documents, 938 passages, 235 clauses, 14 name hits), evaluation on the real
  register unchanged (recall and precision 1.00 on Q1–Q8, metadata 27/27, CUAD 19/20, $0.1191).
- **Links:** decisions 82, 86; F19–F22; `pipeline/forget.py`, `extract.py`, `index.py`,
  `ingest.py`, `run.py`, `config.py`, `tools/demo.py`, `tools/make_handwritten.py`, `docs/demo.md`,
  `docs/pipeline.md`, `docs/explorer.md` station 12

## 2026-10-31 · Proof cards and four more deep dives, each number traced and each claim attacked

- **Problem:** Act 4 still had three grey drafts (results, what-if, cost) – exactly the cards that
  answer Dima's question "how do we show that the models perform?". Seven rows of the storyline
  board (OCR, structured extraction, agent patterns, hybrid search, …) had no card.
- **Cause:** The numbers existed (stored eval runs, what-if replay, llm_calls), the cards did not;
  the board rows had never been matched against the built cards.
- **Technique and why:** Research, build and two adversarial verifiers per strand (truth: recompute
  every number from its file; presentation: screenshots, text size, word budget, first mentions),
  then a fix round and an independent recheck. Results: a band per question with the
  Clopper–Pearson lower bound (Q8: 1 of 1 → could be 5 %), pooled 28/28 ≥ 0.89, and the caveat
  "16 contracts, and we tuned on them → sealed test set". All 7 stored runs counted; the first run
  exists only as a text report and is parsed with a `?raw` import, not retyped. What-if: each
  build replays its scenario on the running API (`GET /what-if`) when it is shown; the stored
  replay (`eval/results/2026-10-31_what_if.json`) is the offline fallback. Cost: the small model
  against gpt-4.1 (≈5× cost, ≈2× time, same contracts found). Deep dives ocr (M18 misreads counted
  exactly by aligning OCR words with the source; H01 measured, `--measure-h01`), fixed-form,
  agent-patterns, hybrid-search; three board rows were already covered by existing cards.
- **Rejected alternative:** Fetching all what-if scenarios at page load (the time shown would not
  be the click); counting 6 runs (contradicts CLAUDE.md and approach.md); a derived JSON of the
  text report (can drift); "at least 3 misreads" (a weaker answer under questioning).
- **Metric before → after:** draft cards 3 → 0; deep dives 5 → 9 (2:46 → 5:41, outside the timed
  track); main track 18:59 → 18:59; verifier findings 38 (9 major) → 5 minor after the first fix →
  0 after the second; numbers corrected on screen: search pool 938 → 229 passages, gpt-4.1-mini
  "model alone" 4–5 → 3–5 of 5 (now agrees with the what-if card), runs 6 → 7, H01 "not measured" →
  61.3 %; overflow at the last build of all 50 cards: none; `tsc` clean.
- **Links:** decisions 83, 84, 85; `web/src/deck/slides/proof.tsx`, `proof.css`, `deep.tsx`,
  `acts.css`, `act3.tsx`, `tools/deck_data.py`, `eval/results/2026-10-31_what_if.json`,
  `2026-10-31_h01_ocr.json`; check questions 26, 27

## 2026-10-31 · The talk built through to the close: acts 3, 5, 6 and the deep dives, from real data

- **Problem:** After acts 1 and 2, 17 of the planned cards were still grey drafts ("later"). Dima
  wanted real diagrams (chunking, embeddings, register vs index, SharePoint, Microsoft services,
  how I worked), sentence snippets from the case study for the identification part, a live
  "add a contract" moment, and no term before its explanation.
- **Cause:** The storyline (decision 76) and the time plan (decision 78) existed, the cards did
  not; the numbers they need sat in the register, the probe results and the decisions.
- **Technique and why:** A generator `tools/deck_data.py` reads the built register through the
  API (TestClient, no model call except one embedding of the query) and writes
  `deck-data.json`; every number on a card comes from there, so the cards cannot drift from
  the data. Act 1 "task": six verbatim sentences of the task, each with what it means. Act 2
  "embedding-map": a similarity ruler (cosine to the query per passage, lanes M / V / C, the
  top-10 box) instead of a 2-D map. Act 3 (10 cards): how I worked, the as-is vs to-be process,
  problem → technique → rejected alternative, the register matrix, register vs index, M18's
  journey, the M08 guardrail sandwich, the M14 note with the Prompt Shields numbers, the human
  lanes. Act 5: Azure roles (bought vs built, and a line "planned, not built: MCP, an agent
  framework, CI, tracing"), SharePoint (decision 79), release gate. Act 6: "live-add" polls the
  register every 3 s while visible and shows the new contract's findings; the Workbench; the
  close. Deep dives (decision 78, outside the timed track): decoy similarities, chunking of M09,
  Microsoft at the edges, Graph details. All new styles in `acts.css`, scoped under `.slide`
  with the prefix `x-` (the lesson from the `.hl` / `.overview` collisions).
- **Rejected alternative:** A PCA projection of the embeddings: tried first, it sorted the
  passages by contract group (merchant / DPA / CUAD), not by meaning – a picture that tells the
  wrong story. Typing the numbers into the cards (would drift, as the "47" draft did).
- **Metric before → after:** draft cards 17 → 3 (act 4: results, what-if, cost); built cards
  +23 (18 in the main track, 5 deep dives); main track 18:44 → 18:59, deep dives 2:46; speaking
  budget (≤ 2 words per second of a card): every card within it; overflow check of all 41 cards at
  their last build: 5 overflowing at first → 0; navigation walkthrough green; `npm run build`
  green; `pytest` 81 passed.
- **Links:** decisions 76, 78, 79, 80; `web/src/deck/slides/act1.tsx`, `act2.tsx`, `act3.tsx`,
  `act5.tsx`, `act6.tsx`, `deep.tsx`, `acts.css`, `drafts.tsx`, `deck-data.json`,
  `tools/deck_data.py`; check questions 21-24

## 2026-10-31 · Nothing before its introduction: the 47 contracts and top-k get their own place

- **Problem:** Dima: "wir erklären nicht, was top-k ist, und erwähnen Verträge, die keiner kennt".
  Cards said M14, M18, M02 before anyone knew these are our test contracts; top-k was a small
  sub-label on the RAG card.
- **Cause:** The test set was introduced only in act 4; the term appeared where it was first needed.
- **Technique and why:** A new card "contracts" in act 1, before the first id is used: "Riverty
  cannot share contracts – so I built 47 with known answers", the three groups M / V / C as tiles,
  so every later id reads as "one of ours". The RAG card gets a fourth build: a term line that
  defines top-k before "It fails …" uses it. The act-4 card "test-set" (trap map, other session)
  then shows what is hidden in those 47, not what they are.
- **Rejected alternative:** Explaining ids in the speaker notes only (the audience reads the cards).
- **Metric before → after:** Contract ids used before introduction: 3 cards → 0; top-k defined on
  screen: no → yes. Planned time +0:45.
- **Links:** `web/src/deck/slides/act1.tsx`, `act2.tsx`, `deck.css`; commit 743ef3f (the entry was
  missing there because two sessions edited this file at the same time)

## 2026-10-31 · Card "test-set": the trap map, and CUAD by its full name

- **Problem:** Dima noticed that CUAD was never spelled out in the talk, and the planned card
  "test-set" (a draft) only said "47 documents, each trap marked". The designed traps - the
  strongest evidence that the test set was built to break the system - had no visual.
- **Cause:** Act 4 was still a draft; the test-set text in act 1, `approach.md` and
  `explorer.md` used "CUAD" as a bare acronym and "lawyers" where the README says "experts".
- **Technique and why:** Four design concepts (trap map, rogues' gallery, trap-to-check ledger,
  minimal hazard tape) judged by three lenses (panel, design/timing, truth); the trap map won
  (23 of 30) and took the judges' fixes. One card, four builds: the 27 documents we wrote as
  tiles, each trap lit by the question it asks (read / understand / organise - colour = the
  question, never right or wrong), then the 20 CUAD contracts in two rows by the experts'
  label with 19 ticks and one "?" (C03, a question for Legal). Every number is read from
  `ground_truth.csv`, `labels.csv`, `failure-cases.md` and the stored evaluation JSON
  (`testset-data.ts`), with dev-only guards (27 + 20 = 47, no unclear CUAD finding). Verified
  with headless-Edge screenshots of all five build states, the presenter view and 1280×720.
- **Rejected alternative:** Real page images of the trickiest contracts (needs the API during
  the talk, five images do not show the whole set); a trap-to-failure ledger (too much text for
  30-50 s); typing the counts by hand (would drift from the data, as the "47" draft already had).
- **Metric before → after:** card "test-set" draft → built, 4 builds, 50 s (results 40 → 30 s,
  talk 18:34 → 18:44); CUAD spelled out in 0 → 4 places (talk card, act-1 card, approach.md,
  explorer.md); `npm run build` green; red overflow frame 1 (first version: class `q2` collided
  with act 1's `.q2` grid in deck.css) → 0 after renaming to `a1`-`a4`. Three expected interview
  questions (training, confidence, reproducibility) added as check questions 18-20.
- **Links:** decision 81, `web/src/deck/slides/act4.tsx`, `act4.css`, `testset-data.ts`,
  `docs/approach.md` ch. 6, `docs/check-questions.md`, F3/F4/F10 (the errors CUAD found). The
  code was written in a parallel session and committed later in its own commit, so that the
  next step (acts 3-6, whose `drafts.tsx` imports the card) builds on its own.

## 2026-10-31 · Driving the talk live: mouse, keys, clicker, two windows - tested by five agents

- **Problem:** Dima asked how to move forward with the mouse: the control bar was invisible until
  hovered, a click on the card did nothing, the scrolling page had no keys, and the presenter
  window could pull the projector back. A Gamma audit (77 sourced facts, 25 gaps) listed what a
  presenter needs; five tester agents then tried to break the result in a real browser and found
  27 bugs (e.g. ← going forward when the mouse rested on the bar, card clicks dead after any text
  selection, a presenter window opened later pulling the talk back to its own card, the address
  on the page naming a card that was not on screen, the act-2 ring running through its headline).
- **Cause:** The first deck was built for keys only; the sync announced every rendered position;
  positions were read from the last render instead of the address at the moment of the event.
- **Technique and why:** Present mode: a plain left click advances (not on controls, not after a
  drag), one wheel notch or trackpad gesture = one step, swipe, ↑/↓/Backspace for clickers that send
  them; the bar appears on mouse movement and stays while the mouse rests on it, the cursor hides;
  a one-time hint, `?` shortcut list, B black screen (any key or click brings it back), S
  spotlight, end-of-talk pill, wake lock. The overview's selection is the keyboard focus. Sync is a
  small protocol: announce only own moves (an address set by code is counted, so browser Back or a
  typed address still counts as the user's), the later move wins (tie broken per window), a new
  window asks "where are you?" and follows. The page: ← → / PageUp PageDown card by card measured
  from the layout (not from transformed boxes) below the sticky header, the address follows the card
  in the middle, Ctrl+Enter presents, outline toggle, unknown addresses corrected. Development
  guard: a card that overflows gets a red frame.
- **Rejected alternative:** A slide library (reveal.js: a dependency, and the cards must also work
  as a page); click-to-advance only, like PowerPoint (Gamma does not advance on click, but Dima
  asked for the mouse); last-message-wins sync without timestamps (two windows swapped positions).
- **Metric before → after:** Tester scripts: mouse 58/67 → 67/67, page 56/69 → 69/70, layout 282/298
  → 297/298, keyboard and two-window sync all real failures fixed (left: tests expecting `/last`
  instead of the numbered build, an intended clock behaviour, a hard-coded 61 px). No console errors.
- **Links:** `web/src/deck/nav.ts`, `Present.tsx`, `Presenter.tsx`, `Page.tsx`, `Overview.tsx`, `SlideView.tsx`, `deck.css`

---

## 2026-10-31 · Prompt Shields measured before it becomes a check layer (F18)

- **Problem:** The injection guard finds M14 because the hidden note uses one of six fixed English
  phrases. Reworded, the same instruction passes (F18). Microsoft's Prompt Shields is the obvious
  second detector - but what does it catch, and what does it flag that is harmless?
- **Cause:** A phrase list only finds what someone thought of; the gold set happens to use a listed phrase.
- **Technique and why:** `eval/prompt_shields_probe.py` measures before anything is built in: the
  M14 note and three paraphrases (one German) through both detectors, then all 938 chunks of the
  register through Prompt Shields in batches within the service limit (10,000 characters of
  documents per request). The result is stored in `eval/results/`, so the numbers on a card have a
  file behind them. Endpoint and key are never printed.
- **Rejected alternative:** More regex phrases (an endless list, still English only); Prompt
  Shields as a block (it flags one harmless chunk); building it in before measuring.
- **Metric before → after:** Variants detected: regex 1 of 4, Prompt Shields 4 of 4. False alarms
  on the register: 1 of 938 chunks (C18:058). Cost of a full pass about $0.33 (878,915 characters).
  Fix proposed as decision 80 (Prompt Shields hit = four-eyes signal, pattern spans stay for the
  highlight); decisions 77–80 logged.
- **Links:** `eval/prompt_shields_probe.py`, `eval/results/2026-10-31_prompt_shields_probe.json`,
  `docs/failure-cases.md` F18, `docs/context/decisions.md` 77–80

---

## 2026-10-31 · Speaker notes Dima can read aloud: B2 English, one paragraph per build

- **Problem:** Dima presents in English at B2 level and reads from the presenter view. The notes
  had long sentences and rare words, ran as one block per card, and marked builds only with "→".
  The check questions of the sessions were lost in the chat – most were never answered.
- **Cause:** The notes were written as a script for a native speaker; the presenter view was built
  for glancing, not for reading.
- **Technique and why:** A workflow rewrote the notes of acts 1–2 (one writer per act, an
  independent checker per act for facts, builds, sentence length, timing and pronunciation). Notes
  are now a list, one entry per build, plus up to three pronunciation hints per card. The
  presenter view puts the notes first: large type (A− / A+, + / −, remembered), the paragraph of the
  current build bright and scrolled into view, then the card on screen, the hints and the next
  card. The check questions and their answers are collected in `docs/check-questions.md`, and
  CLAUDE.md now says to add every new one there.
- **Rejected alternative:** A teleprompter that scrolls by time (Dima's pace varies); notes
  written in German (the talk is English, he reads what he says).
- **Metric before → after:** Longest sentence in the notes of acts 1–2: 43 words → 13; every card
  within its time at 2 words per second; 15 check questions answered in one file (0 before).
  Walkthrough 8/8, no console errors.
- **Links:** `web/src/deck/Presenter.tsx`, `web/src/deck/slides/act1.tsx`, `act2.tsx`, `docs/check-questions.md`

---

## 2026-10-31 · The talk rebuilt as a Gamma-style page of cards (acts 1 and 2)

- **Problem:** Dima: too much to read, not intuitive, not modern, not building up – "we talk about
  top-k before we even said that we use agents". Chapter 2 opened with "agents fail on the size of
  the environment, and top-k retrieval can never prove …" before RAG, top-k or an agent had been
  explained; every figure carried three text blocks (shows / why / how to read) next to it.
- **Cause:** The chapters were written as a document with figures, not as a talk: the text that
  belongs to the speaker was on the screen, and the order followed the argument, not the audience.
- **Technique and why:** Decision 76. A new deck (`web/src/deck/`): the talk as data – acts and
  cards, each with one headline, one visual, builds and speaker notes. Three views of the same
  cards: a scrolling page in the style of Gamma (Dima's wish: the talk is a web page; cards fade in
  and play their builds when they come into view), present mode (one card, full screen, → / ←,
  O overview, F full screen) and a presenter view in a second window with notes, next card and
  clock, synchronised over a BroadcastChannel. Everything inside a card is sized in container
  units, so one card renders the same at every size. Acts 1 and 2 are rebuilt as the sample
  (12 cards, every term introduced before it is used: chatbot over documents → top-k → why it
  cannot prove absence, with the measured numbers → what an agent is → why a free agent cannot
  prove it read everything, with OverclaimBench); acts 3–6 are in place as drafts with their
  statement and planned visual, so the whole arc shows in the overview.
- **Rejected alternative:** Shortening the old chapters (the order problem stays); a slide
  library (reveal.js – another dependency, and the cards must also work as a scrolling page);
  a light or mixed look (Dima chose dark).
- **Metric before → after:** Text next to a figure: three blocks → none on screen (all in notes).
  Terms used before explained in chapter 2: RAG, top-k, agent → 0. Cards: 33 (12 built, 21 drafts),
  planned 18:34 min. Browser walkthrough 8/8 checks (keys, double press, overview, Esc, notes in
  sync, Workbench untouched), no console errors. Two problems found on the way and fixed: a fast
  double press lost a build (position now read from the address at the key press), and the deck
  CSS would have turned the Workbench's run overview into a full-screen layer (class `overview`) –
  card styles are now scoped under `.slide`.
- **Links:** `web/src/deck/`, `web/src/routing.ts`, `web/src/App.tsx`, decision 76

---

## 2026-10-31 · Legal chooses the contracts: filters, ticks, a run over a selection

- **Problem:** Dima: "we cannot filter contracts ourselves and choose which ones to work on – why?"
  The register filtered only by type, gaps and search; a run always covered every contract of a type.
  Lawyers work on subsets (one law, one period, a renegotiation batch) and would go back to Excel.
- **Cause:** MVP cut. The guarantee "nothing drops out silently" was built on a scope defined by a
  rule (the type), and a hand-picked scope had no way to say what it covers.
- **Technique and why:** Decision 75. The register gets filters for law, date range, clause status
  per playbook column and review state, check boxes, and "check these N / the N shown in the
  Workbench". The selection travels in the address (`?scope=…`, survives a reload) and becomes
  `plan.scope` (`doc_ids` decide; `filters` record how, never re-applied). `run_check` takes the
  selection as the scope: every chosen contract lands in checked or excluded – one of another type
  is excluded by name, an unknown id is refused (422). The coverage carries `selection` (chosen,
  of, filters); the answer shows "a selection: 3 of 47, chosen by … – not the whole portfolio";
  the audit keeps the list. Filters that cannot judge a contract (no date, no law) name the
  contracts they hide, and ticked contracts hidden by a filter are named too.
- **Rejected alternative:** Only more register filters (no runs over a subset); a server-side
  saved filter that is re-applied later (would need the review states of the workflow database
  inside the register query – later, if Legal wants recurring checks); dropping a selected contract
  of another type quietly.
- **Metric before → after:** Filters 3 → 7; runs over a chosen subset: no → yes. Tests 71 → 81
  (9 portfolio, 1 API: Q1 over M01, M03, M08, M15, V01 → M03, M08 reported, M15 and V01 excluded
  with reason, audit holds the list). Browser walkthrough 18/18 checks, English and German, no
  errors.
- **Links:** `pipeline/portfolio.py`, `api/workflow.py`, `web/src/register/Register.tsx`,
  `web/src/workbench/`, `docs/explorer.md` station 7, decision 75

---

## 2026-10-31 · A duplicate can be opened, not only named

- **Problem:** The register marked M15 as "copy of M01", but only as text. To look at the original,
  a lawyer had to close the file, find M01 in the list and open it again; the original did not
  mention its copy at all, and a family showed as a plain list of ids. Found by Dima.
- **Cause:** `duplicate_of` was stored in one direction only (copy → original) and shown as a label;
  the contract file had no way to switch to another contract.
- **Technique and why:** The document endpoint also returns `copies` (the other direction, one
  query on `duplicate_of`). The contract file gets `onOpen`: original, copies and family members
  are links that open their own file in the same drawer; a copy shows an info bar "Copy of M01 …
  Open M01". The register notes "copy of …" and "amendment of …" are links. In the Workbench the
  same drawer opens over the run, so the run and its selection stay. A deep link
  `#/tool/register?doc=M15` opens a file directly (for the talk and for links from elsewhere);
  closing it returns to the plain register address.
- **Rejected alternative:** Navigating from the Workbench to the register page – it would leave
  the run the reviewer is working in. A separate "duplicates" page – a duplicate is a property of
  one contract and belongs in its file.
- **Metric before → after:** Clicks from M15 to its original: close, find, open → 1. M01 names its
  copy: no → yes. Tests 70 → 71 (both directions); browser walkthrough 10/10 checks in English
  and German, no console or HTTP errors.
- **Links:** `api/register.py`, `web/src/register/ContractFile.tsx`, `web/src/register/Register.tsx`,
  `web/src/workbench/Workbench.tsx`

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
