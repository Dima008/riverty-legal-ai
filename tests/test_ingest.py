"""Ingest: which files become documents (F17), and a document read again is rebuilt completely
in the same run (F14). The re-ingest test works on a copy of the register and calls no model."""

from __future__ import annotations

import json
import sqlite3

import pytest

from pipeline import config, families, ingest
from pipeline.run import run_once
from pipeline.store import add_missing_columns


def _touch(folder, *names):
    folder.mkdir(parents=True, exist_ok=True)
    for name in names:
        (folder / name).write_bytes(b"x")


def test_only_the_pages_of_one_scan_share_a_document(tmp_path):
    """F17: a file named like an existing contract used to be merged into it and never read."""
    raw, inbox = tmp_path / "raw", tmp_path / "inbox"
    _touch(raw, "C05.txt", "M03_Bergmann.pdf", "M03_copy.pdf", "M03_notes.txt",
           "M20_Buerowelt_p1.jpg", "M20_Buerowelt_p2.jpg")
    _touch(inbox, "M03_Bergmann_v2.pdf")
    found = {d.doc_id: ([f.name for f in d.files], d.kind) for d in ingest.discover([raw, inbox])}
    assert found == {
        "C05": (["C05.txt"], "txt"),
        "M03": (["M03_Bergmann.pdf"], "pdf"),
        "M03_copy": (["M03_copy.pdf"], "pdf"),
        "M03_notes": (["M03_notes.txt"], "txt"),
        "M20": (["M20_Buerowelt_p1.jpg", "M20_Buerowelt_p2.jpg"], "image"),
        "M03_Bergmann_v2": (["M03_Bergmann_v2.pdf"], "pdf"),
    }


class EmbeddingsOnly:
    """Stand-in for the model adapter: embeddings only, so an extraction call would fail loudly."""

    def embed(self, texts: list[str], *, purpose: str = "embed") -> list[list[float]]:
        return [[0.0, 1.0, 0.0] for _ in texts]


@pytest.fixture
def register_copy(tmp_path):
    if not config.DB_PATH.exists():
        pytest.skip("register not built: python -m pipeline.run")
    try:
        ingest.check_ocr_languages()
    except Exception as exc:  # ingest refuses to start without the OCR language data (F2)
        pytest.skip(f"Tesseract not ready: {exc}")
    con = sqlite3.connect(tmp_path / "register.sqlite", check_same_thread=False)
    source = sqlite3.connect(config.DB_PATH.as_uri() + "?mode=ro", uri=True)
    source.backup(con)
    source.close()
    add_missing_columns(con)     # a copy of an older register gets today's columns
    con.row_factory = sqlite3.Row
    yield con
    con.close()


def _state(con, doc_id: str) -> dict:
    count = lambda sql: con.execute(sql, (doc_id,)).fetchone()[0]
    doc = con.execute("SELECT flags, duplicate_of, ingested_at FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    return {
        "chunks": count("SELECT COUNT(*) FROM chunks WHERE doc_id=?"),
        "search_rows": count("SELECT COUNT(*) FROM chunks_fts WHERE doc_id=?"),
        "embeddings": count("SELECT COUNT(*) FROM embeddings e JOIN chunks c ON c.chunk_id = e.chunk_id "
                            "WHERE c.doc_id=?"),
        "flags": json.loads(doc["flags"] or "[]"),
        "duplicate_of": doc["duplicate_of"],
        "ingested_at": doc["ingested_at"],
        "clauses": {r[0]: r[1] for r in con.execute("SELECT clause_type, status FROM clauses WHERE doc_id=?",
                                                     (doc_id,))},
    }


def test_forced_reingest_rebuilds_everything_derived(register_copy):
    """F14: `--only M01,M14 --force` used to leave both unsearchable, drop M14's injection flag and,
    at the next families pass, make the original M01 the copy of M15."""
    con = register_copy
    before = {d: _state(con, d) for d in ("M01", "M14")}
    result = run_once(con, EmbeddingsOnly(), only=["M01", "M14"], force=True, log=lambda *_: None)
    assert result["ingested"] == ["M01", "M14"] and result["extracted"] == []   # same text: no extraction
    for doc_id in ("M01", "M14"):
        after = _state(con, doc_id)
        assert after["search_rows"] == after["embeddings"] == after["chunks"] > 0, doc_id
        assert after["ingested_at"] == before[doc_id]["ingested_at"], doc_id
        assert after["clauses"] == before[doc_id]["clauses"], doc_id
    assert "prompt_injection_suspected" in _state(con, "M14")["flags"]
    families.run(con)   # the next families pass must keep the original (F6)
    assert _state(con, "M15")["duplicate_of"] == "M01" and _state(con, "M01")["duplicate_of"] is None
