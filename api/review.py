"""Workbench workflow, step 3: review with the four-eyes principle, then the archive copy.

State of a reported row:  FOUND -> IN_REVIEW (1 of 2, four-eyes only) -> CONFIRMED | REJECTED |
CORRECTED, or DISPUTED when two reviewers disagree (escalate). The system proposes; people
decide - and only a decided row unlocks an action with external effect (tool gate).

A row of a missing-clause run is a finding. Its reviews are also stored per finding version, so a
review made in the register or in another run counts here too (decision 73, api/findings.py).
"""

from __future__ import annotations

import hashlib
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from pipeline.store import now

from .deps import USERS, current_user, get_con
from .register import _document, _source_files
from .storage_client import StorageClient, get_storage
from .workbench import audit, finding_reviews, get_wb, load_run, record_finding_review

router = APIRouter()

REQUIRED_REVIEWS = {"CONFIRM": 1, "REVIEW": 1, "FOUR_EYES": 2}
FINAL = {"CONFIRMED", "REJECTED", "CORRECTED"}
APPROVED = {"CONFIRMED", "CORRECTED"}       # states that unlock the archive copy


def review_state(triage: str, reviews: list[dict]) -> dict:
    """State from the reviews so far. ESCALATED (made in the register) is not a vote: it raises
    the finding to four eyes, and the person who escalated may still cast one of the two votes."""
    escalated = any(r["decision"] == "ESCALATED" for r in reviews)
    votes = [r for r in reviews if r["decision"] != "ESCALATED"]
    needed = 2 if escalated else REQUIRED_REVIEWS[triage]
    if not reviews:
        state = "FOUND"
    elif len({r["decision"] for r in votes}) > 1:
        state = "DISPUTED"
    elif not votes:
        state = "ESCALATED"
    elif len(votes) < needed:
        state = "IN_REVIEW"
    else:
        state = votes[0]["decision"]
    return {"state": state, "required": needed, "done": len(votes), "escalated": escalated,
            "reviews": [{**r, "reviewer_name": USERS.get(r["reviewer"], r["reviewer"])} for r in reviews]}


def finding_of(run: dict, row: dict) -> dict | None:
    """The finding version behind a row of a missing-clause run; None for other checks and for
    runs made before rows carried their version."""
    if run["plan"]["check"] != "missing_clause" or not row.get("text_sha256"):
        return None
    return {"doc_id": row["doc_id"], "clause_type": run["plan"]["params"]["clause_type"],
            "text_sha256": row["text_sha256"], "prompt_version": row["prompt_version"], "status": row["status"]}


def attach_reviews(wb: sqlite3.Connection, run: dict) -> dict:
    """Add the review state to every row of a run (runs themselves are immutable snapshots). For a
    finding, reviews of the same version made in the register or in other runs count too."""
    reviews: dict[str, list[dict]] = {}
    for r in wb.execute("SELECT doc_id, reviewer, decision, corrected_status, reason, ts FROM reviews "
                        "WHERE run_id=? ORDER BY id", (run["run_id"],)):
        reviews.setdefault(r["doc_id"], []).append({**{k: r[k] for k in r.keys() if k != "doc_id"},
                                                    "source": run["run_id"]})
    for row in run["rows"]:
        finding = finding_of(run, row)
        shared = finding_reviews(wb, finding, exclude_source=run["run_id"]) if finding else []
        combined = sorted(reviews.get(row["doc_id"], []) + shared, key=lambda r: r["ts"])
        row["review"] = review_state(row["triage"], combined)
    # every state review_state() can return, so the counts add up to the rows (F25: ESCALATED was missing)
    run["review_states"] = {s: sum(1 for row in run["rows"] if row["review"]["state"] == s)
                            for s in ("FOUND", "ESCALATED", "IN_REVIEW", "CONFIRMED", "REJECTED", "CORRECTED",
                                      "DISPUTED")}
    return run


def _run_and_row(wb: sqlite3.Connection, run_id: str, doc_id: str) -> tuple[dict, dict]:
    run = load_run(wb, run_id)
    if run is None:
        raise HTTPException(404, f"run {run_id} not found")
    attach_reviews(wb, run)
    row = next((r for r in run["rows"] if r["doc_id"] == doc_id), None)
    if row is None:
        raise HTTPException(404, f"{doc_id} is not a reported row of run {run_id}")
    return run, row


class ReviewRequest(BaseModel):
    doc_id: str
    decision: Literal["CONFIRMED", "REJECTED", "CORRECTED"]
    corrected_status: Literal["PRESENT", "ABSENT"] | None = Field(
        None, description="CORRECTED only: what the reviewer found (missing-clause checks)")
    reason: str | None = Field(None, max_length=2000)


