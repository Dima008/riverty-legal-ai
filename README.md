# Riverty Legal AI – Contract Portfolio Assistant

Case study prototype for the Riverty interview challenge: helping the legal team answer
portfolio questions such as "Which contracts do not contain a limitation of liability?" or
"Which contracts still name a legacy company?" – with evidence for every answer and a human
approval step.

## Core idea

**Compile, don't search.** Every contract is processed once into a structured contract
register (metadata, clause catalogue, contract families, page-level evidence). Agents work
only on this register through narrow tools, between deterministic controls before and after
the model (guardrail sandwich). Nothing with external effect happens without approval.

## Repository layout

| Path | Content |
| --- | --- |
| `data/` | Gold-standard test set: synthetic merchant agreements and DPAs with known answers, a CUAD subset, 8 gold questions. See `data/README.md` |
| `tools/generate_goldset.py` | Deterministic generator for the synthetic test documents |
| `pipeline/` | Ingestion, OCR, extraction into the register, hybrid index (in progress) |
| `api/` | FastAPI backend: planner, portfolio check, triage, approval, audit (in progress) |
| `web/` | React/TypeScript legal workbench (in progress) |
| `eval/` | Recall and precision on the gold questions (in progress) |
| `docs/adr/` | Architecture decision records (in progress) |

## Target architecture (Azure)

Microsoft Agent Framework for orchestration, tools exposed as MCP servers, Azure AI Search
(hybrid), Azure Content Understanding for document processing, Microsoft Foundry for models,
Azure Container Apps, Entra ID, Key Vault, API Management as AI gateway, Terraform.

The prototype runs locally with the same interfaces (adapters), so each component can be
swapped for its Azure service.

## Status

- [x] Gold-standard test set
- [ ] Pipeline
- [ ] Backend
- [ ] Frontend
- [ ] Evaluation
