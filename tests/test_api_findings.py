"""Review in the contract register (decision 73): a review belongs to the finding version and is
reused by every run that reports the same version. Rows are picked by role (triage), except M14,
which is FOUR_EYES in every build because of its injected note."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api import storage_mock, workbench
from api.main import app
from api.storage_client import StorageClient, get_storage
from pipeline import config

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)
Q1 = {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}}
CLAUSE = "liability_limitation"
A, B = {"X-User": "reviewer_a"}, {"X-User": "reviewer_b"}


@pytest.fixture(autouse=True)
def storage_in_process():
    app.dependency_overrides[get_storage] = lambda: StorageClient(TestClient(storage_mock.app))
    yield
    app.dependency_overrides.pop(get_storage, None)


def _new_run() -> dict:
    return client.post("/runs", json={"plan": Q1}, headers=A).json()


def _routine_doc(run: dict) -> str:
    return next(r["doc_id"] for r in run["rows"] if r["triage"] == "CONFIRM")


def _review(doc_id, headers, decision="CONFIRMED", reason="checked the evidence", **extra):
    return client.post(f"/findings/{doc_id}/{CLAUSE}/reviews", headers=headers,
                       json={"decision": decision, "reason": reason, **extra})


def _row(run_id: str, doc_id: str) -> dict:
    return next(r for r in client.get(f"/runs/{run_id}").json()["rows"] if r["doc_id"] == doc_id)


def test_review_in_the_register_is_reused_by_every_run():
    first = _new_run()
    doc = _routine_doc(first)
    r = _review(doc, A, reason=None)                               # routine: no reason needed
    assert r.status_code == 201 and r.json()["state"] == "CONFIRMED"
    second = _new_run()
    review = _row(second["run_id"], doc)["review"]
    assert review["state"] == "CONFIRMED" and review["reviews"][0]["source"] == "register"
    assert _row(first["run_id"], doc)["review"]["state"] == "CONFIRMED"   # also the run made before


def test_four_eyes_in_the_register():
    assert _review("M14", A, reason=None).status_code == 422       # critical finding: reason required
    assert _review("M14", A).json()["state"] == "IN_REVIEW"        # 1 of 2
    assert _review("M14", A).status_code == 409                    # same person again
    assert _review("M14", B).json()["state"] == "CONFIRMED"
    assert _review("M14", B).status_code == 409                    # decided


def test_escalation_raises_a_routine_finding_to_four_eyes():
    doc = _routine_doc(_new_run())
    assert _review(doc, A, decision="ESCALATED", reason=None).status_code == 422
    escalated = _review(doc, A, decision="ESCALATED", reason="the cap may sit in an annex").json()
    assert escalated["state"] == "ESCALATED" and escalated["required"] == 2
    assert _review(doc, B, decision="ESCALATED", reason="again").status_code == 409
    assert _review(doc, A, reason=None).status_code == 422          # no longer routine
    assert _review(doc, A).json()["state"] == "IN_REVIEW"           # the escalating person may vote once
    assert _review(doc, B).json()["state"] == "CONFIRMED"


def test_an_escalated_finding_is_counted():
    """F25: an escalated finding is open (it waits for two people), so the run's review counts and
    the monitoring's open count include it - the counts add up to the rows."""
    assert _review("M03", A, decision="ESCALATED", reason="the cap may sit in an annex").status_code == 201
    run = _new_run()
    assert _row(run["run_id"], "M03")["review"]["state"] == "ESCALATED"
    assert run["review_states"]["ESCALATED"] == 1
    assert sum(run["review_states"].values()) == len(run["rows"])
    w = client.get("/monitoring").json()["workflow"]
    assert w["review_states"]["ESCALATED"] == 1 and w["open"] == w["rows"] == len(run["rows"])   # nothing decided yet


def test_a_review_made_in_a_run_counts_in_the_register_and_unlocks_the_archive():
    run = _new_run()
    rid = run["run_id"]
    r = client.post(f"/runs/{rid}/reviews", headers=A, json={"doc_id": "M14", "decision": "CONFIRMED",
                                                             "reason": "the note is not part of the contract"})
    assert r.json()["review"]["state"] == "IN_REVIEW"
    in_register = client.get(f"/findings/M14/{CLAUSE}/review").json()
    assert in_register["state"] == "IN_REVIEW" and in_register["reviews"][0]["source"] == rid
    assert _review("M14", B).json()["state"] == "CONFIRMED"         # second pair of eyes in the register
    assert _row(rid, "M14")["review"]["state"] == "CONFIRMED"
    archived = client.post("/archive", json={"run_id": rid, "doc_id": "M14"}, headers=B)
    assert archived.status_code == 201 and archived.json()["approved_by"] == ["reviewer_a", "reviewer_b"]
    assert client.get("/findings/review-states").json()["M14"][CLAUSE] == "CONFIRMED"


def test_a_review_of_an_earlier_version_does_not_carry_over():
    current = client.get(f"/findings/M14/{CLAUSE}/review").json()
    con = workbench.connect()
    version = {"doc_id": "M14", "clause_type": CLAUSE, "text_sha256": "an older text",
               "prompt_version": "extract-v1", "status": current["status"]}
    workbench.record_finding_review(con, version, "reviewer_a", "CONFIRMED", None, "old", "register")
    con.commit()
    con.close()
    now = client.get(f"/findings/M14/{CLAUSE}/review").json()
    assert now["state"] == "FOUND" and now["earlier_reviews"] == 1


def test_unknown_clause_is_refused():
    assert client.get("/findings/M14/no_such_clause/review").status_code == 404
