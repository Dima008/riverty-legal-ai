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
| `pipeline/` | Ingestion, OCR, chunking, extraction with checks, families, hybrid index. See `docs/pipeline.md` |
| `api/` | FastAPI backend: planner, portfolio check, triage, approval, audit (in progress) |
| `web/` | React/TypeScript legal workbench (in progress) |
| `eval/` | `check_register.py`: gold questions, metadata and CUAD agreement; results in `eval/results/` |
| `docs/` | `pipeline.md` (how it works, results), `setup-windows.md` (local setup); ADRs in `docs/adr/` (in progress) |

## Target architecture (Azure)

Microsoft Agent Framework for orchestration, tools exposed as MCP servers, Azure AI Search
(hybrid), Azure Content Understanding for document processing, Microsoft Foundry for models,
Azure Container Apps, Entra ID, Key Vault, API Management as AI gateway, Terraform.

The prototype runs locally with the same interfaces (adapters), so each component can be
swapped for its Azure service.

## Quick start

```bash
pip install -r requirements.txt          # plus tesseract-ocr with deu + eng (Windows: docs/setup-windows.md)
cp .env.example .env                     # Azure OpenAI endpoint, key, deployments
python -m pipeline.run                   # build the register (idempotent)
python -m eval.check_register            # compare with the gold set
python -m pipeline.run --watch           # auto-ingest files dropped into data/inbox
```

## Status

- [x] Gold-standard test set
- [x] Pipeline (recall 1.0 on all 8 gold questions, ~$0.12 per full run)
- [ ] Backend
- [ ] Frontend
- [ ] Evaluation
