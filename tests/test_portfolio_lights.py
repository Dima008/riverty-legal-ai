"""Decision 95: every contract of an answer is red, orange or green - by one rule on the server.

red = the issue the question looks for is in the text; orange = the register cannot settle it, a
person looks; green = positive, with evidence. Doubt never turns green. The reported rows stay
exactly the evaluation's answer; every other checked contract is in `unreported`, with its evidence.
Runs against the compiled register; the workflow database is a temporary file (conftest.py).
"""

from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.workflow import EXAMPLES
from pipeline import catalogue, config, portfolio
from pipeline.queries import NAME_NOT_RULED_OUT
from pipeline.store import add_missing_columns

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)


def _run(qid: str, user: str = "reviewer_a") -> dict:
    return client.post("/runs", json={"plan": EXAMPLES[qid]}, headers={"X-User": user}).json()


def test_the_light_rule():
    """The table of spec 2.1: doubt is orange, red stays red, an unknown status is refused."""
    for status in portfolio.ORANGE:
        assert portfolio.light(status, "REVIEW", "INGESTED")[0] == "orange", status
    assert portfolio.light("ABSENT", "REVIEW", "LOW_QUALITY") == ("orange", "poor_scan")      # H01
    assert portfolio.light("PRESENT", "CONFIRM", "LOW_QUALITY") == ("orange", "poor_scan")
    assert portfolio.light("UNIQUE", None, "LOW_QUALITY") == ("orange", "poor_scan")           # F43: H01 in Q8
    assert portfolio.light("PRESENT", "FOUR_EYES", "INGESTED") == ("orange", "not_sure")      # M14 in Q3
    assert portfolio.light("PRESENT", "REVIEW", "OCR_DONE") == ("orange", "not_sure")
    assert portfolio.light("PRESENT", "CONFIRM", "OCR_DONE") == ("green", "status")
    assert portfolio.light("ABSENT", "FOUR_EYES", "INGESTED") == ("red", "status")           # M14 in Q1
    assert portfolio.light("LEGACY_NAME", "CONFIRM", "LOW_QUALITY") == ("red", "status")     # a hit is a hit
    for status in ("NO_FORMER_NAME", "NAME_RESOLVED", "SAME_LAW", "UNIQUE", "ORIGINAL"):
        assert portfolio.light(status, None, "INGESTED") == ("green", "status"), status
    with pytest.raises(ValueError):
        portfolio.light("SOMETHING_NEW", None, "INGESTED")


@pytest.mark.parametrize("qid", sorted(EXAMPLES))
def test_every_contract_in_scope_is_in_exactly_one_list(qid):
    run = _run(qid)
    cov = run["coverage"]
    reported = {r["doc_id"] for r in run["rows"]}
    other = {r["doc_id"] for r in run["unreported"]}
    assert not reported & other, qid
    assert reported | other == set(cov["checked_ids"]), qid
    assert sum(run["lights"].values()) == cov["checked"], qid
    assert cov["checked"] + len(cov["excluded"]) == cov["in_scope"], qid
    for r in run["rows"]:
        assert r["light"] in ("red", "orange"), (qid, r["doc_id"])      # a reported row is never green
    for r in run["rows"] + run["unreported"]:
        if r["light"] == "green":                                    # doubt never turns green
            assert r["status"] not in portfolio.ORANGE and r["doc_status"] != "LOW_QUALITY", (qid, r["doc_id"])
            assert r["triage"] in (None, "CONFIRM") and r["page_count"], (qid, r["doc_id"])
        assert r["sample"] is False or r["doc_id"] in reported


def test_q1_shows_every_found_clause_with_its_passage():
    run = _run("Q1")
    found = run["unreported"]
    assert len(found) == 14 and run["lights"] == {"red": 3, "orange": 2, "green": 14}
    for r in found:
        assert (r["status"], r["light"]) == ("PRESENT", "green"), r["doc_id"]
        assert r["quote"] and r["page"] and r["char_start"] is not None and r["text_sha256"], r["doc_id"]
    assert {r["doc_id"]: r["page_count"] for r in run["rows"]}["M14"] == 3


def test_a_doubtful_found_is_orange_and_not_reported():
    """F37: M14's Found in Q3 (confidence 0.70, text addressed to AI systems) used to be a grey tile."""
    run = _run("Q3")
    m14 = next(r for r in run["unreported"] if r["doc_id"] == "M14")
    assert (m14["status"], m14["triage"], m14["light"], m14["light_why"]) == ("PRESENT", "FOUR_EYES", "orange", "not_sure")
    assert m14["legal"]["required"] == 2 and "M14" not in {r["doc_id"] for r in run["rows"]}


