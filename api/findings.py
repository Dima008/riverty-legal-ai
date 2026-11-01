"""Review in the contract register (decision 73): a review belongs to the finding, not to a question.

A lawyer can confirm, reject, correct or escalate a finding directly in the register. The review
is stored for one *version* of the finding - document, clause, the text it was extracted from,
the prompt version and the status the register showed (api/workbench.FINDING_KEYS). Every run
that reports the same version reuses it ("already confirmed by A and B"), so the review work
shrinks with every question. When the text, the extraction or the status changes, the old review
no longer applies; it is counted as "reviewed on an earlier version", never carried over silently.

Same rules as in a run (api/review.py): a reason for everything but confirming a routine finding,
four eyes for critical findings, one vote per person, DISPUTED when votes disagree. ESCALATED
needs a reason and raises the finding to four eyes; it is not a vote.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from pipeline import catalogue
from pipeline.portfolio import triage

from .deps import current_user, get_con
from .review import FINAL, reason_required, review_state
from .workbench import (FINDING_KEYS, audit, earlier_finding_reviews, finding_reviews, get_wb,
                        record_finding_review)

router = APIRouter()

FINDINGS_SQL = ("SELECT c.doc_id, c.clause_type, c.status, c.confidence, c.flags, d.flags AS doc_flags,"
                " m.text_sha256, m.prompt_version FROM clauses c JOIN documents d ON d.doc_id = c.doc_id"
                " JOIN metadata m ON m.doc_id = c.doc_id")


def _version(r) -> dict:
    """A finding row of the register as a version, with the triage a run would give it."""
    flags = json.loads(r["flags"] or "[]") + json.loads(r["doc_flags"] or "[]")
    return {**{k: r[k] for k in FINDING_KEYS}, "triage": triage(r["status"], r["confidence"], flags)}


def _finding_or_404(con: sqlite3.Connection, doc_id: str, clause_type: str) -> dict:
    if clause_type not in catalogue.CLAUSES:
        raise HTTPException(404, f"unknown clause type {clause_type!r}")
    r = con.execute(FINDINGS_SQL + " WHERE c.doc_id=? AND c.clause_type=?", (doc_id, clause_type)).fetchone()
    if r is None:
        raise HTTPException(404, f"{doc_id} has no finding for {clause_type}")
    return _version(r)


def _state(wb: sqlite3.Connection, version: dict) -> dict:
    return {**review_state(version["triage"], finding_reviews(wb, version)), "triage": version["triage"],
            "status": version["status"], "earlier_reviews": earlier_finding_reviews(wb, version)}


@router.get("/findings/review-states")
def list_review_states(con: sqlite3.Connection = Depends(get_con),
                       wb: sqlite3.Connection = Depends(get_wb)) -> dict[str, dict[str, str]]:
    """Review state of every reviewed finding as the register shows it now: {doc: {clause: state}}."""
    reviewed: dict[tuple, list[dict]] = {}
    for r in wb.execute("SELECT " + ", ".join(FINDING_KEYS) + ", reviewer, decision FROM finding_reviews ORDER BY id"):
        reviewed.setdefault(tuple(r[k] for k in FINDING_KEYS), []).append(dict(r))
    states: dict[str, dict[str, str]] = {}
    for r in con.execute(FINDINGS_SQL):
        version = _version(r)
        reviews = reviewed.get(tuple(version[k] for k in FINDING_KEYS))
        if reviews:
            states.setdefault(r["doc_id"], {})[r["clause_type"]] = review_state(version["triage"], reviews)["state"]
    return states


@router.get("/findings/{doc_id}/{clause_type}/review")
def get_finding_review(doc_id: str, clause_type: str, con: sqlite3.Connection = Depends(get_con),
                       wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    """Review state of the finding as the register shows it now."""
    return _state(wb, _finding_or_404(con, doc_id, clause_type))


class FindingReviewRequest(BaseModel):
    decision: Literal["CONFIRMED", "REJECTED", "CORRECTED", "ESCALATED"]
    corrected_status: Literal["PRESENT", "ABSENT"] | None = Field(
        None, description="CORRECTED only: what the reviewer found")
    reason: str | None = Field(None, max_length=2000)


@router.post("/findings/{doc_id}/{clause_type}/reviews", status_code=201)
def add_finding_review(doc_id: str, clause_type: str, req: FindingReviewRequest,
                       user: str = Depends(current_user), con: sqlite3.Connection = Depends(get_con),
                       wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    """Confirm, reject, correct or escalate a finding in the register. Checks in this order:
    409 already decided or disputed; 409 escalated twice, or the same person votes twice;
    422 reason missing; 422 CORRECTED without corrected_status."""
    version = _finding_or_404(con, doc_id, clause_type)
    current = _state(wb, version)
    if current["state"] in FINAL or current["state"] == "DISPUTED":
        raise HTTPException(409, f"{doc_id}/{clause_type} is already {current['state']}")
    escalating = req.decision == "ESCALATED"
    if escalating and current["escalated"]:
        raise HTTPException(409, "already escalated: two reviewers decide now")
    voted = any(r["reviewer"] == user and r["decision"] != "ESCALATED" for r in current["reviews"])
    if not escalating and voted:
        raise HTTPException(409, "four-eyes principle: the second review must come from a different person")
    # ESCALATED is not CONFIRMED, so an escalation always needs a reason (the same rule as in a run)
    if not (req.reason or "").strip() and reason_required(req.decision, version["triage"], current["escalated"]):
        raise HTTPException(422, "a reason is required for escalations, rejections, corrections "
                                 "and every finding that needs a review")
    if req.decision == "CORRECTED" and not req.corrected_status:
        raise HTTPException(422, "CORRECTED needs corrected_status; otherwise use REJECTED")
    record_finding_review(wb, version, user, req.decision, req.corrected_status, req.reason, "register")
    after = _state(wb, version)
    audit(wb, user, "finding_escalated" if escalating else "finding_review_recorded", f"{doc_id}/{clause_type}",
          decision=req.decision, corrected_status=req.corrected_status, reason=req.reason,
          triage=version["triage"], status=version["status"], state_after=after["state"])
    wb.commit()
    return after
