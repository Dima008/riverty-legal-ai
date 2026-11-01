"""F19, decision 89: a contract whose scan is below the OCR threshold, and where the exact
legacy-name match finds nothing, is never counted "without hits". It is a REVIEW row "cannot be
ruled out - poor scan" for a person - in the portfolio check, the register query, the evaluation
and the API. On a copy of the register; no model call (the H01 test reads the page with
Tesseract and writes the metadata the model would write).
"""

from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from api.deps import get_con
from api.main import app
from eval import check_register
from pipeline import chunking, config, families, ingest, portfolio
from pipeline.store import add_missing_columns

Q2 = {"check": "legacy_names", "params": {}}
REASON = "cannot be ruled out - poor scan (OCR confidence 61 %, threshold 70 %) - a person checks"


@pytest.fixture
def register(tmp_path):
    if not config.DB_PATH.exists():
        pytest.skip("register not built: python -m pipeline.run")
    con = sqlite3.connect(tmp_path / "register.sqlite", check_same_thread=False)
    source = sqlite3.connect(config.DB_PATH.as_uri() + "?mode=ro", uri=True)
    source.backup(con)
    source.close()
    add_missing_columns(con)     # a copy of an older register gets today's columns
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


def _poor_scan(con) -> str:
    """Mark a checked merchant agreement without any former name as a poor scan (OCR 61.3)."""
    run = portfolio.run_check(con, Q2)
    taken = ({r["doc_id"] for r in run["rows"]} | {e["doc_id"] for e in run["coverage"]["excluded"]}
             | {r[0] for r in con.execute("SELECT doc_id FROM name_hits")})
    doc = next(r[0] for r in con.execute("SELECT doc_id FROM metadata WHERE doc_type='merchant_agreement' "
                                         "ORDER BY doc_id") if r[0] not in taken)
    con.execute("UPDATE documents SET status='LOW_QUALITY', ocr_mean_conf=61.34 WHERE doc_id=?", (doc,))
    con.commit()
    return doc


def test_the_poor_scan_is_reported_and_coverage_still_counts_every_contract(register):
    before = portfolio.run_check(register, Q2)
    doc = _poor_scan(register)
    after = portfolio.run_check(register, Q2)
    rows = {r["doc_id"]: r for r in after["rows"]}
    assert set(rows) == {r["doc_id"] for r in before["rows"]} | {doc}     # the answer stays, plus the poor scan
    assert (rows[doc]["status"], rows[doc]["triage"], rows[doc]["reason"]) == ("NAME_NOT_RULED_OUT", "REVIEW", REASON)
    cov, counts = after["coverage"], after["counts"]
    assert cov["in_scope"] == cov["checked"] + len(cov["excluded"]) == before["coverage"]["in_scope"]
    assert sum(counts.values()) == cov["checked"]                          # every checked contract counted once
    assert counts["not_ruled_out_poor_scan"] == 1
    assert counts["without_hits"] == before["counts"]["without_hits"] - 1


def test_the_evaluation_flags_the_poor_scan_and_keeps_recall(register):
    """Recall first: the poor scan joins Q2's answer for review, like an UNCLEAR clause - it may
    cost precision, never recall."""
    doc = _poor_scan(register)
    q2 = next(q for q in check_register.gold_questions(register, check_register.load_gold()) if q["id"] == "Q2")
    assert q2["recall"] == 1.0 and doc in q2["found"] and doc in q2["to_review"]


def test_the_api_says_cannot_be_ruled_out(register, client):
    doc = _poor_scan(register)
    state = {"open": 0, "resolved": 0, "not_ruled_out": True, "reason": REASON}
    assert client.get(f"/documents/{doc}").json()["former_names"] == state
    matrix = {r["doc_id"]: r["former_names"] for r in client.get("/matrix").json()["rows"]}
    assert matrix[doc] == state and sum(m["not_ruled_out"] for m in matrix.values()) == 1
    station = next(s for s in client.get(f"/documents/{doc}/journey").json()["stations"] if s["station"] == "families")
    assert station["facts"]["former_name_not_ruled_out"] is True
    run = client.post("/runs", json={"question": "Which contracts still name a legacy company?", "plan": Q2}).json()
    row = next(r for r in run["rows"] if r["doc_id"] == doc)
    assert (row["status"], row["triage"], row["reason"]) == ("NAME_NOT_RULED_OUT", "REVIEW", REASON)
    assert client.get(f"/runs/{run['run_id']}").json()["rows"] == run["rows"]   # the stored snapshot says the same


def test_former_name_count_rule_matches_q2(register, client):
    """D14: the register counts "to check for a former name" with one rule (web/src/filters.ts
    formerNameToCheck): it names a former company or a poor scan cannot rule one out, copies and
    amendments aside. That count must equal Q2's answer - 5 on the clean register, 6 with a poor scan."""
    def count_rule() -> int:
        return sum(1 for r in client.get("/matrix").json()["rows"]
                   if (r["former_names"]["open"] > 0 or r["former_names"]["not_ruled_out"])
                   and not r["duplicate_of"] and not r["is_amendment"])

    q2 = client.post("/runs", json={"plan": Q2}).json()
    assert count_rule() == q2["coverage"]["reported"] == 5
    doc = _poor_scan(register)
    q2 = client.post("/runs", json={"plan": Q2}).json()
    assert count_rule() == q2["coverage"]["reported"] == 6
    row = next(r for r in q2["rows"] if r["doc_id"] == doc)
    assert (row["doc_status"], row["ocr_mean_conf"]) == ("LOW_QUALITY", 61.34)   # also Q2 knows the poor scan


def test_h01_is_reported_not_a_silent_miss(register, tmp_path, monkeypatch):
    """The measured case: Tesseract reads the handwritten H01 (OCR about 61 -> LOW_QUALITY), the
    metadata are written as the model wrote them, then the deterministic families step looks for
    the former names. H01 must be reported: as a former name if the OCR ever reads "Arvato",
    otherwise as "cannot be ruled out" for a person."""
    from tools import demo
    if not demo.DEMO_FILE.exists():
        pytest.skip("data/demo/H01.jpg missing: python tools/make_handwritten.py")
    try:
        ingest.check_ocr_languages()
    except Exception as exc:
        pytest.skip(f"Tesseract not ready: {exc}")
    monkeypatch.setattr(config, "WATCH_DIR", tmp_path / "inbox")
    assert demo.drop(register) == 0
    assert ingest.ingest(register, ingest.discover([config.WATCH_DIR])) == ["H01"]
    chunking.run(register, ["H01"])
    register.execute("INSERT INTO metadata (doc_id, doc_type, title, own_entity_name, counterparty_name, effective_date,"
                     " governing_law, is_amendment) VALUES ('H01', 'merchant_agreement', 'Händlervertrag',"
                     " 'Arvato Financial Solutions GmbH', 'Garhkisty Krüger uK', '2009-03-17', 'DE', 0)")
    register.commit()
    families.run(register)
    assert register.execute("SELECT status FROM documents WHERE doc_id='H01'").fetchone()[0] == "LOW_QUALITY"
    hits = register.execute("SELECT COUNT(*) FROM name_hits WHERE doc_id='H01'").fetchone()[0]
    row = next((r for r in portfolio.run_check(register, Q2)["rows"] if r["doc_id"] == "H01"), None)
    assert row is not None, "H01 dropped silently (F19)"
    if hits:
        assert row["status"] == "LEGACY_NAME"
    else:                                         # what Tesseract reads today: "Arfto", "Arvafr"
        assert (row["status"], row["triage"]) == ("NAME_NOT_RULED_OUT", "REVIEW")
