---
name: dev-log
description: Write the development-log entry for a finished work step in docs/dev-log.md - problem, cause, technique and why, rejected alternative, metric before and after. Use after every work step (one step = one commit that changes code or behaviour), before committing it. The pre-commit hook blocks code commits without an entry.
---

# Development-log entry

One entry per work step, newest at the top, in English (docs language). It is the material for
the presentation and for interview questions ("why did you do it this way?").

## Template

```
## YYYY-MM-DD · <short title>

- **Problem:** what did not work or was missing - from the user's point of view
- **Cause:** the root cause, not the symptom ("open" if not known yet)
- **Technique and why:** what we built and why this way (1-2 sentences)
- **Rejected alternative:** what we did not do, and why
- **Metric before → after:** measured numbers (recall, coverage, cost, time, tests, defects)
- **Links:** failure case F<n>, decision <n>, files
```

## Rules

1. Numbers come from real output of this step (evaluation, pytest, timings, screenshots,
   register queries). Never estimate. If nothing can be measured, write what was checked instead.
2. A new failure found during the step also goes to `docs/failure-cases.md` (skill
   `record-failure`); a new decision also to Notion "Entscheidungen" (skill `log-decision`).
3. Stage `docs/dev-log.md` together with the code. The pre-commit hook refuses commits that
   change `pipeline/`, `api/`, `eval/`, `tests/` or `web/src/` without it. Trivial commits
   (typo, formatting): `SKIP_DEVLOG=1 git commit ...`.
4. Keep each point to one or two lines; details belong in the commit message and the docs.
