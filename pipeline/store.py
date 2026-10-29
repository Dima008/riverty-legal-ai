"""Contract register on SQLite.

Local stand-in for Azure Database for PostgreSQL (register, audit log) and
Azure AI Search (full text + vectors). All access goes through this module, so
the storage can be swapped without touching the pipeline logic.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import DB_PATH, VAR

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    doc_id TEXT PRIMARY KEY,
    source_path TEXT NOT NULL,
    file_sha256 TEXT NOT NULL,
    text_sha256 TEXT,
    format TEXT,               -- pdf_text | pdf_image | jpeg | txt
    language TEXT,
    page_count INTEGER,
    ocr_mean_conf REAL,
    status TEXT,               -- INGESTED | OCR_DONE | LOW_QUALITY | FAILED
    family_id TEXT,
    duplicate_of TEXT,
    flags TEXT,                -- JSON list, e.g. ["prompt_injection_suspected"]
    ingested_at TEXT
);
CREATE TABLE IF NOT EXISTS doc_text (
    doc_id TEXT PRIMARY KEY, text TEXT, page_offsets_json TEXT
);
CREATE TABLE IF NOT EXISTS pages (
    doc_id TEXT, page_no INTEGER, text TEXT, source TEXT, ocr_conf REAL,
    width REAL, height REAL, words_json TEXT,
    PRIMARY KEY (doc_id, page_no)
);
CREATE TABLE IF NOT EXISTS chunks (
    chunk_id TEXT PRIMARY KEY, doc_id TEXT, seq INTEGER, section_title TEXT,
    page_start INTEGER, page_end INTEGER, char_start INTEGER, char_end INTEGER,
    text TEXT, context TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    chunk_id UNINDEXED, doc_id UNINDEXED, text, tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id TEXT PRIMARY KEY, model TEXT, dim INTEGER, vector BLOB
);
CREATE TABLE IF NOT EXISTS metadata (
    doc_id TEXT PRIMARY KEY, doc_type TEXT, title TEXT,
    own_entity_name TEXT,          -- Riverty group party as written in the document (may be a legacy name)
    current_own_entity_name TEXT,  -- after applying amendments of the family
    counterparty_name TEXT, parties_json TEXT, effective_date TEXT, governing_law TEXT, language TEXT,
    is_amendment INTEGER, amended_agreement_date TEXT, renames_from TEXT, renames_to TEXT,
    raw_json TEXT, text_sha256 TEXT, model TEXT, prompt_version TEXT, extracted_at TEXT
);
CREATE TABLE IF NOT EXISTS name_hits (
    doc_id TEXT, name TEXT, page INTEGER, char_start INTEGER, char_end INTEGER, snippet TEXT,
    resolved_by TEXT              -- amendment doc_id if a later amendment already renamed the party
);
CREATE TABLE IF NOT EXISTS clauses (
    doc_id TEXT, clause_type TEXT, status TEXT,
    model_status TEXT,         -- what the model said before the checks (PRESENT may become UNCLEAR)
    quote TEXT, quote_verified INTEGER,
    quote_score REAL, page INTEGER, char_start INTEGER, char_end INTEGER, section TEXT,
    chunk_id TEXT, rationale TEXT, confidence REAL, flags TEXT, model TEXT, prompt_version TEXT,
    PRIMARY KEY (doc_id, clause_type)
);
CREATE TABLE IF NOT EXISTS llm_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, purpose TEXT, model TEXT, doc_id TEXT,
    prompt_tokens INTEGER, completion_tokens INTEGER, cached_tokens INTEGER, cost_usd REAL,
    latency_ms INTEGER
);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, target TEXT,
    details_json TEXT
);
"""


# One lock for all writes: worker threads (model calls) and the main thread share one connection.
DB_LOCK = threading.RLock()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    VAR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


@contextmanager
def transaction(con: sqlite3.Connection):
    with DB_LOCK:
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise


def audit(con: sqlite3.Connection, actor: str, action: str, target: str, **details) -> None:
    con.execute(
        "INSERT INTO audit_log (ts, actor, action, target, details_json) VALUES (?,?,?,?,?)",
        (now(), actor, action, target, json.dumps(details, ensure_ascii=False)),
    )
