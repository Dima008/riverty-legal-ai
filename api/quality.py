"""Quality and operations, no model call:
- /evaluation: the evaluation against the gold set, live from the register and from stored runs
  in eval/results/*.json (repeated runs, other models);
- /monitoring: what operations watches - cost, tokens and latency of every model call, the state
  of the pipeline, the review workload and how often reviewers overrule the system.
"""

from __future__ import annotations

import json
import sqlite3
from collections import Counter

from fastapi import APIRouter, Depends

from eval.check_register import evaluate
from pipeline import config, queries
from pipeline.store import now

from .deps import get_con
from .review import attach_reviews
from .workbench import get_wb

router = APIRouter()

RESULTS = config.ROOT / "eval" / "results"
CAVEAT = ("Prompt and checks were improved on the same gold set they are measured on; "
          "a held-out set that nobody looked at before the measurement follows in step 6.")


def _summary(name: str, data: dict) -> dict:
    """The headline numbers of one stored run."""
    questions = data.get("questions", [])
    return {
        "file": name,
        "generated_at": data.get("generated_at"),
        "config": data.get("config"),
        "recall_min": min((q["recall"] for q in questions), default=None),
        "precision_min": min((q["precision"] for q in questions), default=None),
        "ablation": data.get("ablation"),
        "cuad": {k: data.get("cuad", {}).get(k) for k in ("n", "tp", "tn", "fp", "fn", "unclear")},
        "cost_usd": data.get("cost", {}).get("cost_usd"),
    }


def _load(path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return None


def stored_runs() -> list[dict]:
    """Every stored evaluation run, oldest first (files without gold-question results are skipped)."""
    runs = []
    for path in sorted(RESULTS.glob("*.json")):
        data = _load(path)
        if data and isinstance(data.get("questions"), list):
            runs.append(_summary(path.name, data))
    return runs


def repeated_runs() -> list[dict]:
    """Summaries of repeated runs and model comparisons written by eval/repeat.py."""
    return [d for p in sorted(RESULTS.glob("*_summary.json")) if (d := _load(p)) and "stable_status" in d]


@router.get("/evaluation")
def evaluation(con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Live evaluation of the current register, every stored run and the repeated-run summaries."""
    return {"live": evaluate(con), "runs": stored_runs(), "repeats": repeated_runs(), "caveat": CAVEAT}


# ---------------------------------------------------------------------------- monitoring
def _percentile(values: list[int], p: float) -> int | None:
    """Nearest-rank percentile; enough for a dashboard, no numpy needed."""
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, round(p / 100 * len(ordered) + 0.5) - 1))]


def _model_calls(con) -> dict:
    rows = con.execute("SELECT purpose, model, latency_ms, cost_usd, prompt_tokens, completion_tokens, cached_tokens,"
                       " substr(ts, 1, 10) AS day FROM llm_calls").fetchall()
    by_purpose: dict[str, dict] = {}
    for r in rows:
        p = by_purpose.setdefault(r["purpose"], {"model": r["model"], "calls": 0, "cost_usd": 0.0, "prompt_tokens": 0,
                                                 "completion_tokens": 0, "cached_tokens": 0, "latencies": []})
        p["calls"] += 1
        p["cost_usd"] += r["cost_usd"] or 0
        p["prompt_tokens"] += r["prompt_tokens"] or 0
        p["completion_tokens"] += r["completion_tokens"] or 0
        p["cached_tokens"] += r["cached_tokens"] or 0
        if r["latency_ms"] is not None:
            p["latencies"].append(r["latency_ms"])
    for p in by_purpose.values():
        lat = p.pop("latencies")
        p.update(cost_usd=round(p["cost_usd"], 4), p50_ms=_percentile(lat, 50), p95_ms=_percentile(lat, 95),
                 max_ms=max(lat) if lat else None)
    days: dict[str, dict] = {}
    for r in rows:
        d = days.setdefault(r["day"], {"day": r["day"], "calls": 0, "cost_usd": 0.0})
        d["calls"] += 1
        d["cost_usd"] += r["cost_usd"] or 0
    return {"total": queries.costs(con), "by_purpose": by_purpose,
            "by_day": [{**d, "cost_usd": round(d["cost_usd"], 4)} for d in sorted(days.values(), key=lambda d: d["day"])]}


def _pipeline(con) -> dict:
    docs = con.execute("SELECT status, flags FROM documents").fetchall()
    flags = Counter(f.split(":")[0] for d in docs for f in json.loads(d["flags"] or "[]"))
    failed = con.execute("SELECT COUNT(*) FROM audit_log WHERE action = 'extraction_failed'").fetchone()[0]
    last = con.execute("SELECT MAX(ingested_at) FROM documents").fetchone()[0]
    return {
        "documents": len(docs),
        "extracted": con.execute("SELECT COUNT(*) FROM metadata").fetchone()[0],
        "by_status": dict(Counter(d["status"] for d in docs)),
        "flags": dict(flags),
        "extraction_failures": failed,
        "last_ingest": last,
        "prompt_versions": [r[0] for r in con.execute("SELECT DISTINCT prompt_version FROM metadata")],
    }


def _workflow(wb) -> dict:
    """Review workload and how often people overrule the system (rejected or corrected)."""
    states, triage = Counter(), Counter()
    runs = wb.execute("SELECT result_json FROM runs").fetchall()
    for r in runs:
        run = attach_reviews(wb, json.loads(r["result_json"]))
        for row in run["rows"]:
            states[row["review"]["state"]] += 1
            triage[row["triage"]] += 1
    decisions = dict(Counter(r[0] for r in wb.execute("SELECT decision FROM reviews")))
    decided = sum(decisions.values())
    overruled = decisions.get("REJECTED", 0) + decisions.get("CORRECTED", 0)
    return {
        "runs": len(runs),
        "rows": sum(states.values()),
        "triage": dict(triage),
        "review_states": dict(states),
        "open": states["FOUND"] + states["IN_REVIEW"],
        "disputed": states["DISPUTED"],
        "decisions": decisions,
        "override_rate": round(overruled / decided, 3) if decided else None,
        "archive_copies": wb.execute("SELECT COUNT(*) FROM archive_copies").fetchone()[0],
        "archive_refused": wb.execute("SELECT COUNT(*) FROM audit WHERE action = 'archive_refused'").fetchone()[0],
    }


@router.get("/monitoring")
def monitoring(con: sqlite3.Connection = Depends(get_con), wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    """Operations at a glance: model calls (cost, tokens, latency), pipeline state, review workload,
    override rate and the quality of every stored evaluation run."""
    return {
        "as_of": now(),
        "model_calls": _model_calls(con),
        "pipeline": _pipeline(con),
        "workflow": _workflow(wb),
        "quality": stored_runs(),
    }