def test_q2_names_the_searched_names_and_the_resolved_one():
    run = _run("Q2")
    assert run["info"]["searched_names"] == catalogue.OWN_ENTITY_LEGACY and len(catalogue.OWN_ENTITY_LEGACY) == 4
    rows = {r["doc_id"]: r for r in run["unreported"]}
    assert rows["M05"]["status"] == "NAME_RESOLVED" and rows["M05"]["light"] == "green"
    assert {h["resolved_by"] for h in rows["M05"]["hits"]} == {"M05-A"}
    assert rows["M01"]["status"] == "NO_FORMER_NAME" and rows["M01"]["hits"] == []
    assert client.get("/checks").json()["legacy_names"]["names"] == catalogue.OWN_ENTITY_LEGACY


def test_q8_marks_the_original_and_how_the_copy_was_found():
    run = _run("Q8")
    rows = {r["doc_id"]: r for r in run["rows"] + run["unreported"]}
    assert (rows["M01"]["status"], rows["M01"]["copies"], rows["M01"]["light"]) == ("ORIGINAL", ["M15"], "green")
    assert (rows["M15"]["status"], rows["M15"]["match"], rows["M15"]["light"]) == ("DUPLICATE", "same_text", "red")
    assert rows["M02"]["status"] == "UNIQUE" and rows["M02"]["copies"] == []


def test_legal_doubting_a_green_found_turns_it_orange_and_leaves_the_answer():
    """F34 is shown, not fixed: Legal corrects M01's Found in the register (D6); the answer's rows and the
    evaluation stay the same, M01 turns orange "legal" and the lights count it."""
    run = _run("Q1")
    rows_before = [r["doc_id"] for r in run["rows"]]
    r = client.post("/findings/M01/liability_limitation/reviews", headers={"X-User": "reviewer_a"},
                    json={"decision": "CORRECTED", "corrected_status": "ABSENT", "reason": "test: 7.2 is not a cap"})
    assert r.status_code == 201
    after = client.get(f"/runs/{run['run_id']}").json()
    m01 = next(x for x in after["unreported"] if x["doc_id"] == "M01")
    assert (m01["light"], m01["light_why"], m01["legal"]["state"]) == ("orange", "legal", "CORRECTED")
    assert after["lights"] == {"red": 3, "orange": 3, "green": 13}
    assert [x["doc_id"] for x in after["rows"]] == rows_before
    assert after["review_states"]["FOUND"] == len(rows_before)       # review states count reported rows only
    # a green row is still no reported row: no run review, no archive copy
    review = client.post(f"/runs/{run['run_id']}/reviews", json={"doc_id": "M01", "decision": "CONFIRMED"})
    assert review.status_code == 404


def test_m18_read_by_ocr_raises_no_doubt():
    """F39: a good scan read by OCR (93 %) is information, not a failed check."""
    finding = next(f for f in client.get("/documents/M18/findings").json() if f["clause_type"] == "liability_limitation")
    layer = next(x for x in finding["layers"] if x["layer"] == "document_signals")
    assert layer["passed"] is True and layer["detail"] == "ocr_text"


def test_the_playbook_says_its_absence_signals_in_words():
    clauses = client.get("/catalogue").json()["clauses"]
    assert set(clauses) == set(catalogue.CLAUSES)
    for key, c in clauses.items():
        assert len(c["absence_words"]) == len(catalogue.CLAUSES[key]["absence_signals"]), key
        for w in c["absence_words"]:
            assert w and not set(w) & set("\\()|?*[]{}"), (key, w)
    assert clauses["liability_limitation"]["absence_words"][0] == "limitation of/on liability"
    assert client.get("/matrix").json()["clauses"] == clauses      # the register's contract file says the same
    assert clauses["dpa_reference"]["absence_words"][0] == "art. 28"


def test_a_poor_scan_never_proves_a_clause_missing(tmp_path):
    """H01's case on a copy: a Not found on a scan below the OCR threshold is orange, and still reported."""
    con = sqlite3.connect(tmp_path / "register.sqlite")
    source = sqlite3.connect(config.DB_PATH.as_uri() + "?mode=ro", uri=True)
    source.backup(con)
    source.close()
    add_missing_columns(con)
    con.row_factory = sqlite3.Row
    con.execute("UPDATE documents SET status='LOW_QUALITY', ocr_mean_conf=61.3 WHERE doc_id='M03'")
    run = portfolio.run_check(con, EXAMPLES["Q1"])
    m03 = next(r for r in run["rows"] if r["doc_id"] == "M03")
    assert (m03["status"], m03["light"], m03["light_why"]) == ("ABSENT", "orange", "poor_scan")
    q2 = portfolio.run_check(con, EXAMPLES["Q2"])
    m03 = next(r for r in q2["rows"] if r["doc_id"] == "M03")
    assert (m03["status"], m03["light"]) == (NAME_NOT_RULED_OUT, "orange")
    q8 = portfolio.run_check(con, EXAMPLES["Q8"])        # F43: a misread text cannot prove "no copy"
    m03 = next(r for r in q8["unreported"] if r["doc_id"] == "M03")
    assert (m03["status"], m03["light"], m03["light_why"]) == ("UNIQUE", "orange", "poor_scan")
    assert [r["doc_id"] for r in q8["rows"]] == ["M15"]   # the evaluation's answer does not move
    con.close()
