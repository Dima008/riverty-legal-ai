# Briefing – everything discussed so far (as of 2026-10-30)

> **Frozen handover snapshot** from the start of development (morning of 2026-10-30). It is kept
> as it was. Living sources: the story of the talk in `docs/approach.md`, decisions in
> `docs/context/decisions.md`, the project status in `CLAUDE.md`, every step in `docs/dev-log.md`.
> Where they differ (e.g. 1,100 instead of 2,000 contracts, 10 chapters instead of 6), they win.

Handover from the planning sessions (claude.ai + Notion) to development in VS Code. Read this
after `CLAUDE.md`. The full working notes are in Notion (German); this file condenses them.
Source of truth for decisions: Notion database "Entscheidungen" (export in `decisions.md`).

## 1. Working with Dima

- Dima is the candidate. He presents the solution (15–20 min, in English) and must be able to
  explain and defend every decision and every line of code.
- Mentor mode: explain the goal and the options, recommend one, let Dima decide, keep steps
  small, end a larger step with one short check question. German in conversation; code, docs
  and the presentation in English.
- Every decision is logged immediately in Notion "Entscheidungen" with reason, rejected
  alternative and prominence in the presentation (Hauptpunkt / Kurz erwähnen / Nur auf
  Nachfrage). Small decisions too (region, model, budget, key handling).
- Every new piece of input is checked against the coverage matrix "Bewertungspunkte &
  Abdeckung" (44 points from the task, the role and the context) so nothing is missed –
  especially governance and adoption.
- Dima wants innovation (not just LangChain), a structured and professional approach, and
  documentation of why. He asked for plain explanations of the concepts (chunking, RAG, MCP,
  embeddings, vector search, system prompt) – see Notion "Konzepte verständlich erklärt".
- Real failures are shown in the presentation (decision 46): `docs/failure-cases.md`.

## 2. The task in short

Full text: `case-study.md`. Riverty wants the legal team to "create more with the same team".
Lawyers organise, review and compare contracts and check them against corporate guidelines
and the company's interests. Concrete task: find contracts that lack a passage or that name a
company that must be updated – today by opening every document. Sources: SharePoint PDFs,
old handwritten contracts as JPEG. A contract storage REST API may **solely** be used to store
an additional, legally compliant copy. Tech principle: evaluate best-of-breed, then compare
with Microsoft (Azure, Foundry/Gemini, containers, Python/FastAPI, Terraform, React/TS,
LangChain/LangGraph). Deliverables: presentation (solution, technical solution and
implementation, infrastructure, adoption concept, anything else) and a basic implementation
(pipeline, frontend, end-to-end workflow). AI use is welcome "as long as we understand what is
happening". The file name "Software Engineer (RAG)" signals that retrieval competence is
examined closely.

Riverty addendum: no real contracts; >100 vendors (inbound), >1,000 merchants (outbound), B2B
and B2B2C; public contracts may be used; they care about approach and reasoning.

Context: Riverty (formerly Arvato Financial Solutions / AfterPay, rebranded 2021/22) received
an EU banking licence and starts as a bank in Luxembourg in July 2026 – regulatory
expectations rise (GDPR, DORA, EU AI Act).

## 3. Problem analysis (key points)

- Problem statement: lawyers answer portfolio questions like "which contracts do not contain
  clause X?" by opening, searching and re-reading every document – slow, error-prone, does not
  scale.
- Core insight from the task text: agents fail because of the **size and complexity of the
  environment**, not because of the model. So: structure and shrink the environment first.
- Why agents fail: thousands of contracts fit no context window; heterogeneous formats; no
  metadata; open access to everything is uncontrollable and expensive; top-k RAG cannot
  answer completeness questions; answers without evidence force lawyers to re-check
  everything.
- Use cases: UC1 contract register (MVP), UC2 clause search incl. negative search (MVP),
  UC3 company names (MVP), UC4 guideline check (example in MVP), UC5 pairwise comparison
  (later), UC6 company interests (later), UC7 handwritten contracts (example), UC8 compliant
  copy (example), UC9 review and approval (MVP).
- "Compare" has two meanings: portfolio against a reference (MVP, both examples in the task)
  and contract against template/version (later, same register).
