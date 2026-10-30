"""Workbench workflow, step 2: run a confirmed plan over the whole portfolio and keep the result.

A run is a snapshot: what was asked, which plan was confirmed, every contract in scope (checked
or excluded with reason), the reported rows with triage, and the cost. Reviews and the archive
copy (step 3) refer to a run, so the audit always shows what the reviewer actually saw.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from pipeline import config, portfolio, queries
from pipeline.store import now

from .deps import USERS, current_user, get_con
from .review import attach_reviews
from .workbench import audit, get_wb, load_run

router = APIRouter()

# The gold questions as ready-made examples (planner without a model first, decision 55)
EXAMPLES = {
    "Q1": {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}},
    "Q2": {"check": "legacy_names", "params": {}},
    "Q3": {"check": "missing_clause", "params": {"clause_type": "consumer_terms_checkout", "doc_type": "merchant_agreement"}},
    "Q4": {"check": "missing_clause", "params": {"clause_type": "dpa_reference", "doc_type": "merchant_agreement"}},
    "Q5": {"check": "governing_law_not", "params": {"law": "DE", "doc_type": "merchant_agreement"}},
    "Q6": {"check": "missing_clause", "params": {"clause_type": "audit_clause", "doc_type": "data_processing_agreement"}},
    "Q7": {"check": "missing_clause", "params": {"clause_type": "subprocessor_clause", "doc_type": "data_processing_agreement"}},
    "Q8": {"check": "duplicates", "params": {}},
}


class Plan(BaseModel):
    check: str = Field(..., examples=["missing_clause"])
    params: dict = Field(default_factory=dict,
                         examples=[{"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}])


class RunRequest(BaseModel):
    question: str | None = Field(None, max_length=1000,
                                 examples=["Which merchant agreements do not contain a limitation of liability?"])
    plan: Plan


@router.get("/users")
def list_users() -> dict:
    """The simulated reviewers for the UI's user switch (decision 54)."""
    return USERS


@router.get("/checks")
def list_checks() -> dict:
    """The fixed list of check types with their allowed parameters."""
    return portfolio.CHECKS


@router.get("/examples")
def list_examples() -> list[dict]:
    """Example questions with the plan that answers them (the gold questions Q1-Q8)."""
    gold = json.loads((config.DATA / "gold_queries.json").read_text(encoding="utf-8"))
    return [{"id": q["id"], "question": q["question_en"], "question_de": q["question_de"],
             "use_case": q["use_case"], "plan": EXAMPLES[q["id"]]} for q in gold if q["id"] in EXAMPLES]


@router.post("/runs", status_code=201)
def create_run(req: RunRequest, user: str = Depends(current_user), con: sqlite3.Connection = Depends(get_con),
               wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    """Run a confirmed plan over every contract in scope. Register query only: no model call."""
    run_id = f"run-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}"
    try:
        result = portfolio.run_check(con, req.plan.model_dump(), run_id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    run = {
        "run_id": run_id, "created_at": now(), "created_by": user, "question": req.question,
        "prompt_version": config.PROMPT_VERSION,
        "cost": {"model_calls": 0, "usd": 0.0,
                 "note": "answered from the register; reading the contracts was paid once at ingest",
                 "register_total_usd": queries.costs(con)["cost_usd"]},
        **result,
    }
    wb.execute("INSERT INTO runs (run_id, created_at, created_by, question, plan_json, result_json, prompt_version,"
               " model_calls, cost_usd) VALUES (?,?,?,?,?,?,?,?,?)",
               (run_id, run["created_at"], user, req.question, json.dumps(result["plan"]),
                json.dumps(run, ensure_ascii=False), config.PROMPT_VERSION, 0, 0.0))
    audit(wb, user, "run_created", run_id, plan=result["plan"], reported=len(result["rows"]),
          coverage={k: v for k, v in result["coverage"].items() if k != "excluded"})
    wb.commit()
    return attach_reviews(wb, run)


@router.get("/runs")
def list_runs(wb: sqlite3.Connection = Depends(get_wb)) -> list[dict]:
    out = []
    for r in wb.execute("SELECT run_id, created_at, created_by, question, result_json FROM runs ORDER BY created_at DESC"):
        res = json.loads(r["result_json"])
        out.append({"run_id": r["run_id"], "created_at": r["created_at"], "created_by": r["created_by"],
                    "question": r["question"], "plan": res["plan"], "coverage": res["coverage"],
                    "triage": res["triage"]})
    return out


@router.get("/runs/{run_id}")
def get_run(run_id: str, wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    """The run as it was shown (snapshot) plus the current review state of every row."""
    run = load_run(wb, run_id)
    if run is None:
        raise HTTPException(404, f"run {run_id} not found")
    return attach_reviews(wb, run)


@router.get("/audit")
def get_audit(limit: int = 200, wb: sqlite3.Connection = Depends(get_wb)) -> list[dict]:
    """Human and workflow actions, newest first: who, when, what, details."""
    rows = wb.execute("SELECT ts, actor, action, target, details_json FROM audit ORDER BY id DESC LIMIT ?",
                      (min(limit, 1000),)).fetchall()
    return [{"ts": r["ts"], "actor": r["actor"], "actor_name": USERS.get(r["actor"], r["actor"]),
             "action": r["action"], "target": r["target"], "details": json.loads(r["details_json"])} for r in rows]
