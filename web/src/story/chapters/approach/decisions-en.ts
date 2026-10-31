// English one-line titles for the decisions marked "Hauptpunkt" (main point of the talk) in
// docs/context/decisions.md. Faithful translations of the German titles – nothing added. The
// decision explorer shows the German original next to them; a main point without an entry here
// shows "no English title yet" instead of a made-up one. Keyed by decision number.
export const DECISIONS_EN: Record<number, string> = {
  2: "Storage API write-only, only for contract copies, only after approval",
  3: "Goal: 100 % traceable instead of 100 % accurate",
  4: "Contract register before agent: compile, don't search",
  5: "Negative search checks every contract individually, with coverage shown",
  6: "Evidence required: every statement with a quote, checked deterministically against the source text",
  7: "Microsoft Agent Framework, tools as MCP servers",
  9: "Deterministic first, the LLM only for meaning (guardrail sandwich)",
  13: "Human-in-the-loop based on risk, not across the board",
  20: "Test data: a full mix of synthetic contracts, CUAD and handwriting",
  21: "A deviation is not a legal violation: the agent reports observations only",
  26: "EU region and EU data zone for the models in production",
  37: "Register extraction: one model call per contract over the whole text instead of top-k search",
  38: "Four eyes for the AI: an independent checker call (maker-checker) for every PRESENT finding",
  46: "Show real failure cases in the presentation: one main case (M08) with evidence, ablation and the failure catalogue",
  49: "Pipeline explorer in the frontend: every step with a diagram and a real example from the register",
  60: "Contract register as a matrix against the playbook (rows: contracts, columns: clauses), with the contract file as a side panel",
  64: "Model evaluation in fresh registers: repeated runs and model comparison; the production register stays untouched",
  65: "Production model stays gpt-4.1-mini: with the checks, gpt-4.1 adds nothing at five times the cost",
  67: "Show failures live: switch safeguards off and re-assess the stored model answers on a copy of the register",
  68: "Storyline of the website: 10 chapters in 5 acts (Why · How · Proof · Operate · Live), 17:15 min, Q1 as the common thread",
  72: "Held-out test set: 10 more CUAD contracts (random, fixed seed) and 2–4 contracts written by Dima, sealed before the first run",
  73: "Review directly in the contract register: a review belongs to the finding in one version (contract, clause, text hash, prompt version); runs reuse it; new: “Escalate”",
};