@router.post("/runs/{run_id}/reviews", status_code=201)
def add_review(run_id: str, req: ReviewRequest, user: str = Depends(current_user),
               wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    run, row = _run_and_row(wb, run_id, req.doc_id)
    state = row["review"]["state"]
    if state in FINAL or state == "DISPUTED":
        raise HTTPException(409, f"{req.doc_id} is already {state}" + (" - escalate" if state == "DISPUTED" else ""))
    if any(r["reviewer"] == user and r["decision"] != "ESCALATED" for r in row["review"]["reviews"]):
        raise HTTPException(409, "four-eyes principle: the second review must come from a different person")
    if not (req.reason or "").strip() and (req.decision != "CONFIRMED" or row["triage"] != "CONFIRM"):
        raise HTTPException(422, "a reason is required for rejections, corrections and every REVIEW / FOUR_EYES row")
    if req.decision == "CORRECTED":
        if run["plan"]["check"] != "missing_clause" or not req.corrected_status:
            raise HTTPException(422, "CORRECTED needs corrected_status (missing-clause checks); otherwise use REJECTED")
    wb.execute("INSERT INTO reviews (run_id, doc_id, reviewer, decision, corrected_status, reason, ts) "
               "VALUES (?,?,?,?,?,?,?)",
               (run_id, req.doc_id, user, req.decision, req.corrected_status, req.reason, now()))
    if finding := finding_of(run, row):      # the finding remembers it for the register and later runs
        record_finding_review(wb, finding, user, req.decision, req.corrected_status, req.reason, run_id)
    _, row = _run_and_row(wb, run_id, req.doc_id)
    audit(wb, user, "review_recorded", f"{run_id}/{req.doc_id}", decision=req.decision,
          corrected_status=req.corrected_status, reason=req.reason, triage=row["triage"],
          state_after=row["review"]["state"])
    wb.commit()
    return row


class BatchRequest(BaseModel):
    doc_ids: list[str] = Field(..., min_length=1)


@router.post("/runs/{run_id}/reviews/batch", status_code=201)
def confirm_batch(run_id: str, req: BatchRequest, user: str = Depends(current_user),
                  wb: sqlite3.Connection = Depends(get_wb)) -> dict:
    """Confirm several CONFIRM rows at once. Never for REVIEW / FOUR_EYES rows or spot-check samples:
    no bulk confirmation of critical cases."""
    run = load_run(wb, run_id)
    if run is None:
        raise HTTPException(404, f"run {run_id} not found")
    rows = {r["doc_id"]: r for r in attach_reviews(wb, run)["rows"]}
    refused = {d: ("not a reported row" if d not in rows else
                   f"triage {rows[d]['triage']}" if rows[d]["triage"] != "CONFIRM" else
                   "spot-check sample - open it" if rows[d]["sample"] else
                   f"already {rows[d]['review']['state']}" if rows[d]["review"]["state"] != "FOUND" else None)
               for d in req.doc_ids}
    refused = {d: why for d, why in refused.items() if why}
    if refused:
        raise HTTPException(422, {"message": "these rows must be reviewed one by one", "refused": refused})
    wb.executemany("INSERT INTO reviews (run_id, doc_id, reviewer, decision, reason, ts) "
                   "VALUES (?,?,?,'CONFIRMED','batch confirmation',?)",
                   [(run_id, d, user, now()) for d in req.doc_ids])
    for d in req.doc_ids:
        if finding := finding_of(run, rows[d]):
            record_finding_review(wb, finding, user, "CONFIRMED", None, "batch confirmation", run_id)
    audit(wb, user, "batch_confirmed", run_id, doc_ids=req.doc_ids)
    wb.commit()
    return {"confirmed": req.doc_ids}


# ---------------------------------------------------------------------------- archive copy
class ArchiveRequest(BaseModel):
    run_id: str
    doc_id: str


@router.post("/archive", status_code=201)
def archive_copy(req: ArchiveRequest, response: Response, user: str = Depends(current_user),
                 con: sqlite3.Connection = Depends(get_con), wb: sqlite3.Connection = Depends(get_wb),
                 storage: StorageClient = Depends(get_storage)) -> dict:
    """Store an additional copy of the contract in the contract storage - only after approval
    (tool gate), exactly once per file (idempotency by SHA-256), every step audited."""
    _, row = _run_and_row(wb, req.run_id, req.doc_id)
    state = row["review"]["state"]
    if state not in APPROVED:
        audit(wb, user, "archive_refused", f"{req.run_id}/{req.doc_id}", state=state)
        wb.commit()
        raise HTTPException(409, f"tool gate: archive copy only after approval; {req.doc_id} is {state}")
    approved_by = sorted({r["reviewer"] for r in row["review"]["reviews"] if r["decision"] in APPROVED})
    files = []
    for path in _source_files(_document(con, req.doc_id)):
        content = path.read_bytes()
        sha = hashlib.sha256(content).hexdigest()
        known = wb.execute("SELECT receipt_id FROM archive_copies WHERE sha256=?", (sha,)).fetchone()
        if known:
            files.append({"file": path.name, "sha256": sha, "status": "already_archived", "receipt_id": known[0]})
            continue
        code, receipt = storage.put_copy(content, sha, req.doc_id, req.run_id, approved_by)
        wb.execute("INSERT OR IGNORE INTO archive_copies (sha256, doc_id, run_id, file_name, receipt_id, requested_by,"
                   " approved_by, ts) VALUES (?,?,?,?,?,?,?,?)",
                   (sha, req.doc_id, req.run_id, path.name, receipt["receipt_id"], user, ",".join(approved_by), now()))
        files.append({"file": path.name, "sha256": sha, "status": receipt["status"], "receipt_id": receipt["receipt_id"]})
    audit(wb, user, "archive_copy", req.doc_id, run_id=req.run_id, approved_by=approved_by, files=files)
    wb.commit()
    if all(f["status"] != "stored" for f in files):
        response.status_code = 200      # nothing new: every file was already in the storage
    return {"doc_id": req.doc_id, "approved_by": approved_by, "files": files}


@router.get("/archive")
def list_archive(wb: sqlite3.Connection = Depends(get_wb)) -> list[dict]:
    return [dict(r) for r in wb.execute("SELECT * FROM archive_copies ORDER BY ts DESC")]
