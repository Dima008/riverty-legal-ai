"""Quality view: the evaluation is served as data and measures exactly what the workbench answers."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.workflow import EXAMPLES
from pipeline import config

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)


def test_evaluation_is_served_as_data():
    e = client.get("/evaluation").json()
    live = e["live"]
    assert [q["id"] for q in live["questions"]] == [f"Q{i}" for i in range(1, 9)]
    assert {a["id"] for a in live["ablation"]} == {"Q1", "Q3", "Q4", "Q6", "Q7"}
    assert live["config"]["documents"] == 47 and live["config"]["extraction"]
    assert live["cuad"]["n"] == 20 and "caveat" in e


def test_monitoring_adds_up():
    m = client.get("/monitoring").json()
    calls = m["model_calls"]
    assert round(sum(p["cost_usd"] for p in calls["by_purpose"].values()), 3) == round(calls["total"]["cost_usd"], 3)
    assert sum(p["calls"] for p in calls["by_purpose"].values()) == calls["total"]["calls"]
    for p in calls["by_purpose"].values():
        assert p["p50_ms"] <= p["p95_ms"] <= p["max_ms"]
    assert m["pipeline"]["documents"] == 47 and m["pipeline"]["flags"].get("prompt_injection_suspected") == 1


def test_monitoring_counts_reviews_and_overrides():
    """One run, one confirmation and one rejection: half of the decisions overrule the system."""
    run = client.post("/runs", json={"plan": EXAMPLES["Q1"]}, headers={"X-User": "reviewer_a"}).json()
    rid = run["run_id"]
    client.post(f"/runs/{rid}/reviews", headers={"X-User": "reviewer_a"},
                json={"doc_id": "M08", "decision": "CONFIRMED", "reason": "6.2 is data protection, no cap"})
    client.post(f"/runs/{rid}/reviews", headers={"X-User": "reviewer_a"},
                json={"doc_id": "M10", "decision": "REJECTED", "reason": "test: reviewer disagrees"})
    w = client.get("/monitoring").json()["workflow"]
    assert w["runs"] == 1 and w["rows"] == 5
    assert w["decisions"] == {"CONFIRMED": 1, "REJECTED": 1} and w["override_rate"] == 0.5
    assert w["open"] == 3                                   # M03, M14, M18 still open


def test_evaluation_and_workbench_count_the_same():
    """Two code paths (eval queries and portfolio checks) must report the same contracts for Q1-Q8,
    whatever the model answered - otherwise the quality numbers would describe a different system."""
    live = {q["id"]: set(q["found"]) for q in client.get("/evaluation").json()["live"]["questions"]}
    for qid, plan in EXAMPLES.items():
        run = client.post("/runs", json={"plan": plan}).json()
        assert {r["doc_id"] for r in run["rows"]} == live[qid], qid
