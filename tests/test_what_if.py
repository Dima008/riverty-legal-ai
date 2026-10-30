"""The what-if demo replays the register faithfully, and a safeguard only ever adds caution.
Invariants, not one model answer (F7): they hold for any register the pipeline builds."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from eval.check_register import evaluate
from eval.what_if import LAYER_IDS, MODEL_ALONE, _findings, every_layer, replay, what_if
from pipeline import config
from pipeline.store import connect

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)


@pytest.fixture(scope="module")
def con():
    c = connect()
    yield c
    c.close()


def test_replay_with_every_layer_on_is_the_register(con):
    """Nothing switched off -> exactly what users see. Fails if a check changed without --reassess."""
    copy = replay(con, frozenset())
    try:
        assert _findings(copy) == _findings(con)
    finally:
        copy.close()


def test_a_safeguard_only_ever_adds_caution(con):
    """Switching any layer off never finds more, never reports more, never sends more to a human."""
    base = {q["id"]: q["recall"] for q in evaluate(con)["questions"]}
    rows = every_layer(con)
    assert {row["layer"] for row in rows} == LAYER_IDS | {"model_alone"}
    for row in rows:
        assert all(row["recall"][q] <= base[q] for q in base), row["layer"]
        assert row["more_cautious"] == 0, row["layer"]


def test_model_alone_matches_the_evaluation_ablation(con):
    """Two independent computations of "the model alone" agree (eval.check_register._ablation)."""
    alone = {q["id"]: q["recall"][1] for q in what_if(con, MODEL_ALONE)["questions"]}
    for a in evaluate(con)["ablation"]:
        assert alone[a["id"]] == a["recall_model"], a["id"]


def test_what_if_api():
    layers = client.get("/what-if/layers").json()
    assert {layer["id"] for layer in layers["layers"]} == LAYER_IDS
    assert {row["layer"] for row in client.get("/what-if/every-layer").json()} == LAYER_IDS | {"model_alone"}
    r = client.get("/what-if", params={"off": "checker"}).json()
    assert r["off"] == ["checker"] and [q["id"] for q in r["questions"]] == [f"Q{i}" for i in range(1, 9)]
    assert client.get("/what-if", params={"off": "checker,nonsense"}).status_code == 422
