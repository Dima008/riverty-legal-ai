"""Workflow state: runs, reviews, archive receipts and the audit trail of human actions.

Kept apart from the register on purpose. The register is generated and can be rebuilt at any
time (new prompt version, --reassess); what a reviewer saw and decided must never be
regenerated. In Azure this is its own PostgreSQL schema with restricted write access.
"""

from __future__ import annotations

import json
import os
import sqlite3
from collections.abc import Iterator
from pathlib import Path

from pipeline import config
from pipeline.store import now

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY, created_at TEXT, created_by TEXT, question TEXT,
    plan_json TEXT,            -- the confirmed plan: check type + parameters
    result_json TEXT,          -- snapshot of what the reviewer saw (rows, coverage, triage)
    prompt_version TEXT,       -- register version the answer came from
    model_calls INTEGER, cost_usd REAL
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT, doc_id TEXT, reviewer TEXT,
    decision TEXT,             -- CONFIRMED | REJECTED | CORRECTED
    corrected_status TEXT, reason TEXT, ts TEXT,
    UNIQUE (run_id, doc_id, reviewer)     -- one person cannot be both pairs of eyes
);
CREATE TABLE IF NOT EXISTS finding_reviews (   -- decision 73: a review belongs to the finding
    id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id TEXT, clause_type TEXT,
    text_sha256 TEXT, prompt_version TEXT, status TEXT,   -- the finding version that was reviewed
    reviewer TEXT,
    decision TEXT,             -- CONFIRMED | REJECTED | CORRECTED | ESCALATED (not a vote)
    corrected_status TEXT, reason TEXT, ts TEXT,
    source TEXT                -- 'register' or the run the review was made in
);
CREATE TABLE IF NOT EXISTS archive_copies (
    sha256 TEXT PRIMARY KEY,   -- idempotency key: one file is archived exactly once
    doc_id TEXT, run_id TEXT, file_name TEXT, receipt_id TEXT, requested_by TEXT, approved_by TEXT, ts TEXT
);
CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, target TEXT, details_json TEXT
);
"""


def db_path() -> Path:
    """WORKBENCH_DB overrides the location (tests use a temporary file)."""
    return Path(os.environ.get("WORKBENCH_DB", config.VAR / "workbench.sqlite"))


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    # FastAPI opens, uses and closes the connection in separate thread-pool calls that can run on
    # different threads (F13). Each connection still serves only one request at a time.
    con = sqlite3.connect(path, timeout=30, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def get_wb() -> Iterator[sqlite3.Connection]:
    """A fresh workflow-database connection per request (same pattern as deps.get_con)."""
    con = connect()
    try:
        yield con
    finally:
        con.close()


def load_run(con: sqlite3.Connection, run_id: str) -> dict | None:
    r = con.execute("SELECT result_json FROM runs WHERE run_id=?", (run_id,)).fetchone()
    return json.loads(r["result_json"]) if r else None


def audit(con: sqlite3.Connection, actor: str, action: str, target: str, **details) -> None:
    con.execute("INSERT INTO audit (ts, actor, action, target, details_json) VALUES (?,?,?,?,?)",
                (now(), actor, action, target, json.dumps(details, ensure_ascii=False)))


# ---------------------------------------------------------------------------- finding reviews
# A finding version: the document, the clause, the text it was extracted from, the prompt version
# and the status the register showed. A review applies to exactly this version (decision 73).
FINDING_KEYS = ("doc_id", "clause_type", "text_sha256", "prompt_version", "status")


def finding_reviews(con: sqlite3.Connection, version: dict, exclude_source: str | None = None) -> list[dict]:
    """All reviews of exactly this finding version, oldest first. `exclude_source` leaves out the
    copies a run wrote itself (the run reads those from its own reviews table)."""
    rows = con.execute(
        "SELECT reviewer, decision, corrected_status, reason, ts, source FROM finding_reviews WHERE "
        + " AND ".join(f"{k}=?" for k in FINDING_KEYS) + " ORDER BY id",
        [version[k] for k in FINDING_KEYS]).fetchall()
    return [dict(r) for r in rows if exclude_source is None or r["source"] != exclude_source]


def earlier_finding_reviews(con: sqlite3.Connection, version: dict) -> int:
    """Reviews of the same finding made on another version (text, prompt or status changed)."""
    return con.execute(
        "SELECT COUNT(*) FROM finding_reviews WHERE doc_id=? AND clause_type=? AND NOT ("
        "text_sha256 IS ? AND prompt_version IS ? AND status IS ?)",
        (version["doc_id"], version["clause_type"], version["text_sha256"], version["prompt_version"],
         version["status"])).fetchone()[0]


def record_finding_review(con: sqlite3.Connection, version: dict, reviewer: str, decision: str,
                          corrected_status: str | None, reason: str | None, source: str) -> None:
    con.execute(
        "INSERT INTO finding_reviews (doc_id, clause_type, text_sha256, prompt_version, status, reviewer,"
        " decision, corrected_status, reason, ts, source) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (*[version[k] for k in FINDING_KEYS], reviewer, decision, corrected_status, reason, now(), source))
