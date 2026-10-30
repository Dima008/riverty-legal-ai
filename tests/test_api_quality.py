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


def test_evaluation_and_workbench_count_the_same():
    """Two code paths (eval queries and portfolio checks) must report the same contracts for Q1-Q8,
    whatever the model answered - otherwise the quality numbers would describe a different system."""
    live = {q["id"]: set(q["found"]) for q in client.get("/evaluation").json()["live"]["questions"]}
    for qid, plan in EXAMPLES.items():
        run = client.post("/runs", json={"plan": plan}).json()
        assert {r["doc_id"] for r in run["rows"]} == live[qid], qid