- Storage API: "solely" = write-only, never a data source; "additional copy" = the original
  stays in SharePoint; "legally compliant" = immutable, complete, traceable.
- Stakeholders: Legal (less drudgery, keep control), management (productivity), engineering
  (maintainable, known stack), security/data protection (confidentiality, GDPR, EU data),
  compliance (traceability), finance (predictable cost).
- Quality goal: **100 % traceable instead of 100 % accurate**. Three states PRESENT / ABSENT /
  UNCLEAR. Recall before precision. Coverage always visible.
- Corporate guidelines become a versioned rule catalogue owned by Legal.
- Lever = time saved: e.g. 2,000 contracts × 5 min ≈ 167 h per question today (placeholder).
- Open questions for Riverty (ask in the interview): number of contracts and JPEG share,
  languages, approved models/regions, where the guidelines live, what the storage API accepts,
  which error is worse, existing CLM system, number of users and power users, budget.

## 4. Approach

Double Diamond: Discover → Define → Develop → Deliver. Method: classify every sentence of the
task, separate explicit from derived, stakeholders, root causes, levers, assumptions.
Architect path: qualify pilot → as-is process → reimagined process → per step deterministic
or agent (guardrail sandwich) → patterns with minimal autonomy → architecture (C4, ADRs,
arc42) → platform (Azure, Terraform, least privilege) → evaluate and harden → adopt and scale.

Techniques come from an agentic workshop Dima attended (AWS-based). **Use the techniques, not
AWS, and do not copy any of the workshop slides** (they are confidential); the implementation
is Azure only.

AI usage is made transparent (decision 32): Claude was used as sparring partner and
accelerator for analysis, research, drafts and code; priorities, decisions and checks are
Dima's, each decision dated and justified. Interview sentence (German original in Notion):
"I used AI as a sparring partner and accelerator for analysis, research, drafts and code;
priorities, decisions and reviews were mine, and every decision is documented with date and
reason."

## 5. Solution and target architecture

- **Compile, don't search:** each contract once into a register (metadata, clause catalogue,
  families, duplicates, page-level evidence). Agents only work on the register through narrow
  tools.
- **Guardrail sandwich:** input controls (permissions, prompt shields, limited tools, documents
  as data) → model → output controls (schema, quote verification, confidence threshold,
  approval). Deterministic first, LLM only for meaning.
- **Risk-based human-in-the-loop:** humans make mistakes too (automation bias) – evidence
  before verdict, no bulk confirmation of critical cases, control cases with known answers.
  Triage: CONFIRM (with sampling) / REVIEW / FOUR_EYES.
- **Deviation is not a legal violation** (decision 21, still "Vorschlag"): the system reports
  observations; legal assessment only by a lawyer. Never write "invalid" or "GDPR breach".
- Workshop learnings: structured output (enum status, quote, page, confidence, rule id and
  version), must-rules in code (deterministic override), real HITL (stored state, review task,
  resume), tool gate and idempotency for the archive copy (key: document hash), measure
  consistency.
- Target Azure stack: React/TS (Static Web Apps or Container Apps), FastAPI on Container Apps
  (+ Service Bus), Microsoft Agent Framework 1.0 (LangGraph fallback; Strands rejected:
  AWS-centric), Foundry models (EU data residency), Azure Content Understanding, Azure AI
  Search (hybrid, permission filters), PostgreSQL, Blob Storage, MCP servers behind API
  Management (AI gateway, budgets), AI Content Safety Prompt Shields, Entra ID, Key Vault,
  Azure Monitor / Application Insights (OpenTelemetry), Terraform.
- Process: question → plan (filter chips, hit count, cost estimate, lawyer confirms) →
  portfolio check (register first; otherwise per-contract retrieval of top 2–3 sections + small
  model) → triage → remediation (internal notification, amendment draft, escalation) → signed
  amendment back into SharePoint → archive copy after approval → register shows "resolved".
- Build vs. buy: M365/SharePoint contract features and legal-AI/CLM vendors were considered;
  build where Riverty-specific rules, the storage boundary and evidence matter; buy the
  building blocks (Azure services).
- Innovation claims: register as a small structured environment for agents; MCP as interface
  to the register; completeness questions as map-reduce over all contracts with stored
  results; hybrid retrieval with contextual chunks; quote verification; evaluation as part of
  the product; (experiment) visual document retrieval for bad scans.

