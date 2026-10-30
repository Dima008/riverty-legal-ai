"""Repeat the full extraction and measure how stable the results are, or compare another model.

    python -m eval.repeat --runs 3 --label consistency                       # model from .env
    python -m eval.repeat --runs 1 --label gpt-4.1 --chat-deployment gpt-4.1  # another deployment

Each run builds a fresh register in var/eval_runs/<date>_<label>/run<i>/ - the production register
is never touched - without the search index, which the evaluation does not need. Every run is
evaluated exactly like production (eval/results/<date>_<prompt>_<label>_run<i>.txt and .json).

The summary (..._<label>_summary.json) answers two questions:
- Does the answer change between runs? Recall and precision per question, per run.
- How stable are the findings? Of 47 documents x 5 clauses, how many kept the same status in
  every run - once for what the model said (model_status), once after the checks (status).
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

from pipeline import config

RUNS_DIR = config.VAR / "eval_runs"
RESULTS = config.ROOT / "eval" / "results"


def _run(run_dir: Path, deployment: str | None) -> dict:
    """Build one register from scratch and evaluate it. Returns the evaluation JSON plus timing."""
    run_dir.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "REGISTER_DB": str(run_dir / "register.sqlite"), "PYTHONIOENCODING": "utf-8"}
    if deployment:
        env["AZURE_OPENAI_CHAT_DEPLOYMENT"] = deployment
    started = time.monotonic()
    subprocess.run([sys.executable, "-m", "pipeline.run", "--no-index"], env=env, cwd=config.ROOT, check=True)
    seconds = round(time.monotonic() - started)
    json_path = run_dir / "evaluation.json"
    report = subprocess.run([sys.executable, "-m", "eval.check_register", "--json", str(json_path)], env=env,
                            cwd=config.ROOT, check=True, capture_output=True, text=True, encoding="utf-8").stdout
    (run_dir / "evaluation.txt").write_text(report, encoding="utf-8")
    return {**json.loads(json_path.read_text(encoding="utf-8")), "seconds": seconds}


def _findings(db: Path) -> dict[tuple[str, str], tuple[str, str]]:
    with sqlite3.connect(db) as con:
        return {(d, c): (m, s) for d, c, m, s in
                con.execute("SELECT doc_id, clause_type, model_status, status FROM clauses")}


def summarise(label: str, run_dirs: list[Path], results: list[dict]) -> dict:
    """Compare the runs: answers per question, and which findings flipped between runs."""
    findings = [_findings(d / "register.sqlite") for d in run_dirs]
    keys = sorted(set().union(*findings))
    flips, stable_model, stable_status = [], 0, 0
    for key in keys:
        model = [f.get(key, (None, None))[0] for f in findings]
        status = [f.get(key, (None, None))[1] for f in findings]
        stable_model += len(set(model)) == 1
        stable_status += len(set(status)) == 1
        if len(set(model)) > 1 or len(set(status)) > 1:
            flips.append({"doc_id": key[0], "clause_type": key[1], "model_status": model, "status": status})
    questions = {}
    for r in results:
        for q in r["questions"]:
            questions.setdefault(q["id"], {"recall": [], "precision": [], "found": []})
            questions[q["id"]]["recall"].append(q["recall"])
            questions[q["id"]]["precision"].append(q["precision"])
            questions[q["id"]]["found"].append(q["found"])
    return {
        "label": label,
        "runs": len(results),
        "config": results[0]["config"] if results else None,
        "findings": len(keys),
        "stable_model_status": stable_model,
        "stable_status": stable_status,
        "flips": flips,
        "questions": questions,
        "ablation_q1_recall_model": [next(a["recall_model"] for a in r["ablation"] if a["id"] == "Q1") for r in results],
        "cost_usd": [r["cost"]["cost_usd"] for r in results],
        "seconds": [r["seconds"] for r in results],
    }


def render(s: dict) -> str:
    lines = [f"Repeated runs: {s['label']} ({s['runs']} runs, {s['config']})",
             f"Findings with the same status in every run: model said {s['stable_model_status']}/{s['findings']}, "
             f"after the checks {s['stable_status']}/{s['findings']}",
             "", f"{'id':4} {'recall per run':>22} {'precision per run':>24}"]
    for qid, q in s["questions"].items():
        lines.append(f"{qid:4} {' '.join(f'{x:.2f}' for x in q['recall']):>22} {' '.join(f'{x:.2f}' for x in q['precision']):>24}")
    lines += ["", f"Q1 recall of the model alone per run: {s['ablation_q1_recall_model']}",
              f"Cost per run: {s['cost_usd']} USD · duration per run: {s['seconds']} s", "",
              f"Findings that changed between runs ({len(s['flips'])}):"]
    for f in s["flips"]:
        lines.append(f"  {f['doc_id']:6} {f['clause_type']:24} model said {f['model_status']} -> register {f['status']}")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description="Repeat the extraction and compare the runs")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--label", required=True, help="name of this experiment, e.g. consistency or gpt-4.1")
    ap.add_argument("--chat-deployment", help="Azure deployment to use instead of the one in .env")
    args = ap.parse_args()
    if args.chat_deployment:
        os.environ["AZURE_OPENAI_CHAT_DEPLOYMENT"] = args.chat_deployment
    if (args.chat_deployment or config.CHAT_DEPLOYMENT) not in config.PRICES_PER_MILLION:
        sys.exit(f"No price for {args.chat_deployment or config.CHAT_DEPLOYMENT} in config.PRICES_PER_MILLION")

    stem = f"{date.today().isoformat()}_{config.PROMPT_VERSION}_{args.label}"
    run_dirs, results = [], []
    for i in range(1, args.runs + 1):
        run_dir = RUNS_DIR / f"{date.today().isoformat()}_{args.label}" / f"run{i}"
        if (run_dir / "register.sqlite").exists():
            sys.exit(f"{run_dir} exists already - choose another label")
        print(f"run {i}/{args.runs} -> {run_dir}", flush=True)
        result = _run(run_dir, args.chat_deployment)
        run_dirs.append(run_dir)
        results.append(result)
        (RESULTS / f"{stem}_run{i}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        (RESULTS / f"{stem}_run{i}.txt").write_text((run_dir / "evaluation.txt").read_text(encoding="utf-8"),
                                                    encoding="utf-8")
    summary = summarise(args.label, run_dirs, results)
    (RESULTS / f"{stem}_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    report = render(summary)
    (RESULTS / f"{stem}_summary.txt").write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
