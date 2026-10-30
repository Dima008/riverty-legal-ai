"""API step 1: read-only register and pipeline-explorer endpoints.

Runs against the compiled register (var/register.sqlite; build it with `python -m pipeline.run`).
Model answers vary between runs (failure case F7), so these tests check what the checks
guarantee, not one particular model answer. No test calls a model: /search gets a fake adapter.
"""

from __future__ import annotations

import sqlite3

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.deps import get_adapter
from api.main import app
from pipeline import config
from pipeline.evidence import quote_boxes
from pipeline.store import connect

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)


def test_health_names_the_service():
    h = client.get("/health").json()
    assert h["service"] == "legal-workbench-api" and h["status"] == "ok" and h["register"]


def test_summary_covers_every_document():
    s = client.get("/summary").json()
    assert s["documents"] == 47 and s["extracted"] == 47
    assert s["duplicates"] == {"M15": "M01"}
    assert s["cost"]["cost_usd"] > 0


def test_unknown_document_is_404():
    assert client.get("/documents/X99").status_code == 404
    assert client.get("/documents/X99/findings").status_code == 404


def test_amendment_only_if_both_fields_agree():
    """F10: a document whose fields contradict each other stays a contract (visible to queries)."""
    docs = client.get("/documents").json()
    for d in docs:
        assert d["is_amendment"] == (d["doc_type"] == "amendment"), d["doc_id"]
        if d["is_amendment"] and d["family_id"] == d["doc_id"]:
            assert "amendment_base_not_in_register" in d["flags"], d["doc_id"]


def test_m08_is_never_reported_as_having_a_liability_cap():
    """F1: M08 has no limitation of liability. If the model claims one, a layer must catch it."""
    findings = {f["clause_type"]: f for f in client.get("/documents/M08/findings").json()}
    f = findings["liability_limitation"]
    assert f["status"] in ("ABSENT", "UNCLEAR")
    assert [layer["layer"] for layer in f["layers"]][::len(f["layers"]) - 1] == ["model", "register"]
    if f["model_status"] == "PRESENT":
        assert f["changed_by_checks"]
        assert any(layer.get("passed") is False for layer in f["layers"])


def test_quote_across_page_break_is_fully_highlighted():
    """M09: the clause starts on page 2 and ends on page 3, with a 17-word page header in between."""
    quote = ("7.2 In all other cases, each party's total liability arising out of or in connection with this "
             "Agreement shall be limited to the total fees paid by the Merchant to the Provider in the twelve "
             "(12) months preceding the event giving rise to the claim.")
    con = connect()
    try:
        r = quote_boxes(con, "M09", quote, 2)
    finally:
        con.close()
    assert r["coverage"] == 100
    assert [(p["page"], len(p["boxes"])) for p in r["pages"]] == [(2, 20), (3, 25)]


def test_highlight_endpoint_finds_present_quotes_on_the_page():
    for f in client.get("/documents/M09/findings").json():
        if f["status"] == "PRESENT":
            h = client.get(f"/documents/M09/findings/{f['clause_type']}/highlight").json()
            assert h["coverage"] >= 80 and h["pages"], f["clause_type"]


def test_page_words_and_rendered_image():
    p = client.get("/documents/M09/pages/1").json()
    assert p["source"] == "text_layer" and p["words"] and p["has_image"]
    img = client.get("/documents/M09/pages/1/image")
    assert img.headers["content-type"] == "image/png" and img.content[:4] == b"\x89PNG"


def test_jpeg_scan_is_served_as_is_and_text_documents_have_no_image():
    assert client.get("/documents/M20/pages/2/image").headers["content-type"] == "image/jpeg"
    assert client.get("/documents/C01/pages/1/image").status_code == 404
    assert client.get("/documents/M09/pages/9/image").status_code == 404


def test_chunks_keep_the_clause_whole_where_fixed_windows_cut_it():
    c = client.get("/documents/M09/chunks", params={"compare": "fixed", "size": 2000}).json()
    liability = next(x for x in c["chunks"] if x["section_title"] == "7. Liability")
    assert (liability["page_start"], liability["page_end"]) == (1, 3)
    assert "7. Liability" in c["fixed"]["cut_sections"]


def test_prompt_marks_the_contract_as_untrusted_data():
    p = client.get("/documents/M08/prompt").json()
    system, user = (m["content"] for m in p["parts"][0]["messages"])
    assert "untrusted data" in system
    assert '<contract id="M08">' in user and "[S1]" in user


class FakeAdapter:
    """Returns a stored chunk embedding as the question vector: no model call, no cost."""

    def __init__(self, vector: list[float]):
        self.vector = vector

    def embed(self, texts: list[str], *, purpose: str = "embed") -> list[list[float]]:
        return [self.vector]


def test_search_returns_both_rankings_and_the_fused_one():
    with sqlite3.connect(config.DB_PATH) as con:
        blob = con.execute("SELECT vector FROM embeddings WHERE chunk_id='M09:008'").fetchone()[0]
    app.dependency_overrides[get_adapter] = lambda: FakeAdapter(np.frombuffer(blob, dtype=np.float32).tolist())
    try:
        r = client.get("/search", params={"q": "total fees paid in the twelve months", "k": 5}).json()
    finally:
        app.dependency_overrides.clear()
    assert r["vector"][0]["chunk_id"] == "M09:008" and r["vector"][0]["similarity"] > 0.99
    assert r["bm25"] and len(r["fused"]) == 5
