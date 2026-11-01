"""The register as the tool sees it while it changes (spec A1, A2): where each document stands
(`stage`: reading, ready, failed), when it arrived, and `GET /changes` - the register version
(the highest audit_log id) with the pipeline events since a given version. On a copy of the
register; a new contract N01 is written by hand, the way ingest, extraction and the families
step would write it. No model call, no OCR.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from api.deps import get_con
from api.main import app
from pipeline import config, families, forget
from pipeline.store import audit, now


@pytest.fixture
def register(tmp_path):
    if not config.DB_PATH.exists():
        pytest.skip("register not built: python -m pipeline.run")
    con = sqlite3.connect(tmp_path / "register.sqlite", check_same_thread=False)
    source = sqlite3.connect(config.DB_PATH.as_uri() + "?mode=ro", uri=True)
    source.backup(con)
    source.close()
    con.row_factory = sqlite3.Row
    yield con
    con.close()


@pytest.fixture
def client(register):
    """The API on the register copy (the workflow database is temporary, conftest.py)."""
    def copy():
        yield register
    app.dependency_overrides[get_con] = copy
    yield TestClient(app)
    app.dependency_overrides.pop(get_con, None)


def _arrive(con, doc_id: str = "N01") -> None:
    """What ingest writes for a poor photo scan: the document row, its text and the audit row."""
    text = f"SYNTHETIC TEST DOCUMENT\n{doc_id} - merchant agreement with Testpartner {doc_id} GmbH."
    con.execute("INSERT INTO documents (doc_id, source_path, file_sha256, text_sha256, format, page_count,"
                " ocr_mean_conf, status, family_id, flags, ingested_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (doc_id, f"data/inbox/{doc_id}.jpg", f"file-{doc_id}", f"text-{doc_id}", "jpeg", 1, 61.3,
                 "LOW_QUALITY", doc_id, "[]", now()))
    con.execute("INSERT INTO doc_text VALUES (?,?,?)", (doc_id, text, "[0]"))
    audit(con, "pipeline", "ingested", doc_id, format="jpeg", pages=1, status="LOW_QUALITY", ocr_mean_conf=61.3)
    con.commit()


def _read(con, doc_id: str = "N01") -> None:
    """What the extraction writes: metadata for today's text, the findings and the audit row."""
    con.execute("INSERT INTO metadata (doc_id, doc_type, title, counterparty_name, governing_law, is_amendment,"
                " text_sha256, prompt_version) VALUES (?,?,?,?,?,?,?,?)",
                (doc_id, "merchant_agreement", "Merchant agreement", f"Testpartner {doc_id} GmbH", "DE", 0,
                 f"text-{doc_id}", config.PROMPT_VERSION))
    con.execute("INSERT INTO clauses (doc_id, clause_type, status, model_status, confidence, flags)"
                " VALUES (?, 'liability_limitation', 'ABSENT', 'ABSENT', 0.5, '[]')", (doc_id,))
    audit(con, "pipeline", "extracted", doc_id, model="gpt-4.1-mini", prompt_version=config.PROMPT_VERSION)
    con.commit()


def _stage(client, doc_id: str = "N01") -> str:
    """The stage as all three endpoints show it - they must agree."""
    listed = next(d for d in client.get("/documents").json() if d["doc_id"] == doc_id)
    matrix = next(r for r in client.get("/matrix").json()["rows"] if r["doc_id"] == doc_id)
    one = client.get(f"/documents/{doc_id}").json()
    assert listed["stage"] == matrix["stage"] == one["stage"], doc_id
    return one["stage"]


def _audit_rows(con) -> int:
    return con.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]


# ---------------------------------------------------------------------------- stage and arrival (A1)
def test_every_document_is_ready_with_its_arrival_time(client):
    listed = {d["doc_id"]: d for d in client.get("/documents").json()}
    matrix = {r["doc_id"]: r for r in client.get("/matrix").json()["rows"]}
    assert set(listed) == set(matrix)
    for doc_id, d in listed.items():
        one = client.get(f"/documents/{doc_id}").json()
        assert d["stage"] == matrix[doc_id]["stage"] == one["stage"] == "ready", doc_id
        assert d["ingested_at"] == matrix[doc_id]["ingested_at"] == one["ingested_at"], doc_id
        assert datetime.fromisoformat(d["ingested_at"]).tzinfo is not None, doc_id    # ISO, with the time zone
        assert one["extracted_at"] == one["metadata"]["extracted_at"], doc_id
        assert {"doc_id", "doc_type", "status", "flags"} <= set(d)                # what the live-add card reads


