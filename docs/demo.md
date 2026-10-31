# Live demo kit – a handwritten contract arrives

The live moment of the talk: card **"live-add"** in act 6 ("Add a contract – and watch the
problems being found.", 40 s), right after the act-6 opener "Let me show you." A photo of a
handwritten contract is dropped into the inbox folder (the stand-in for the SharePoint library),
the watcher reads it, and the card shows the new document and what the register found.

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
| Former company name | "Arvato Financial Solutions GmbH", twice | model reads it (`own_entity_name`), but the legacy-name check finds **nothing** – OCR wrote "Arfto financial Solutions" and "Arvafr Finanecal Solutions" (**F19**, open) |
| Counterparty | Garnkiste Krüger e.K. | "Garhkisty Krüger uK" (OCR) |

Recall first holds for the clauses: nothing that is on the page is reported missing without a
person looking, and the missing clauses are found. The former name is the miss - a good story
for the question "what does not work yet?" (exact match on a bad scan cannot prove absence; the
fix is the multimodal fallback, decision 10).

## What the card shows

**Today it shows no problem at all (F20, open).** Measured in Edge against a register copy:

```
baseline: 47 | documents in the register, live | waiting for a new contract …
11.8 s: 48 | documents in the register, live | H01 is new · type unknown – a person checks
13.8 s: 48 | documents in the register, live | H01 is new · merchant agreement
```

and nothing more for 40 s: the card fetches the findings once, before the model has answered,
and never again; its poor-scan line looks in the wrong field. After the fix in `act6.tsx` it
should show: 48 · H01 is new · merchant agreement · not found: Limitation of liability, Data
processing agreement · unclear → a person: Consumer terms in checkout · poor scan → a person.
Do not promise "an old company name" for H01 (F19).

## Timing (measured)

| From the drop | Round 1 | Round 2 | Browser run |
| --- | --- | --- | --- |
| document in the register (after OCR) | 5.3 s | – | card shows 48 at 11.8 s |
| findings in the register | 10.7 s | 10.5 s | type on the card at 13.8 s |
| embeddings done, run logged | 11.2 s | – | – |

Where the time goes: 0–5 s until the watcher's next look (it polls every 5 s), OCR about 1.5 s,
the extraction call 4.4 s (1,564 → 357 tokens), the checker 0.9 s, families and 6 embeddings
under 1 s; the card asks the register every 3 s. **Plan for 10–15 s of talking** between the drop
and the result. Cost per drop: $0.0014, $0.0010, $0.0010 (two model calls and one embedding call).

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

`status` says NO if H01 is still in the register or in the inbox from a rehearsal: run
`python -m tools.demo reset`. A forgotten H01 would be part of the card's baseline (the first
answer it gets), so it would never appear as new; `drop` refuses in that case.

## The moment

1. The card "live-add" is on screen and shows **47**. Only now drop - the card takes its
   baseline from its first answer.
2. Say the first note line, then drop: either **copy** `data\demo\H01.jpg` into `data\inbox`
   in Explorer - Ctrl+drag, or Ctrl+C / Ctrl+V (the audience sees "drop a contract into the
   folder"; a plain drag on the same drive *moves* the file, and `data\demo` is not in git) - or
   run `python -m tools.demo drop` in terminal 4. If it was moved by mistake, the reset copies it
   back to `data\demo` before it deletes the inbox file.
3. Talk for 10–15 s. Advance one build: the line below the number shows the new contract.
4. Show the result, then go on to the card "live" (the Legal Workbench).

## If something fails

| What you see | Why | What to say / do |
| --- | --- | --- |
| "register not reachable – start the API" | API not running | start terminal 1; the card recovers by itself |
| 47 stays, "waiting for a new contract …" after 20 s | watcher not running, or the file is not in `data\inbox` | start the watcher - its first pass reads the inbox at once (about 10 s) |
| 48, "H01 is new · type unknown – a person checks", and it stays | Azure or the network is down: OCR runs locally, the model call does not. Measured with an unreachable endpoint: in the register after 5.5 s; the watcher retries for 204 s, then logs `H01 extraction failed: Connection error.` | "The model is not reachable right now. The contract is in the register anyway – nothing is lost. It waits for the model, and until then a person sees it as type unknown." Then go on: the Workbench answers its questions from the register, without a model call |
| the watcher prints `pass failed, still watching: …` | one pass hit an error (e.g. a file removed while it was read) | nothing - the watcher keeps polling, the next pass starts from the register as it is; the traceback above the line is for afterwards |
| nothing works | – | "Live demos. Here is the same idea on a contract that is already in the register:" open the Workbench, contract M18 (the old German scan) |

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
in Q1, Q3 and Q4). Always reset before `python -m eval.check_register` or `python -m pytest`.

Do not review H01's findings in the Workbench during a rehearsal: reviews are human decisions in
`var/workbench.sqlite`, they survive the reset, and when the same file comes back they apply
again (a review belongs to the finding version, decision 73). `status` warns if there are any.

## Dry run without touching the real register

Everything can point at copies: `REGISTER_DB` (register), `INBOX_DIR` (watched folder),
`WORKBENCH_DB` (reviews). Set the three variables in **every** terminal of the dry run.

```powershell
$dir = "$env:TEMP\demo-dry-run"; New-Item -ItemType Directory -Force "$dir\inbox" | Out-Null
python -c "import sqlite3, sys; sqlite3.connect('var/register.sqlite').backup(sqlite3.connect(sys.argv[1]))" "$dir\register.sqlite"
$env:REGISTER_DB = "$dir\register.sqlite"; $env:INBOX_DIR = "$dir\inbox"; $env:WORKBENCH_DB = "$dir\workbench.sqlite"

python -m pipeline.run --watch               # terminal A
python -m tools.demo drop --wait             # terminal B: "H01 findings in the register after 10.5 s"
python -m pipeline.show H01                  # what the register holds
python -m tools.demo reset                   # back to 47
```

To see the card on the copy as well: an API on another port with the same variables
(`python -m uvicorn api.main:app --port 8019`) and the website pointed at it
(`cd web; $env:API_URL = "http://127.0.0.1:8019"; npm run dev -- --port 5198`), then open
`http://localhost:5198/#/present/live-add/1` before the drop.

**Afterwards close every terminal of the dry run** (or run `Remove-Item Env:REGISTER_DB,
Env:INBOX_DIR, Env:WORKBENCH_DB, Env:API_URL`). A reused window would point the watcher, the API
or `status` at the copy - `status` would even say "ready: yes" for it. Before the talk, the first
line of `status` must name `var\register.sqlite` and the inbox line `data\inbox`.