## 6. MVP scope and design canvas

In the MVP: text PDFs, scan PDFs and JPEGs with OCR (DE/EN); register with metadata, clause
catalogue, families, duplicates; clause types liability limitation, consumer terms in
checkout, DPA reference, legacy provider name, and for DPAs sub-processors and audit; hybrid
search; planner with filter chips, hit count and cost estimate; per-contract check with quote
verification and three states; triage, approval UI, audit log; cost per run; archive copy
with approval precondition and idempotency; recall/precision on the 8 gold questions.
Concept only: real SharePoint (local folder adapter), real storage API (mock with same
interface), pairwise comparison, full rule editor (3–5 example rules), company interests
beyond one example, Terraform (sketch), real user management (two simulated roles),
amendment generation (draft text only).

Design canvas per step (statuses to implement):
- A ingest: INGESTED, OCR_DONE, LOW_QUALITY, FAILED (built).
- B extraction: PRESENT, ABSENT, UNCLEAR per clause, model and prompt version per field (built).
- C planner: PLAN_PROPOSED, CONFIRMED, NEEDS_CLARIFICATION; the model proposes a plan via
  function calling from a fixed list of check types; filters validated against the schema;
  unclear question → ask back.
- D portfolio check: register first; exact name hits override the model; no legal assessment.
- E triage and approval: UNCLEAR or low confidence → REVIEW; critical rule → FOUR_EYES; else
  CONFIRM with sampling. Finding states FOUND, IN_REVIEW, CONFIRMED, REJECTED; audit who, when,
  decision, reason; metrics review load, override rate.
- F action and archive copy: tool gate (only after approval), idempotency via document hash;
  states REMEDIATION_PLANNED, AMENDMENT_SIGNED, RESOLVED, ARCHIVED; archive tool write-only
  (mock API in the prototype).

Demo scenarios: (1) negative search "Which merchant agreements do not contain a limitation of
liability?" – paraphrases, M14 injection, M18 scan; (2) legacy names with family – M05 not
reported because amendment M05-A renamed the provider; (3) approval and archive copy stored
exactly once; (4) cost and quality of the run.

## 7. Frontend and presentation

One React/TypeScript app with two modes:

| Mode | Purpose | Minutes |
| --- | --- | --- |
| Presentation | story along the key decisions | ~14 |
| Demo (Legal Workbench) | real end-to-end workflow on the test data | ~6 |

Chapters: 1 problem understood (calculator contracts × minutes, 3 min) · 2 process reimagined
(as-is/to-be toggle, 2) · 3 key decisions (flip cards: decision, alternative, reason, 4) ·
4 architecture (click a box → Azure service and decision, 2) · 5 live demo (6) · 6 adoption
and governance (3). Workbench screens: question with filter chips; result list with status,
confidence, coverage; evidence view (PDF with highlighted passage, quote, rationale, rule id);
approval (confirm/reject/correct with reason, four-eyes for critical rules); cost panel;
evaluation (recall, precision, consistency; ablation); outlook.

Design principles: evidence before verdict; three states distinguishable by icon and text,
not colour alone; no bulk confirmation of critical cases; cost and coverage always visible;
lawyers' language instead of tech terms. Show "model said" next to "register says".

Tech proposal: Vite + React + TS, Fluent UI React v9 (open), PDF.js with highlight via word
coordinates (`pages.words_json`), interactive SVG for the architecture, FastAPI backend,
Azure Static Web Apps for hosting, **PDF export of all chapters as fallback**. Open: one app
or two; Fluent UI or a leaner library. Language: English (decided).

## 8. Governance and adoption

Governance building blocks: roles (product owner from Legal; Legal owns rule catalogue and
approvals; engineering owns operations; data protection and security review changes);
regulation (EU AI Act: likely not high-risk, confirm with compliance; Art. 4 AI literacy since
2025-02-02 requires training; GDPR: DPIA, DPA with model provider, EU residency; DORA
third-party risk for cloud/model providers); data and access (SharePoint permissions in the
index, least privilege, storage write-only); output control (guardrail sandwich, quote check,
observations not verdicts, nothing external without approval); model and prompt lifecycle
(versioning, evaluation gate on the gold set before every change, staged rollout, rollback);
audit trail; monitoring (recall, override rate, review load, cost; monthly review with
Legal); incidents (classify, fix, add as regression test, re-check affected results); cost
(budgets and token limits in the gateway, cost per run visible).

