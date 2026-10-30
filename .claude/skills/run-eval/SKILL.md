---
name: run-eval
description: Run the register evaluation (gold questions Q1-Q8, ablation, metadata, CUAD), store the output in eval/results/ and compare it with the previous result. Use after every change to extraction, checks, catalogue, families or queries, and before committing such a change.
---

# Run the evaluation

1. Bring the register up to date:
   - `python -m pipeline.run` reprocesses only what changed (file hash + prompt version). A new
     `PROMPT_VERSION` re-extracts all 47 documents (about $0.12).
   - Only deterministic checks changed: `python -m pipeline.run --reassess` (no model cost).
2. Run `python -m eval.check_register` and keep the full output.
3. Compare with the newest file in `eval/results/`:
   - Recall below 1.00 on any of Q1-Q8 is a **regression**: stop, run the `record-failure` skill
     with the output as evidence, and do not report the change as done.
   - A change in precision, metadata or CUAD agreement: record it as well; it may be acceptable,
     Dima decides.
   - No change: say so in one line.
4. Save the output as `eval/results/<YYYY-MM-DD>_<PROMPT_VERSION>[_<label>].txt` when the prompt
   version, the checks or the result changed (label e.g. `reassess`, `run2`). Do not store
   identical repeats.
5. Report to Dima in German: recall and precision per question, the difference to the last
   result, cost of the run.
