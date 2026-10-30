"""API step 3: review with the four-eyes principle, batch rules, and the gated archive copy.

Scenario from the demo: Q1 (merchant agreements without a limitation of liability). M14 carries
an injected note (FOUR_EYES), M08 is unclear (REVIEW), M03 and M18 are CONFIRM rows.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api import storage_mock
from api.main import app
from api.storage_client import StorageClient, get_storage
from pipeline import config

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")

client = TestClient(app)
Q1 = {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}}
A, B = {"X-User": "reviewer_a"}, {"X-User": "reviewer_b"}


@pytest.fixture(autouse=True)
def storage_in_process():
    """The archive talks to the storage mock app directly instead of over the network."""
    app.dependency_overrides[get_storage] = lambda: StorageClient(TestClient(storage_mock.app))
    yield
    app.dependency_overrides.pop(get_storage, None)


@pytest.fixture
def run():
    return client.post("/runs", json={"plan": Q1}, headers=A).json()


def _review(run_id, doc_id, headers, decision="CONFIRMED", reason="checked the evidence", **extra):
    return client.post(f"/runs/{run_id}/reviews", headers=headers,
                       json={"doc_id": doc_id, "decision": decision, "reason": reason, **extra})


def _state(run_id, doc_id):
    rows = client.get(f"/runs/{run_id}").json()["rows"]
    return next(r for r in rows if r["doc_id"] == doc_id)["review"]["state"]


def test_four_eyes_needs_two_different_people(run):
    rid = run["run_id"]
    assert _review(rid, "M14", A).json()["review"]["state"] == "IN_REVIEW"     # 1 of 2
    assert _review(rid, "M14", A).status_code == 409                            # same person again
    assert _review(rid, "M14", B).json()["review"]["state"] == "CONFIRMED"     # second pair of eyes
    assert _review(rid, "M14", B).status_code == 409                            # decided
    actions = [(e["actor"], e["action"]) for e in client.get("/audit").json()]
    assert ("reviewer_a", "review_recorded") in actions and ("reviewer_b", "review_recorded") in actions


def test_disagreement_is_escalated(run):
    rid = run["run_id"]
    _review(rid, "M14", A)
    _review(rid, "M14", B, decision="REJECTED", reason="the note is not part of the contract")
    assert _state(rid, "M14") == "DISPUTED"
    assert _review(rid, "M14", A).status_code == 409


def test_reason_required_for_review_rows_and_corrections(run):
    rid = run["run_id"]
    assert _review(rid, "M08", A, reason=None).status_code == 422               # REVIEW row
    assert _review(rid, "M08", A, decision="CORRECTED").status_code == 422      # needs corrected_status
    r = _review(rid, "M08", A, decision="CORRECTED", corrected_status="ABSENT",
                reason="6.2 is data protection, there is no cap")
    assert r.status_code == 201 and r.json()["review"]["state"] == "CORRECTED"


def test_no_bulk_confirmation_of_critical_rows(run):
    rid = run["run_id"]
    rows = {r["doc_id"]: r for r in run["rows"]}
    refused = client.post(f"/runs/{rid}/reviews/batch", json={"doc_ids": ["M03", "M14"]}, headers=A)
    assert refused.status_code == 422 and "M14" in refused.json()["detail"]["refused"]
    plain = [d for d, r in rows.items() if r["triage"] == "CONFIRM" and not r["sample"]]
    if plain:
        assert client.post(f"/runs/{rid}/reviews/batch", json={"doc_ids": plain}, headers=A).status_code == 201
        assert all(_state(rid, d) == "CONFIRMED" for d in plain)


def test_archive_copy_only_after_approval_and_exactly_once(run):
    rid = run["run_id"]
    assert client.post("/archive", json={"run_id": rid, "doc_id": "M14"}, headers=A).status_code == 409
    _review(rid, "M14", A)
    assert client.post("/archive", json={"run_id": rid, "doc_id": "M14"}, headers=A).status_code == 409  # 1 of 2
    _review(rid, "M14", B)
    first = client.post("/archive", json={"run_id": rid, "doc_id": "M14"}, headers=B)
    assert first.status_code == 201
    assert first.json()["approved_by"] == ["reviewer_a", "reviewer_b"]
    assert [f["status"] for f in first.json()["files"]] == ["stored"]
    again = client.post("/archive", json={"run_id": rid, "doc_id": "M14"}, headers=A)
    assert again.status_code == 200                                               # nothing new stored
    assert [f["status"] for f in again.json()["files"]] == ["already_archived"]
    stored = list(Path(os.environ["STORAGE_MOCK_DIR"]).glob("*.bin"))
    assert len(stored) == 1                                                       # exactly one copy
    assert hashlib.sha256(stored[0].read_bytes()).hexdigest() == first.json()["files"][0]["sha256"]
    actions = [e["action"] for e in client.get("/audit").json()]
    assert "archive_refused" in actions and "archive_copy" in actions


def test_storage_mock_is_write_only_and_idempotent():
    mock = TestClient(storage_mock.app)
    content = b"synthetic test document"
    sha = hashlib.sha256(content).hexdigest()
    headers = {"X-Doc-Id": "T1", "X-Run-Id": "run-test", "X-Approved-By": "reviewer_a"}
    assert mock.put(f"/contracts/{sha}", content=content, headers=headers).status_code == 201
    assert mock.put(f"/contracts/{sha}", content=content, headers=headers).json()["status"] == "already_stored"
    assert mock.put(f"/contracts/{'0' * 64}", content=content, headers=headers).status_code == 422  # wrong hash
    assert mock.get(f"/contracts/{sha}").status_code == 405                                        # no reading
    assert mock.delete(f"/contracts/{sha}").status_code == 405                                     # no deleting