Adoption in five phases: 1 co-design with 2–3 power users and baseline measurement · 2 pilot
in parallel to today's process · 3 enablement (hands-on training, reading evidence and
confidence, recognising automation bias – also fulfils AI Act Art. 4) · 4 rollout team by team
with champions · 5 improve (corrections flow into the gold set after review; Legal maintains
rules). Success metrics: weekly active lawyers, time per question vs. baseline, override rate,
share of questions without rework, satisfaction. Objections and answers: loss of control
(nothing takes effect without approval), trust (every statement has a highlighted source;
recall and precision shown openly), extra work (ask in own words, confirm filters with one
click, only unclear cases are reviewed), replacing lawyers (more output with the same team;
the drudgery goes, the judgement stays). Key sentence: "Governance is built in, not bolted on."

## 9. Prototype status (2026-10-30)

Built and pushed (see `docs/pipeline.md`): ingest with OCR, clause-boundary chunking, one
structured extraction per contract (gpt-4.1-mini), deterministic checks plus checker call,
families (duplicates, amendments, legacy names), FTS5 + embeddings and hybrid search with RRF,
register queries, inbox watch folder, cost and audit logging, `pipeline.show`, evaluation
with ablation. Results on the gold set: recall and precision 1.0 on Q1–Q8, metadata 27/27,
CUAD 19/20, ~$0.12 per full run of 47 documents; model alone (without checks) Q1 recall 0.80.
Failure cases F1–F8: `docs/failure-cases.md`.

Not built yet: Legal Workbench (API + UI), planner/agent, approval workflow, mock storage API
and archive copy, MCP server, handwritten example (Dima still has to provide a photo
`data/raw/handwritten/H01.jpg`), deletion sync, permissions, Azure deployment, held-out test
set, multi-run consistency.

Azure setup: Azure OpenAI resource in Sweden Central, pay-as-you-go with budget alert,
deployments `gpt-4.1-mini` and `text-embedding-3-small` (Global Standard; no quota yet for the
EU data zone or the newest models on this subscription). Endpoint and key only in `.env`.
**Regenerate the key after the interview.**

## 10. Schedule

| Day | Plan |
| --- | --- |
| Thu 29.10. | test data, MVP canvas, pipeline (done, a day early) |
| Fri 30.10. | local setup on the laptop, understanding and documentation, start of step 5 |
| Sat 31.10. | step 5 Legal Workbench (frontend) |
| Sun 1.11. | step 6 evaluation; architecture quiz (step 3) |
| Mon 2.11. | adoption concept, presentation website |
| Tue 3.11. | website finished, PDF fallback |
| Wed 4.11. | dress rehearsal with interview questions |

Interview date: within a week, exact date still open.

## 11. Where things live

| What | Where |
| --- | --- |
| Code, technical docs, failure cases | this repository |
| Working notes (German), decisions, roadmap, coverage matrix | Notion page "Riverty Case Study": https://app.notion.com/p/40887bb40ae281e481dff42ad094bbdf |
| Decisions database | https://app.notion.com/p/8735942414b74749ba51ec6a264661e1 (export: `decisions.md`) |
| Roadmap database | https://app.notion.com/p/e4f7595d31ea442a84d77efc3a4586ba |
| Coverage matrix "Bewertungspunkte & Abdeckung" | https://app.notion.com/p/a979019fc857463ca4fa7b0e97eff5ba |
| Prototype explained (German) | https://app.notion.com/p/40987bb40ae2819ab89afad3141ebc34 |
| Concepts explained (German) | https://app.notion.com/p/40987bb40ae281778fcede3b735eea22 |
| Architecture (target, German) | https://app.notion.com/p/40887bb40ae2811bbd34e2ba700c5aa9 |
| Problem analysis, approach, governance, MVP canvas, frontend plan, glossary | child pages of the Notion main page |
| Older working doc with diagrams | claude.ai artifact "Riverty Challenge" (secondary) |

Chat transcripts are not stored in the repository (they contained a key).
