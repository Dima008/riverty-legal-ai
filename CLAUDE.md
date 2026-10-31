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
| `api/` | FastAPI: `register.py` read-only register + explorer; `workflow.py` runs, audit; `review.py` reviews + archive; `findings.py` review and escalation directly in the register, reused by runs (decision 73); `storage_mock.py` write-only storage stand-in; `workbench.py` workflow DB |
| `tests/` | pytest against the built register; check invariants, not one model answer (F7) |
| `web/` | Vite + React + TypeScript + Fluent UI v9. One website, two layers: `deck/` (the talk in Gamma style, decision 76: `slides.ts` = order of acts and cards, `slides/act*.tsx` = one card each with its speaker notes, `Page.tsx` = scrolling page, `Present.tsx` = full screen, `Presenter.tsx` = notes and clock; the old `story/` chapters are kept only as material for acts 3-6) and the tool: `workbench/` (ask, plan, run, coverage, evidence with page highlight, four-eyes review, archive), `register/`, `AuditLog.tsx`. `routing.ts`: hash routes `#/story/<card>`, `#/present/<card>/<build>`, `#/presenter/…`, `#/tool/<area>`. Texts in `labels.ts` (lawyers' language) |
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
python -m eval.what_if [checker ...]   # what if a safeguard were missing: replay on a copy, no model call
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

## Status and next steps (2026-10-31)

History of every step: `docs/dev-log.md`. Decisions 1–74 are in Notion and `docs/context/decisions.md`.

Done: gold set and pipeline (recall/precision 1.00 on Q1–Q8 in all 7 full runs, CUAD 19/20,
~$0.12 per full run); Legal Workbench API and UI (runs with coverage and triage, four-eyes review,
gated idempotent archive copy, audit); contract register with review and escalation per finding
version, reused by every run (decision 73); comparison; evaluation (repeated runs, gpt-4.1
comparison – production stays on gpt-4.1-mini, decision 65); what-if replay (decision 67);
monitoring API; website frame with the approved storyline (decision 68, `docs/approach.md`);
F13–F17 from the repo audit fixed.

Next, in this order: tool in German and English (decision 74; "Missing" → "Not found" still to
confirm with Dima) · chapter content of the website (P0 list in the site plan: figure registry,
pipeline map, M18 journey, trap map, architecture toggle, release gate, demo doorway, monitoring
view, compare view, print/PDF) · held-out set (decision 72; Dima writes 2–4 contracts) ·
`eval/negative_search.py` (top-k vs register, chapter 2) · demo reset and rehearsal kit.

Known gaps: amendments that add or delete a clause (clause-level merging per family); deletion
sync; handwritten example (Dima provides `data/raw/handwritten/H01.jpg`; Tesseract expected to
fail on cursive → multimodal fallback, decision 10); model planner with function calling.
