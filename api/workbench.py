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
    con = sqlite3.connect(path, timeout=30)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def get_wb() -> Iterator[sqlite3.Connection]:
    con = connect()
    try:
        yield con
    finally:
        con.close()


def audit(con: sqlite3.Connection, actor: str, action: str, target: str, **details) -> None:
    con.execute("INSERT INTO audit (ts, actor, action, target, details_json) VALUES (?,?,?,?,?)",
                (now(), actor, action, target, json.dumps(details, ensure_ascii=False)))
