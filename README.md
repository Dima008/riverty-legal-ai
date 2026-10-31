# Riverty Legal AI – a Legal Workbench over a compiled contract register

Case-study prototype for Riverty's "Software Engineer (RAG)" interview. Synthetic and public test
data only – no real Riverty contracts.

## What it does

It answers the two pilot questions of the task – *"Which contracts lack clause X?"* and *"Which
contracts still name a former company?"* – for **every** contract in scope, not for the top few
search hits. Each answer shows its coverage (checked, excluded and why), the verified quote with
the passage highlighted on the original page, and a triage lane. A lawyer decides – two lawyers
for critical rows – and only then may a write-only archive copy be stored. Every action is in the
audit log, every model call is costed.

Measured: recall and precision 1.00 on the eight gold questions in every full run (five runs with
gpt-4.1-mini, two with gpt-4.1). The model alone finds 0.60–1.00 of the contracts without a
liability cap; the gap is why the checks exist.

## Core ideas

- **Compile, don't search** – every contract is read once, completely, into a register; questions
  become queries. Top-k retrieval can never prove that a clause is missing (decisions 4, 37).
- **The prompt asks, the checks enforce** – the model proposes, deterministic checks and an
  independent checker call decide what goes into the register (9, 38, 39).
- **Recall first** – "missing" and "unclear" are always shown together; coverage is always
  visible, no contract drops out silently (3, 5, 51).
- **Observations, not legal judgments** – lawyers decide; nothing with an external effect happens
  without approval (2, 21, 57). A review belongs to the finding and is reused by every question (73).

## Start here

| Read | What you get | Time |
| --- | --- | --- |
| [`docs/context/case-study.md`](docs/context/case-study.md) | the task, verbatim | 5 min |
| [`docs/approach.md`](docs/approach.md) | the talk chapter by chapter: problem, approach, decisions, architecture, proof, operations, adoption | 10 min |
| [`docs/explorer.md`](docs/explorer.md) | how it works, station by station, with real numbers and one live API call each | 15 min |
| [`docs/failure-cases.md`](docs/failure-cases.md) | every failure found (F1–F17) with verbatim evidence and the layer that now catches it | 10 min |
| [`docs/dev-log.md`](docs/dev-log.md) | every work step: problem, cause, technique, rejected alternative, metric before → after | skim |
| [`docs/context/decisions.md`](docs/context/decisions.md) | all decisions with reason and rejected alternative (German mirror of the Notion log) | skim |

## Code tour

Build side, in the order a contract travels: `pipeline/run.py` (the whole build in one function)
→ `ingest.py` (text layer or OCR) → `chunking.py` → `extract.py` (prompt, schema, `assess()` =
the guardrail sandwich) → `families.py` (copies, amendments, former names) → `index.py`.
Module and table map: [`docs/pipeline.md`](docs/pipeline.md).

Read side: `pipeline/portfolio.py` (check types, coverage, triage) → `api/workflow.py`
(`POST /runs`) → `api/review.py` (four eyes, tool gate, idempotent archive copy) →
`api/findings.py` (review in the register) → `api/storage_mock.py`.

Frontend (`web/src`): `App.tsx` (one site, two layers: Case study | Legal Workbench) →
`story/` (the presentation) → `workbench/` (ask, run, evidence, review) → `register/` (matrix,
contract file).

Tests: `tests/test_portfolio.py` shows the style – a hand-built register and invariants, never one
model answer (F7).

## Run it

Windows details: [`docs/setup-windows.md`](docs/setup-windows.md).

```bash
git config core.hooksPath .githooks          # secret guard and dev-log guard
pip install -r requirements.txt              # Python 3.12; plus Tesseract with deu + eng
cp .env.example .env                         # Azure OpenAI endpoint, key, deployments
python -m pipeline.run                       # build the register (~3 min, ~$0.12)
python -m eval.check_register                # gold questions, no model call
python -m pytest                             # needs the built register, no model call
uvicorn api.main:app --reload --port 8010    # API, docs at http://127.0.0.1:8010/docs
cd web && npm ci && npm run dev              # http://localhost:5173
```

