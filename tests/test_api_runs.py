"""API step 2: runs over the whole portfolio, with coverage and triage.

Runs against the compiled register; the workflow database is a temporary file (conftest.py).
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from api.main import app
from pipeline import config

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)
GOLD = {q["id"]: set(q["expected"]) for q in json.loads((config.DATA / "gold_queries.json").read_text(encoding="utf-8"))}


def _run(plan: dict, user: str = "reviewer_a", question: str | None = None):
    return client.post("/runs", json={"question": question, "plan": plan}, headers={"X-User": user})


@pytest.mark.parametrize("example", client.get("/examples").json(), ids=lambda e: e["id"])
def test_every_gold_question_through_the_workbench(example):
    """The workbench answers Q1-Q8 exactly like the evaluation expects (recall and precision 1.0)."""
    run = _run(example["plan"], question=example["question"]).json()
    assert {r["doc_id"] for r in run["rows"]} == GOLD[example["id"]]


def test_coverage_accounts_for_every_contract_in_scope():
    run = _run({"check": "missing_clause",
                "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}}).json()
    cov = run["coverage"]
    assert cov["in_scope"] == cov["checked"] + len(cov["excluded"]) == 20
    assert {"doc_id": "M15", "reason": "duplicate of M01 - the original is checked"} in cov["excluded"]
    assert run["cost"]["model_calls"] == 0


def test_triage_follows_the_rule():
    """Decision 53: injection or contradicting metadata -> FOUR_EYES, unclear -> at least REVIEW."""
    run = _run({"check": "missing_clause",
                "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}}).json()
    rows = {r["doc_id"]: r for r in run["rows"]}
    assert rows["M14"]["triage"] == "FOUR_EYES"           # M14 carries an injected note
    for r in run["rows"]:
        if r["status"] == "UNCLEAR":
            assert r["triage"] in ("REVIEW", "FOUR_EYES"), r["doc_id"]
        assert r["sample"] is False or r["triage"] == "CONFIRM"


def test_invalid_plans_are_rejected():
    assert _run({"check": "drop_table"}).status_code == 422
    assert _run({"check": "missing_clause", "params": {}}).status_code == 422
    assert _run({"check": "governing_law_not", "params": {"law": "Germany"}}).status_code == 422


def test_unknown_user_is_rejected():
    assert _run({"check": "duplicates"}, user="mallory").status_code == 401


def test_run_is_stored_and_audited():
    run = _run({"check": "duplicates"}, user="reviewer_b", question="Are there duplicates?").json()
    assert client.get(f"/runs/{run['run_id']}").json() == run
    assert client.get("/runs").json()[0]["run_id"] == run["run_id"]
    event = client.get("/audit").json()[0]
    assert (event["actor"], event["action"], event["target"]) == ("reviewer_b", "run_created", run["run_id"])
    assert client.get("/runs/run-does-not-exist").status_code == 404


def test_a_run_over_a_selection_says_so_and_audits_it():
    """Decision 75: Legal chooses the contracts; the run covers exactly those and records the choice."""
    q1 = {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}
    run = _run({"check": "missing_clause", "params": q1,
                "scope": {"doc_ids": ["M01", "M03", "M08", "M15", "V01"], "filters": {"picked": "by hand"}}}).json()
    cov = run["coverage"]
    assert {r["doc_id"] for r in run["rows"]} == {"M03", "M08"} <= GOLD["Q1"]
    assert cov["in_scope"] == cov["checked"] + len(cov["excluded"]) == 5
    assert {e["doc_id"] for e in cov["excluded"]} == {"M15", "V01"}            # duplicate, other type - by name
    assert cov["selection"]["chosen"] == 5 and cov["selection"]["of"] == client.get("/summary").json()["documents"]
    event = client.get("/audit").json()[0]
    assert event["action"] == "run_created" and event["details"]["plan"]["scope"]["doc_ids"] == ["M01", "M03", "M08", "M15", "V01"]
    assert _run({"check": "duplicates", "scope": {"doc_ids": ["M01", "NOPE"]}}).status_code == 422
