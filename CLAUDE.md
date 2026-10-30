# CLAUDE.md – project context for Claude Code

## What this is

Prototype for the Riverty interview case study "Software Engineer (RAG)": an AI assistant for
Riverty's legal team that organises, reviews and compares contracts, checks them against
internal guidelines and protects the company's interests. Concrete pilot questions: "Which
contracts lack clause X?" and "Which contracts still name a legacy company?".
Deliverables: 15–20 min presentation (as a website, English) plus a working implementation
(pipeline, frontend, end-to-end workflow with human approval).

The person you work with is Dima, the candidate. He must be able to explain every line in
the interview. Work as a mentor: explain what you do and why, keep steps small, and end a
larger step with one short check question. **Talk to Dima in German; code, comments, docs
and the presentation are in English.**

## Context – read first

Planning happened before this repo was opened in VS Code. Read these before doing anything:

- `docs/context/briefing.md` – everything discussed: working style, problem analysis,
  approach, target architecture, MVP canvas (states per step), frontend and presentation
  plan, governance and adoption, status, schedule, where things live
- `docs/context/case-study.md` – the original task, verbatim
- `docs/context/decisions.md` – the decision log (export of Notion, kept in sync by `log-decision`)
- `docs/pipeline.md`, `docs/failure-cases.md` – how the pipeline works, every error found

Notion (page "Riverty Case Study") is the source of truth for decisions, roadmap and the
coverage matrix. If the Notion MCP server is connected, read and update it directly; if not,
ask Dima to run `claude mcp add --transport http notion https://mcp.notion.com/mcp` and `/mcp`.

## Core design (do not change without discussing)

- **Compile, don't search.** Every contract is read once, completely, into a structured
  register (metadata, clause catalogue, families, page-level evidence). Questions like
  "which contracts lack X" are register queries, not top-k retrieval: top-k can never prove
  absence.
- **Guardrail sandwich.** Deterministic checks before and after every model call. Every
  finding carries a verified quote; `model_status` keeps what the model said, `status` what
  the register says after the checks (quote found, clause vocabulary, independent checker
  call = maker-checker, absence signals, OCR quality, prompt-injection spans).
- **Recall first.** Missing a contract that lacks a clause is the expensive error. ABSENT and
  UNCLEAR are always shown together; UNCLEAR and low confidence go to a human.
- **Observations, not legal judgments.** The system reports what the text says; lawyers
  decide. Nothing with external effect (archive copy via the storage API) without approval.
- **Azure only** for the implementation (Azure OpenAI now; target: Microsoft Agent
  Framework, MCP tools, Azure AI Search, Content Understanding, Container Apps, Entra ID).
  Local stand-ins sit behind adapters: SQLite = PostgreSQL + AI Search, `data/inbox` =
  SharePoint library.

## Layout and commands

