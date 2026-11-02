# Live demo kit – a handwritten contract arrives

The live moment of the talk: card **"live-add"** in act 6 ("A handwritten contract arrives – watch
what is found.", 45 s), right after the act-6 opener "Let me show you." A photo of a handwritten
contract is dropped into the inbox folder (the stand-in for the SharePoint library), the watcher
reads it, and the card shows the new document and what the register found. The next card,
**"live"** (115 s, decision 92), is the Legal Workbench with a click script on Q1 - and the
handwritten contract is part of that answer, so the two live moments tell one story.

The document is **H01** (`data/demo/H01.jpg`, made by `tools/make_handwritten.py`): a synthetic
German merchant agreement from 2009, written by hand, photographed on a desk, with the watermark
footer. It names the former provider "Arvato Financial Solutions GmbH". It is **not** part of the
47 documents of the gold set: `data/demo` is not a source folder. After every rehearsal, and after
the talk, the register goes back to exactly the 47 (`python -m tools.demo reset`).

Commands below assume PowerShell in the repo folder with the virtual environment active
(`.venv\Scripts\Activate.ps1`).

## What the page says, and what the register makes of it

Measured on a copy of the register, 2026-10-31, `extract-v2`, gpt-4.1-mini (three runs, same result):

| | On the page | In the register |
| --- | --- | --- |
| Scan | handwriting, phone photo | OCR confidence 61.3 < 70 → status **LOW_QUALITY**, every finding capped at 0.5 |
| Type, date, law | merchant agreement, 17.03.2009, German law | `merchant_agreement`, 2009-03-17, DE |
| Limitation of liability | none | ABSENT, 0.5 → REVIEW |
| Data processing agreement | none | ABSENT, 0.5 → REVIEW |
| Consumer terms in checkout | yes (clause 2) | UNCLEAR, 0.35 → REVIEW (model said PRESENT; quote garbled by OCR, checker rejected it) |
| Former company name | "Arvato Financial Solutions GmbH", twice | the exact legacy-name match finds nothing – OCR wrote "Arfto financial Solutions" and "Arvafr Finanecal Solutions" – so the register says **cannot be ruled out – poor scan → a person** (`NAME_NOT_RULED_OUT`, REVIEW; F19 fixed, decision 89). The model's own reading is Arvato (`own_entity_name`), but that is not used as evidence |
| Counterparty | Garnkiste Krüger e.K. | "Garhkisty Krüger uK" (OCR) |

Recall first holds for the clauses: nothing that is on the page is reported missing without a
person looking, and the missing clauses are found. It now holds for the former name too: the
register does not *find* "Arvato" on this scan, but it no longer says "no former name" either -
"no match on a poor scan proves nothing", so a person reads the page (F19, decision 89). A good
answer to "what does not work yet?": reading the name itself needs a better reading of the page
(the multimodal fallback, decision 10).

## What the card shows

The register's whole answer for H01 (F20 fixed, 2026-11-01). Measured in Edge on a register copy -
a second API and website on the copy, the watcher on a temporary inbox, the card at build 1,
`python -m tools.demo drop --wait`; seconds from the drop:

```
 0.0 s  47 | documents in the register, live | waiting for a new contract …
 8.5 s  48 | H01 is new · the model is reading it … | poor scan → a person
11.0 s  (watcher) H01 findings in the register after 11.0 s
11.4 s  48 | H01 is new · merchant agreement
           | poor scan → a person
           | not found: Limitation of liability, Data processing agreement
           | unclear → a person: Consumer terms in checkout
           | former name: cannot be ruled out – a person checks
```

The same text in two more runs, with a slower model call: the answer was on the card after 14.7 s
(findings in the register at 14.0 s) and after 12.6–14.6 s (screenshots every 2 s).

| Line | Read from | Shown |
| --- | --- | --- |
| 48 | `GET /documents`, every 3 s | when the document row is written, after OCR |
| the model is reading it … | `doc_type` still empty | between OCR and the model's answer - and for good if Azure is down (see "If something fails") |
| poor scan → a person | the document's `status` is `LOW_QUALITY` (OCR confidence below the threshold) | with the row, before the model answers |
| the type (merchant agreement) | `doc_type` | together with the findings (one transaction) |
| not found: … | required findings with status ABSENT, `GET /documents/H01/findings` | once the type is there; asked again with every poll |
| unclear → a person: … | required findings with status UNCLEAR | the same |
| former name: cannot be ruled out – a person checks | `GET /documents/H01` → `former_names.not_ruled_out` (F19) | the same |
| hidden instruction → four eyes | an injection flag on the document | never for H01 - do not promise it |

The box under the number keeps the height of the five lines from the start, so nothing on the card
moves while the audience watches the number (title position measured in all three states: the
same, 157 px at 1600×900). Do not say the system *found* the former company name on H01: it did not -
it knows that it cannot rule it out, and a person reads the page.

## What the Workbench shows for H01

The traffic light (decision 95): H01 is **orange** in every question that asks about its text - a
poor scan proves neither that something is missing nor that it is not there. Measured on a register
copy with H01, 2 Nov, 1366x768 (screens `scratchpad/traffic/run2/shots/demo-*.png`, `h01-*.png`):

| Question | H01 in the answer | Step 4 for H01 |
| --- | --- | --- |
| Q1 (limitation of liability) | orange lane "Unclear", tile **H01**, list row "Not found – poor scan · Poor scan (OCR 61 %) · Review"; still a reported row (the evaluation's answer is unchanged). The answer: red 3 (M03, M14, M18) · orange 3 (H01, M08, M10) · green 14 · excluded 1 (M15) | the photo of the page; strip "? Not found – but this scan was read by OCR at 61 % (threshold 70 %). Compare with the page."; card "Not found – poor scan → Review", "Poor scan: page 1 was read by text recognition with only 61 % confidence. Compare with the page."; the decision "Review · one person, with a reason" |
| Q2 (former name) | orange lane "Cannot rule out", **H01** next step Review; red 5 · orange 1 · green 39 · excluded 3 | strip "The search found no former name – but this scan is too poor to prove it."; how we know: the exact search for all 4 names, "No hit", "OCR 61 % is below the 70 % threshold: the search cannot prove that no name is there", and - as a doubt - "The model reads our company as Arvato Financial Solutions GmbH – a reading, not evidence" |
| Q8 (copies) | orange "No copy found – poor scan" (F43); red 1 (M15) · orange 1 · green 46 | "No copy found – but this scan is too poor to prove it. Compare with the page."; "Read the page. Nothing can be recorded here." |

Do not say the system found the former name on H01 - it did not; the model's own reading names
Arvato, and the tool shows that as a reading, not as evidence. Before any question, the header says
"48 contracts · 1 new" and step 1 shows H01 under "New in the register" with the card's lines ("poor
scan → a person · not found: Limitation of liability, Data processing agreement · unclear → a
person: Consumer terms in checkout · former name: cannot be ruled out – a person checks"); the five
boxes are a little lower then, and the footer line is hidden so that Confirm the plan stays at y
651–691 (no window scroll). In the contract register H01 is tagged "New", its Source says "Photo
scan · OCR 61 % · poor scan", its name column "cannot rule out". H01's contract file has the link
"Ask about former names for this contract in the Workbench →": it opens steps 1 and 2 with "Former
company name" chosen and "1 of 48 documents chosen · search: H01", H01 as the first chip; Confirm the
plan → "0 of 1 contracts still name a former company", the one tile in the orange lane.

## The click script - card "live" (Q1, with H01 in the register)

The note of the card "live" is this script, on the traffic-light Workbench (decision 95). Measured
in Edge (Playwright) on a register copy with H01 in it, 2026-11-02, 1366x768, own workflow database
and storage folder, in English and in German: **0 window scrolls** (page height 768 on every
screen), every element inside the window when it is clicked (y in brackets); the clicks alone take
23 s.

| Step | Click | What the Workbench shows |
| --- | --- | --- |
| (open) | "Open the Legal Workbench →" (`#/tool/workbench`) | The work bar "1 Analysis › 2 Contracts › 3 Answer › 4 Evidence & decision". The header says "48 contracts · 1 new"; "New in the register": "H01 · arrived … · merchant agreement · poor scan → a person · not found: Limitation of liability, Data processing agreement · unclear → a person: Consumer terms in checkout · former name: cannot be ruled out – a person checks". Below it **the five analysis boxes**: Missing clause (Pilot), Find a clause, Former company name (Pilot), Governing law, Copies |
| 1 Analysis | box **Missing clause** (y 232–328) | the box gets a mint border and ✓. Panel ①: the five playbook clauses, **Limitation of liability** (Pilot) chosen; "What we look for …"; the legend "You will see every contract – in one of three colours: ✕ Not found · ? Unclear · ✓ Found" |
| 2 Contracts | – (point at panel ②) | "Merchant agreements 21" chosen; "21 merchant agreements in scope – every one of the type · 20 will be evaluated · 1 not evaluated, each with its reason: M15 copy of M01 – the original is evaluated"; the contracts as grey chips, M15 hatched; "The answer is not shown before you confirm" |
| 3 Confirm the plan | **Confirm the plan** (y 651–691) | step 3 |
| 4 Answer + coverage | – | "Limitation of liability: not found in 3 of 20 contracts" / "3 more are unclear – a person looks. 14 contain it, with the passage."; the lanes ✕ 3 Not found: M03, M14, M18 · ? 3 Unclear: **H01**, M08, M10 · ✓ 14 Found · – 1 Excluded: M15 "copy of M01 – the original is evaluated"; "21 in scope = ✕ 3 + ? 3 + ✓ 14 + – 1"; on the right "To decide – 6 to decide · 6 open", H01 "Not found – poor scan · Poor scan (OCR 61 %) · Review". A routine row may say **Spot check**: the sample changes per run |
| 5 A rejected passage | tile **M08** (y 303–335) | step 4: clause 6.2 on page 1 **outlined, dashed orange, no fill** - "proposed by the model – rejected by the checks · page 1"; strip "? The model proposed clause 6.2 – the checks rejected it. Not evidence."; card "Unclear → Review" |
| 6 A passage that exists | **M01** in the rail under "✓ Found · 14" (y 706–737) | page 2, clause 7.2 **filled yellow** - "the passage – checked · page 2"; strip "✓ Found on page 2 – the marked passage is the limitation of liability."; card "Found → No decision", the passage, HOW WE KNOW (word for word, the clause's words, a second model call agreed, not from text addressed to AI systems); below "Positive – nothing to decide." |
| 7 Four eyes | **M14** in the rail (y 361–413) → reason → **Confirm finding** (y 628–660) → **Continue as Legal Reviewer B** (y 658–690) → reason → **Confirm finding** | strip "No limitation of liability on any of the 3 pages – the whole contract was read.", page 3 with the hidden instruction in red; "How we know it is missing: all 3 pages read …"; slot 1 "Legal Reviewer A confirmed"; after B "Confirmed ✓", both reviewers named, the archive copy unlocked |
| 8 Archive copy | **Store archive copy** (y 717–741) | "M14_Urban.pdf: stored (receipt rcpt-…) · approved by Legal Reviewer A and Legal Reviewer B" |
| (back) | **← Talk** (header, always visible) | back to the deck, then → to the close |

Do not speak the scope numbers: with H01 they are 21 in scope and 20 evaluated (20 and 19 without
it), so they would not match the register card of act 3. Show them, do not say them. The colours
are the message: red - the clause is missing; orange - a person looks (H01: a poor scan cannot prove
a clause is missing); green - it is there, with its passage.

Steps 7 and 8 write to the workflow database (`WORKBENCH_DB`) and the storage folder
(`STORAGE_MOCK_DIR`), and both survive `tools.demo reset`: a review belongs to the finding version
and every later run reuses it (decision 73). Rehearse the click script only in the dry run (below),
and start the talk with an empty workflow database and storage folder - otherwise M14 already says
"Confirmed" and the archive copy "already archived". On 2026-11-01 `var/workbench.sqlite` held a
review of M03 and M15 and an archive copy of M15 from earlier sessions.

## Timing (measured)

| From the drop | Round 1 | Round 2 | Browser, 31 Oct (before the F20 fix) | Browser, 1 Nov (fixed card, two runs) |
| --- | --- | --- | --- | --- |
| document in the register (after OCR) | 5.3 s | – | card shows 48 at 11.8 s | card shows 48 at 8.5 s and 8.5 s |
| findings in the register | 10.7 s | 10.5 s | type on the card at 13.8 s | 14.0 s and 11.0 s; the whole answer on the card at 14.7 s and 11.4 s |
| embeddings done, run logged | 11.2 s | – | – | "run cost: $0.0014 in 3 model calls" both times |
| tool open: the register's pinned row "the model is reading it …"; an earlier Q1 answer says "… – the model is still reading it" | – | – | – | 3.3 s and 4.3 s (redesigned tool, one drop) |
| tool header shows "1 new"; the earlier Q1 answer says "Out of date: H01 arrived after this answer · Ask again" | – | – | – | 10.5 s (the row filled in at 9.4 s: ≤ 3 s after the findings) |

After `tools.demo reset` that answer said "Out of date: H01 was removed from the register" and the
header "47 contracts" within 1.0 s (1 Nov, register copy, 1366x768).

Card "live": 115 s (was 100 s, decision 92) - one more click (Answer → Decide) and two typed reasons,
but no scrolling. The traffic light (decision 95) adds one stop - M01, a green passage - and about
two sentences: about +6–8 s, not measured with speech yet. Measure three rehearsals: median up to
120 s - keep; above - shorten the spoken text; still above - drop the M01 click and point at the
green lane while saying step six.

Where the time goes: 0–5 s until the watcher's next look (it polls every 5 s), OCR about 1.5 s,
the extraction call 4.4 s (1,564 → 357 tokens), the checker 0.9 s, families and 6 embeddings
under 1 s; the card asks the register every 3 s. So: **48 after 8–12 s, the whole answer after
11–15 s.** The first note line fills that: from "I copy it into the folder" it has about 25 more
words, 13–15 s at a calm pace. Cost per drop: $0.0014, $0.0010, $0.0010 (two model calls and one
embedding call).

## Before the talk

Four terminals, in this order:

```powershell
# 1 - API (no --reload during the talk: a file change would restart it)
python -m uvicorn api.main:app --port 8010

# 2 - website
cd web; npm run dev                      # http://localhost:5173

# 3 - the watcher on data\inbox (needs .env with the Azure keys and the network)
python -m pipeline.run --watch           # prints "watching ...\data\inbox"

# 4 - the check, and later the drop (big font, can be on screen)
python -m tools.demo status              # must end with "ready for the live demo: yes"
```

Open `http://localhost:5173/#/tool/workbench` once: **EN** selected (the tool remembers DE in the
browser), **Legal Reviewer A** selected (the switch survives going back to the talk), the header says
"47 contracts" and nothing new. Then go back to the deck.

`status` says NO if H01 is still in the register or in the inbox from a rehearsal: run
`python -m tools.demo reset`. A forgotten H01 would be part of the card's baseline (the first
answer it gets), so it would never appear as new; `drop` refuses in that case.

`status` also says NO when the code's prompt version (`PROMPT_VERSION` in `pipeline/config.py`) is
not the register's: "NO - 47 contracts were read with an older prompt version; the watcher would
read them again (PROMPT_VERSION is extract-v3)". A watcher started now would re-read all 47 (minutes, about $0.12, and a model may
answer differently, F7). Set the prompt version back to the register's (decision 97: `extract-v2`).

## The moment

1. The card "live-add" is on screen and shows **47**. Only now drop - the card takes its
   baseline from its first answer.
2. Say the first note line up to "a phone photo". Drop while you say "I copy it into the
   folder": either **copy** `data\demo\H01.jpg` into `data\inbox` in Explorer - Ctrl+drag, or
   Ctrl+C / Ctrl+V (the audience sees "drop a contract into the folder"; a plain drag on the same
   drive *moves* the file, and `data\demo` is not in git) - or run `python -m tools.demo drop` in
   terminal 4. If it was moved by mistake, the reset copies it back to `data\demo` before it
   deletes the inbox file.
3. Finish the first note line (the watcher, OCR, one model call, the checks): 13–15 s. The
   number turns to 48 in the middle of it.
4. Advance one build when the box would show the type: "48. Handwriting, hard to read …". If the
   box still says "the model is reading it …", wait a second - the poor-scan line is already
   there to talk about. If the screen says something else than the note (a model can answer
   differently), read the screen.
5. Go on to the card "live" and follow its click script (above).

## If something fails

| What you see | Why | What to say / do |
| --- | --- | --- |
| "register not reachable – start the API" | API not running | start terminal 1; the card recovers by itself |
| 47 stays, "waiting for a new contract …" after 20 s | watcher not running, or the file is not in `data\inbox` | start the watcher - its first pass reads the inbox at once (about 10 s) |
| 48, "H01 is new · the model is reading it …" and "poor scan → a person", and it stays after 20 s | Azure or the network is down: OCR runs locally, the model call does not. Measured with an unreachable endpoint: in the register after 5.5 s; the watcher retries for 204 s, then logs `H01 extraction failed: Connection error.` | "The model is not reachable right now. The contract is in the register anyway – nothing is lost. OCR already says: a poor scan, a person looks. The findings wait for the model." Then go on: the Workbench answers its questions from the register, without a model call - but skip the H01 sentence of the click script (step 4), and check the answer before you speak its ids |
| the watcher prints `pass failed, still watching: …` | one pass hit an error (e.g. a file removed while it was read) | nothing - the watcher keeps polling, the next pass starts from the register as it is; the traceback above the line is for afterwards |
| The work bar says "Out of date: H01 …" | Q1 was asked before H01 was read | "The register changed since this answer – the tool says so instead of changing it silently." Click **Ask again** |
| In the Q1 answer H01 is in the grey "Excluded" lane: "not read yet – listed, not checked" | the model call is still running, or failed | "It is not dropped – the answer names it and why." Skip the H01 sentence of step 4 |
| nothing works | – | "Live demos. Here is the same idea on a contract that is already in the register:" open the contract register, contract M18 (the old German scan) |

## Reset after every rehearsal - and after the talk

```powershell
# wait until the watcher printed "run cost" - or stop it (Ctrl+C) and add --force
python -m tools.demo reset
```

```
removed file ...\data\inbox\H01.jpg
forgot H01: documents 1, pages 1, doc_text 1, chunks 6, chunks_fts 6, metadata 1, clauses 5, name_hits 0, embeddings 6, llm_calls (kept, re-labelled) 2
register   ...\var\register.sqlite: 47 documents (source folders hold 47)
H01        not in the register
inbox      ...\data\inbox: H01.jpg not there
ready for the live demo: yes
```

**Too early is refused (F21).** Between "48" on the card and "run cost" in the watcher (about
5 s) the watcher is still extracting H01. A reset then would race it, so it is refused:

```
refused, nothing changed: the watcher is still working on H01 - wait until it printed 'run cost', or stop it (Ctrl+C) and run `python -m tools.demo reset --force`
```

`--force` is safe even if the watcher was not stopped (measured on a copy, reset 6.4 s after the
drop): the watcher keeps running and logs `H01 was forgotten while the model read it - result
dropped, 2 model calls re-labelled`; nothing of H01 stays in the register, and the late model
calls carry the label of that reset, so the next rehearsal starts at "model calls for this
document: 2". If a reset ever ran while an older watcher was still writing, `status` lists the
rows left behind (`leftovers  H01 rows without a document: …`) and says NO; `reset` removes them.

Proof on the copy that the reset is complete: after each of four drops and resets, every table
of the register has the same rows as before (documents 47, pages 69, doc_text 47, chunks 938,
search rows 938, embeddings 938, metadata 47, clauses 235, name_hits 14 - content identical, not
only the count); the BM25 top 20 of ten queries are identical to the real register, and
`python -m eval.check_register` stays at recall and precision 1.00 on Q1–Q8. What stays on purpose: the model calls (`llm_calls`, re-labelled
`forgotten:H01@<time>`, so the cost view still adds up - each rehearsal adds about $0.001 to the
cost total) and the audit log (history: "ingested", "extracted", "forgotten"). See
`pipeline/forget.py`.

While H01 is in the register the evaluation and the tests are off by one contract (H01 shows up
in Q1, Q2, Q3 and Q4 - measured on a copy: precision 0.83, 0.83, 0.80, 0.80, recall stays 1.00).
Always reset before `python -m eval.check_register` or `python -m pytest`.

Do not review H01's findings in the Workbench during a rehearsal: reviews are human decisions in
`var/workbench.sqlite`, they survive the reset, and when the same file comes back they apply
again (a review belongs to the finding version, decision 73). `status` warns if there are any.

## Dry run without touching the real register

Everything can point at copies: `REGISTER_DB` (register), `INBOX_DIR` (watched folder),
`WORKBENCH_DB` (reviews), `STORAGE_MOCK_DIR` and `STORAGE_API_URL` (archive copies - without them
an archive copy from the dry run goes to the storage of the API on port 8010, the real one on the
talk laptop). Set the variables in **every** terminal of the dry run.

```powershell
$dir = "$env:TEMP\demo-dry-run"; New-Item -ItemType Directory -Force "$dir\inbox", "$dir\storage" | Out-Null
python -c "import sqlite3, sys; sqlite3.connect('file:var/register.sqlite?mode=ro', uri=True).backup(sqlite3.connect(sys.argv[1]))" "$dir\register.sqlite"
$env:REGISTER_DB = "$dir\register.sqlite"; $env:INBOX_DIR = "$dir\inbox"; $env:WORKBENCH_DB = "$dir\workbench.sqlite"
$env:STORAGE_MOCK_DIR = "$dir\storage"; $env:STORAGE_API_URL = "http://127.0.0.1:8019/storage-mock"

python -m pipeline.run --watch               # terminal A
python -m tools.demo drop --wait             # terminal B: "H01 findings in the register after 10.5 s"
python -m pipeline.show H01                  # what the register holds
python -m tools.demo reset                   # back to 47
```

To see the card on the copy as well: an API on another port with the same variables
(`python -m uvicorn api.main:app --port 8019`) and the website pointed at it
(`cd web; $env:API_URL = "http://127.0.0.1:8019"; npm run dev -- --port 5198`), then open
`http://localhost:5198/#/present/live-add/1` before the drop. After the card, rehearse the click
script of the card "live" in `http://localhost:5198/#/tool/workbench` - its reviews and archive
copy stay in the dry run's folder. The header must say "1 new" after the drop.

One thing differs from the talk: in the dry run the Workbench shows no page image for H01 (the
request answers 403 "source file outside the data folder"). The API serves page images only from
`data\` (`api/register.py`, `_source_files`), and the dry run's inbox is a temporary folder. In the
talk the inbox is `data\inbox`, so the photo is shown - the same path as M20's scanned pages
(`GET /documents/M20/pages/1/image`: 200, image/jpeg, measured 2026-11-01).

**Afterwards close every terminal of the dry run** (or run `Remove-Item Env:REGISTER_DB,
Env:INBOX_DIR, Env:WORKBENCH_DB, Env:STORAGE_MOCK_DIR, Env:STORAGE_API_URL, Env:API_URL`). A reused window would point the watcher, the API
or `status` at the copy - `status` would even say "ready: yes" for it. Before the talk, the first
line of `status` must name `var\register.sqlite` and the inbox line `data\inbox`.
