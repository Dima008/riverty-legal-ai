---
name: record-failure
description: Record an error found while testing (pipeline, API, frontend, evaluation, setup) in docs/failure-cases.md. Use as soon as a run, test or demo produces a wrong result, a crash or surprising behaviour - also when the fix is not known yet.
---

# Record a failure case

Failures are part of the presentation (decision 46): every failure explains why a check layer
exists. Record it **when it happens**, before fixing it, so the evidence is the real output.

## 1. Classify

- **Quality failure (F-case):** a wrong, missing or unverifiable result about a contract (status,
  quote, metadata, family, search hit) or a check that misfires. Gets a full entry.
- **Engineering issue:** crash, rate limit, setup or tooling problem without a wrong result.
  Gets one row in the table "Engineering issues (short)".

## 2. F-case

1. Next number = highest `F<n>` in `docs/failure-cases.md` + 1.
2. Add a row to the overview table: `| F<n> | <case in one line> | <layer> | <caught by> | <status> |`
   - layer: ingest, chunking, extraction, checks, families, index/search, queries, api, frontend,
     definition
   - caught by: the check or test that noticed it, or "nobody at first - found by <how>"
   - status: `open`, `fixed`, `accepted`, `question for Legal`
3. Add a section `## F<n> - <title> (<doc ids>)` with the template
   **symptom -> evidence -> root cause -> layer -> fix -> proof -> reproduce**.
   - Evidence is verbatim output (command output, register row, `python -m pipeline.show <id>`)
     in a code block. Never paraphrase it.
   - Never put keys, endpoints or real contract data into the file.
   - Unknown parts stay `open`. Do not guess a root cause.
4. When the fix lands: fill in fix and proof (output after the fix) and update the status.

## 3. Afterwards

- Fix touches extraction, checks or catalogue: run the `run-eval` skill.
- Add the case to "What went wrong" of its station in `docs/explorer.md` (frontend content).
- Under **reproduce** name the command, and say whether an automated test exists
  ("automated test missing" otherwise).
- Tell Dima in German in one or two sentences: what failed, in which layer, current status.
