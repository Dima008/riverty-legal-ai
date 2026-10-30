"""Comparing two contracts: a duplicate against its original, and two contracts from one template."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from pipeline import config
from pipeline.compare import word_diff

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)


def test_duplicate_is_identical_text_in_another_file():
    c = client.get("/compare", params={"a": "M15", "b": "M01"}).json()
    assert c["relation"] == "duplicate" and c["same_text"] and not c["same_file"]
    assert c["similarity"] == 100.0
    assert c["summary"]["changed"] == c["summary"]["only_in_a"] == c["summary"]["only_in_b"] == 0
    assert all(row["same_status"] for row in c["clauses"])


def test_two_contracts_from_one_template_show_their_differences():
    c = client.get("/compare", params={"a": "M01", "b": "M02"}).json()
    assert c["relation"] == "unrelated" and 80 < c["similarity"] < 100
    assert c["summary"]["changed"] > 0
    changed = [s for s in c["sections"] if s["diff"]]
    assert any(seg["tag"] != "equal" for s in changed for seg in s["diff"])
    assert {"field": "counterparty_name", "a": "Nordlicht Outdoor GmbH", "b": "Casa Verde Living GmbH"} in c["metadata"]


def test_compare_rejects_bad_input():
    assert client.get("/compare", params={"a": "M01", "b": "M01"}).status_code == 422
    assert client.get("/compare", params={"a": "M01", "b": "X99"}).status_code == 404


def test_word_diff_marks_only_what_changed():
    segments = word_diff("liability is limited to the fees", "liability is capped at the fees")
    assert [s["tag"] for s in segments] == ["equal", "replace", "equal"]
    assert segments[1] == {"tag": "replace", "a": "limited to", "b": "capped at"}