More: `python -m pipeline.show M08` (one contract with all evidence), `python -m eval.what_if
checker clause_vocabulary` (what if a safeguard were missing – replay, no model call),
`python -m eval.repeat --runs 3 --label consistency` (fresh registers, ~$0.11 per run),
`python -m pipeline.run --watch` (the inbox stands in for SharePoint – rehearse on a register copy
via `REGISTER_DB`).

## Repository map

| Path | Content |
| --- | --- |
| `data/` | gold set: 20 synthetic merchant agreements + 1 amendment, 6 data processing agreements, 20 CUAD contracts, 8 gold questions ([`data/README.md`](data/README.md)) |
| `tools/` | deterministic generator of the synthetic test documents |
| `pipeline/` | build (ingest, chunking, extract, families, index, run) · read (portfolio, search, evidence, compare, queries, show) · shared (config, store, catalogue, llm) |
| `eval/` | gold-set evaluation, repeated runs, what-if replay; results in `eval/results/` |
| `api/` | FastAPI: register and explorer, runs, reviews and archive, review in the register, quality and monitoring, storage mock |
| `web/` | Vite + React + TypeScript + Fluent UI: presentation and Legal Workbench in one site |
| `tests/` | pytest against the built register |
| `docs/` | approach, explorer, pipeline, failure cases, dev log, setup; `context/` holds the task and the decision log |
| `var/` | generated register and workflow database (git-ignored) |
| `.claude/skills/`, `.githooks/` | project rules as code: record failures and decisions, dev log, secret guard |

## Prototype today → Azure target

| Concern | Prototype | Azure |
| --- | --- | --- |
| Documents | `data/` folders, `data/inbox` watch folder | SharePoint via Microsoft Graph |
| OCR | Tesseract deu+eng | Content Understanding; multimodal fallback for handwriting |
| Models | `pipeline/llm.py` adapter, gpt-4.1-mini | Foundry models in the EU data zone |
| Register | SQLite | PostgreSQL (the SQL in each step is rewritten when porting) |
| Search | FTS5 + vectors + RRF | AI Search, hybrid, with permission filters |
| Contract storage | `api/storage_mock.py` behind `api/storage_client.py` | Riverty's storage API |
| Users | two simulated reviewers | Entra ID |
| Monitoring | `GET /monitoring` | Application Insights / Azure Monitor |
| Secrets | `.env` | Key Vault |
| Orchestration | fixed check types, planner without a model | Agent Framework with MCP tools |

## Quality at a glance

Recall and precision 1.00 on Q1–Q8 in all seven full runs; metadata 27 of 27; CUAD agreement
19 of 20; 233 of 235 findings stable between runs; $0.09–0.12 per full run. Caveat: prompt and
checks were tuned on this gold set – a sealed held-out set comes next (decision 72).
`GET /evaluation` and `GET /monitoring` serve the numbers live.

## Status

Done: gold set, pipeline, Legal Workbench (API and UI), contract register with review and
escalation, comparison, evaluation with repeated runs and a model comparison, what-if replay,
monitoring API, the frame of the presentation website. Next: the chapters of the website, the
tool in German and English, the held-out set. Known gaps: amendments that add or delete a clause,
deletion sync, the handwritten example. History: [`docs/dev-log.md`](docs/dev-log.md).

## How we work

A dev-log entry for every code step (enforced by the pre-commit hook), failures recorded when
they happen, every decision logged with reason and rejected alternative, the explorer station
updated in the same commit, AI contribution visible in every commit (Co-Authored-By, decision 32),
secrets only in `.env`.

## Data and licence

Every synthetic page is watermarked "SYNTHETIC TEST DOCUMENT". The CUAD subset is used under
CC BY 4.0. No real Riverty contracts.
