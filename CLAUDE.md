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
| `docs/` | `pipeline.md`, `setup-windows.md`, ADRs later in `docs/adr/` |
| `var/register.sqlite` | Generated register (git-ignored) |

```bash
python -m pipeline.run              # build/update the register (idempotent: file hash + prompt version)
python -m pipeline.run --watch      # auto-ingest files dropped into data/inbox
python -m pipeline.run --reassess   # replay deterministic checks on stored model output, no cost
python -m eval.check_register       # must stay at recall 1.0 on Q1–Q8
```

## Rules

- **Never commit secrets.** Keys live only in `.env` (git-ignored). Before every commit check
  that no key or personal endpoint is staged.
- Only synthetic or public test data. Never real Riverty contracts. Keep the watermark.
- After any change to extraction, checks or catalogue: run `python -m eval.check_register`
  and store the output in `eval/results/` when it is a new version.
- Every decision (also small ones: region, model, library, trade-off) is logged in the Notion
  database "Entscheidungen" (page "Riverty Case Study") with reason, rejected alternative and
  how prominent it is in the presentation. If Notion is not connected here, list the
  decision in the commit message and tell Dima so it can be logged.
- AI contribution stays visible in the git history (Co-Authored-By trailer).
- Show costs: every model call is recorded in `llm_calls`; the UI shows cost per run.

## Status and next steps (2026-10-29)

Done: gold set, pipeline (recall/precision 1.0 on Q1–Q8, CUAD 19/20, ~$0.12 per full run).

Next:
1. **Local setup on Dima's laptop** (`docs/setup-windows.md`) – the live demo runs there.
2. **Step 5 – Legal Workbench**: FastAPI backend in `api/` over `pipeline.queries` and
   `pipeline.search`; React/TypeScript frontend in `web/`. Flow: question → plan (which
   register query / which contracts) → per-contract result with status, quote and page
   highlight (word boxes in `pages.words_json`) → triage (CONFIRM / REVIEW / FOUR_EYES) →
   approval → archive copy via a mock storage API (write-only, idempotent by document hash)
   → audit log. Show coverage ("47 of 47 contracts checked") and cost per run.
3. **Step 6 – Evaluation**: several runs (variance at temperature 0), retrieval quality,
   error catalogue.
4. Known gap: documents deleted at the source stay in the register (data lifecycle).