| Path | Content |
| --- | --- |
| `pipeline/` | ingest (text layer, Tesseract OCR), chunking, extract (+ checks, checker), families, index, search, queries, run |
| `pipeline/catalogue.py` | Legal's playbook as data: clause definitions, required per doc type, keywords. Changing it = bump `PROMPT_VERSION` in `config.py` |
| `eval/check_register.py` | Gold questions Q1–Q8, metadata, CUAD agreement; results in `eval/results/` |
| `data/` | Synthetic gold set (every page watermarked "SYNTHETIC TEST DOCUMENT"), CUAD subset (CC BY 4.0), `ground_truth.csv`, `gold_queries.json` |
| `docs/` | `pipeline.md`, `failure-cases.md`, **`explorer.md` (frontend explanations per step)**, `setup-windows.md`, `context/` (task, briefing, decisions); ADRs later in `docs/adr/` |
| `pipeline/evidence.py` | Maps a verified quote back onto the page's word boxes (highlight, also across page breaks) |
| `pipeline/portfolio.py` | Portfolio checks: fixed check types, coverage (never drop a contract silently), triage |
| `api/` | FastAPI: `register.py` read-only register + explorer; `workflow.py` runs, audit; `review.py` reviews + archive; `storage_mock.py` write-only storage stand-in; `workbench.py` workflow DB |
| `tests/` | pytest against the built register; check invariants, not one model answer (F7) |
| `web/` | Vite + React + TypeScript + Fluent UI v9: `workbench/` (ask, plan, run, coverage, evidence with page highlight, four-eyes review, archive), `AuditLog.tsx`; texts in `labels.ts` (lawyers' language) |
| `var/register.sqlite` | Generated register (git-ignored) |
| `.claude/skills/` | Project skills: `record-failure`, `log-decision`, `run-eval`, `dev-log`, `session-summary` |
| `.githooks/pre-commit` | Secret guard (keys, real Azure endpoints, `.env` files) and dev-log guard |
| `docs/dev-log.md` | One entry per work step: problem, cause, technique, rejected alternative, metric before → after |

```bash
python -m pipeline.run              # build/update the register (idempotent: file hash + prompt version)
python -m pipeline.run --watch      # auto-ingest files dropped into data/inbox
python -m pipeline.run --reassess   # replay deterministic checks on stored model output, no cost
python -m eval.check_register       # must stay at recall 1.0 on Q1–Q8 (--json to store the numbers)
python -m eval.repeat --runs 3 --label consistency   # fresh registers in var/eval_runs, compare runs (~$0.11 each)
python -m eval.repeat --runs 1 --label gpt-4.1 --chat-deployment gpt-4.1   # another model (price in config first)
python -m pipeline.show [M08]       # overview of the register or one contract with all evidence
uvicorn api.main:app --reload --port 8010   # Workbench API, docs at http://127.0.0.1:8010/docs (8000 is taken on the laptop)
python -m pytest                    # API tests against the built register, no model calls
cd web && npm run dev               # Workbench UI on http://localhost:5173 (proxies /api to 8010; API_URL overrides)
cd web && npm run build             # type-check (tsc) + production bundle
```

## Rules

- **Never commit secrets.** Keys live only in `.env` (git-ignored). Before every commit check
  that no key or personal endpoint is staged. `.githooks/pre-commit` enforces this
  (activate once per clone: `git config core.hooksPath .githooks`).
- **Development log after every work step.** A work step is a commit that changes code or
  behaviour. Before committing, add an entry at the top of `docs/dev-log.md` (skill `dev-log`):
  problem, cause, technique and why, rejected alternative, metric before → after – real
  numbers only. `.githooks/pre-commit` refuses code commits without it (`SKIP_DEVLOG=1` for
  trivial ones). New failures also go to `docs/failure-cases.md`, new decisions to Notion.
- **Session summary for Notion.** At the end of every session (Dima says so, or
  `/session-summary`) write a short German summary at the top of the Notion page
  "Sitzungsprotokolle" and refresh "Aktueller Stand" on the main page (skill `session-summary`).
- **Record every failure when it happens.** Any wrong result, crash or surprising behaviour
  found while testing goes into `docs/failure-cases.md` right away, with verbatim evidence,
  also before the fix is known (skill `record-failure`). They are shown in the presentation.
- Only synthetic or public test data. Never real Riverty contracts. Keep the watermark.
- After any change to extraction, checks or catalogue: run `python -m eval.check_register`
  and store the output in `eval/results/` when it is a new version (skill `run-eval`).
- Every decision (also small ones: region, model, library, trade-off) is logged in the Notion
  database "Entscheidungen" (page "Riverty Case Study") with reason, rejected alternative and
  how prominent it is in the presentation (skill `log-decision`, also appends to
  `docs/context/decisions.md`). If Notion is not connected here, list the decision in the
  commit message and tell Dima so it can be logged.
- **Explain every step for the frontend.** When a pipeline or workflow step is added or
  changed, update its station in `docs/explorer.md` (what, numbers, why, failure, live API
  call, diagram) in the same commit. The pipeline explorer in the frontend is built from it.
- AI contribution stays visible in the git history (Co-Authored-By trailer).
- Show costs: every model call is recorded in `llm_calls`; the UI shows cost per run.
- Never put chat transcripts or the Azure endpoint/resource name into the repo.
- Do not copy material from the AWS agentic workshop slides (confidential); reuse techniques only.

## Status and next steps (2026-10-30)

Done: gold set, pipeline (recall/precision 1.0 on Q1–Q8, CUAD 19/20, ~$0.12 per full run),
register viewer (`pipeline.show`), error catalogue F1–F8, ablation (model alone: Q1 recall
0.80; with checks: 1.00). Explanations for Dima in Notion: "Prototyp: Was wir gebaut haben",
"Konzepte verständlich erklärt".

Local setup on Dima's laptop done (2026-10-30): Python 3.12 `.venv`, Tesseract 5.4 with
`deu` via `TESSDATA_PREFIX`, register built, evaluation green on the laptop
(`eval/results/2026-10-30_extract-v2_laptop.txt`, $0.12). Package versions pinned. Failure
cases F9 (OCR differs between machines, no impact, cause open) and F10 (C11 flagged as
amendment, silently dropped from queries; fixed, decision 51).

API step 1 done: read-only register and pipeline-explorer endpoints (`/summary`,
`/documents/...` incl. findings with guardrail layers, highlight boxes, page images, chunks
with fixed-size comparison, prompt, `/search` with BM25/vector/RRF lists), 12 tests green.
API decisions 52–55: server-rendered page image + word boxes, triage rule, two simulated
reviewers, planner without model first.

API step 2 done: `pipeline/portfolio.py` (fixed check types, plan validation, coverage
"in scope = checked + excluded with reason", triage) and `api/workflow.py` (`/checks`,
`/examples`, `/users`, `POST /runs`, `/runs`, `/audit`). Runs are stored as snapshots in
`var/workbench.sqlite`, separate from the register (decision 56). All 8 gold questions pass
through `POST /runs`.

API step 3 done: `api/review.py` (reviews with reason, four-eyes with two different reviewers,
DISPUTED on disagreement, batch only for CONFIRM rows, `GET /runs/{id}` shows review states;
`POST /archive` with tool gate and per-file SHA-256 idempotency), `api/storage_mock.py`
(write-only `PUT /contracts/{sha256}`, mounted at `/storage-mock`), `api/storage_client.py`
(adapter, `STORAGE_API_URL`). Decision 57 ("Vorschlag"). End-to-end over real HTTP verified;
38 tests green.

Next (Step 5 – Legal Workbench). Flow: question → plan (which register query / which
contracts) → per-contract result with status, quote and page highlight → triage (CONFIRM /
REVIEW / FOUR_EYES) → approval → archive copy via a mock storage API (write-only, idempotent
by document hash) → audit log. Show coverage and cost per run.
1. ~~API steps 2 and 3~~ done (see above).
2. **API step 4**: model planner (function calling over the same check types, asks back when
   unclear; examples stay as fallback).
3. **Frontend** `web/`: Workbench done and redesigned (brand theme in `src/theme.ts`, question
   cards, KPI tiles, result cards, page as paper with highlight, checks as timeline; missing
   findings highlight the passage that triggered a hint, e.g. the injected note in M14 on
   page 3). Verified in Edge with a scripted walkthrough. Next: the **pipeline explorer**
   (decision 49) built from `docs/explorer.md`.
4. **Step 6 – Evaluation**: done: repeated runs (233/235 findings stable, F7) and model
   comparison gpt-4.1 vs gpt-4.1-mini (same recall with checks, 5x cost; production stays on
   mini, decision 65, F11, F12). Open: held-out test set (we tuned on the gold set), retrieval
   quality, handwritten JPEG (H01 from Dima; expected: Tesseract fails on cursive → the
   vision-model fallback of decision 10).
5. Presentation website (chapters and minutes in `docs/context/briefing.md`, section 7),
   PDF fallback, dress rehearsal.
6. Known gap: amendments only change the company name so far. An amendment that **adds** a
   clause leaves the base agreement "missing" (false alarm); one that **deletes** a clause
   leaves it "present" (a miss – the dangerous direction). Needs clause-level merging per family.
7. Open items: MCP server over `pipeline.queries`, planner (function calling), handwritten
   example (Dima provides `data/raw/handwritten/H01.jpg`), deletion sync (known gap),
   decision 21 "observations, not legal judgments" still to be confirmed by Dima.
