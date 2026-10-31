"""Honest statistics in the evaluation (docs/research.md): a perfect score on a small gold set is
reported with how low the true recall could still be."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from eval.check_register import recall_lower_bound
from pipeline import config


def test_lower_bound_matches_the_exact_formula():
    assert recall_lower_bound(5, 5) == 0.54          # 0.05 ** (1/5) = 0.549, rounded down
    assert recall_lower_bound(28, 28) == 0.89        # 0.05 ** (1/28) = 0.899
    assert recall_lower_bound(0, 3) == 0.0 and recall_lower_bound(0, 0) == 1.0


def test_more_evidence_never_lowers_the_bound():
    bounds = [recall_lower_bound(n, n) for n in range(1, 40)]
    assert bounds == sorted(bounds)
    assert recall_lower_bound(4, 5) < recall_lower_bound(5, 5)


@pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")
def test_evaluation_reports_bounds_and_pass_k():
    e = TestClient(app).get("/evaluation").json()
    assert all(0 <= q["recall_lower_95"] <= q["recall"] for q in e["live"]["questions"])
    assert e["live"]["pooled"]["caveat"]
    for run in e["repeats"]:
        assert set(run["pass_k"]) == set(run["questions"]) and 0 < run["agreement"] <= 1