def test_a_new_contract_is_reading_until_its_family_step(register, client):
    _arrive(register)
    listed = next(d for d in client.get("/documents").json() if d["doc_id"] == "N01")
    assert listed["doc_type"] is None and listed["status"] == "LOW_QUALITY"      # still listed, type not known yet
    assert _stage(client) == "reading"
    row = next(r for r in client.get("/matrix").json()["rows"] if r["doc_id"] == "N01")
    assert row["cells"] == {} and row["former_names"]["not_ruled_out"] is True  # a poor scan, already before the model
    _read(register)
    assert _stage(client) == "reading"                                        # findings stored, families not rebuilt
    families.run(register)
    assert _stage(client) == "ready"


def test_a_failed_extraction_is_failed_not_reading(register, client):
    _arrive(register)
    audit(register, "pipeline", "extraction_failed", "N01", error="Connection error.")
    register.commit()
    assert _stage(client) == "failed"                                         # not "reading" for good
    _read(register)                                                           # the next pass reads it
    families.run(register)
    assert _stage(client) == "ready"
    register.execute("UPDATE documents SET status='FAILED' WHERE doc_id='N01'")
    register.commit()
    assert _stage(client) == "failed"


def test_changed_text_is_reading_again(register, client):
    """The stored findings belong to an older text: the contract waits for the model again. If that
    read fails, the pass re-checks the old findings (pipeline/run.py, an `extracted` row) - they are
    still not findings of today's text, so the contract stays failed."""
    assert _stage(client, "M01") == "ready"
    register.execute("UPDATE documents SET text_sha256='a changed text' WHERE doc_id='M01'")
    audit(register, "pipeline", "ingested", "M01", format="pdf_text", pages=2, status="INGESTED", ocr_mean_conf=None)
    register.commit()
    assert _stage(client, "M01") == "reading"
    audit(register, "pipeline", "extraction_failed", "M01", error="Connection error.")
    audit(register, "pipeline:reassess", "extracted", "M01", model="gpt-4.1-mini", prompt_version=config.PROMPT_VERSION)
    register.commit()
    families.run(register)
    assert _stage(client, "M01") == "failed"


# ---------------------------------------------------------------------------- GET /changes (A2)
def test_changes_version_and_events(register, client, tmp_path, monkeypatch):
    start = client.get("/changes").json()
    assert start["version"] == register.execute("SELECT MAX(id) FROM audit_log").fetchone()[0]
    assert start["events"] == [] and start["reset"] is False and start["more"] is False   # the cheap poll
    assert start["documents"] == register.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    assert datetime.fromisoformat(start["now"]).tzinfo is not None

    _arrive(register)
    after = client.get("/changes", params={"after": start["version"]}).json()
    assert after["version"] == start["version"] + 1 and after["documents"] == start["documents"] + 1
    assert after["events"] == [{"id": after["version"], "ts": after["events"][0]["ts"], "action": "ingested",
                                "doc_id": "N01", "details": {"format": "jpeg", "pages": 1, "status": "LOW_QUALITY",
                                                             "ocr_mean_conf": 61.3}}]

    rows = _audit_rows(register)
    for path in ("/changes", f"/changes?after={start['version']}", "/documents", "/matrix", "/documents/N01"):
        assert client.get(path).status_code == 200, path
    assert _audit_rows(register) == rows                                      # a GET writes nothing

    (tmp_path / "inbox").mkdir()
    monkeypatch.setattr(config, "SOURCE_DIRS", [])                            # N01 has no file to protect
    monkeypatch.setattr(config, "WATCH_DIR", tmp_path / "inbox")
    forget.forget(register, ["N01"], log=lambda *_: None)
    gone = client.get("/changes", params={"after": after["version"]}).json()
    assert [(e["action"], e["doc_id"]) for e in gone["events"]] == [("forgotten", "N01")]   # families_built is no event
    stored = register.execute("SELECT details_json FROM audit_log WHERE action='forgotten' AND target='N01'").fetchone()
    assert "files_removed" in stored[0]                                       # the audit row has the file list ...
    assert gone["events"][0]["details"] == {}                                 # ... /changes never shows a path
    assert "N01" not in {d["doc_id"] for d in client.get("/documents").json()}


def test_changes_reset_when_the_cursor_is_ahead(client):
    """The client saw a higher version than the register has: the register was rebuilt."""
    version = client.get("/changes").json()["version"]
    ahead = client.get("/changes", params={"after": version + 10}).json()
    assert ahead["reset"] is True and ahead["events"] == [] and ahead["version"] == version


def test_changes_are_capped_at_the_newest_200(register, client):
    version = client.get("/changes").json()["version"]
    for i in range(205):
        audit(register, "pipeline", "extraction_failed", f"X{i:03}", error="x" * 300)
    register.commit()
    capped = client.get("/changes", params={"after": version}).json()
    ids = [e["id"] for e in capped["events"]]
    assert capped["more"] is True and len(ids) == 200
    assert ids == sorted(ids) and ids[-1] == capped["version"]                # the newest 200, oldest first
    assert len(capped["events"][0]["details"]["error"]) == 200                # an error is cut to 200 characters
    assert client.get("/changes", params={"after": -1}).status_code == 422
