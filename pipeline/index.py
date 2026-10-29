"""Search index: contextual chunks in full text (FTS5/BM25) and as vectors.

Each chunk gets a short context line from the register (contract, parties,
date, law, section) before it is indexed. A chunk "7.2 ... limited to the fees"
alone does not say whose contract it is; with the context line it does.
"""

from __future__ import annotations

import numpy as np

from . import config
from .store import transaction

EMBED_BATCH = 16   # small batches stay below the tokens-per-minute limit of the S0 tier
EMBED_MAX_CHARS = 8000


def _context(meta, section: str) -> str:
    parts = [meta["title"] or meta["doc_id"], (meta["doc_type"] or "").replace("_", " ")]
    if meta["own_entity_name"] or meta["counterparty_name"]:
        parts.append(" / ".join(p for p in (meta["own_entity_name"], meta["counterparty_name"]) if p))
    if meta["effective_date"]:
        parts.append(f"dated {meta['effective_date']}")
    if meta["governing_law"]:
        parts.append(f"law {meta['governing_law']}")
    parts.append(f"section: {section}")
    return " | ".join(parts)


def contextualise(con, doc_ids: list[str]) -> None:
    for doc_id in doc_ids:
        meta = con.execute("SELECT * FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()
        if meta is None:
            continue
        rows = con.execute("SELECT chunk_id, section_title, text, context FROM chunks WHERE doc_id=?",
                           (doc_id,)).fetchall()
        with transaction(con):
            con.execute("DELETE FROM chunks_fts WHERE doc_id=?", (doc_id,))
            for r in rows:
                ctx = _context(meta, r["section_title"])
                con.execute("UPDATE chunks SET context=? WHERE chunk_id=?", (ctx, r["chunk_id"]))
                con.execute("INSERT INTO chunks_fts (chunk_id, doc_id, text) VALUES (?,?,?)",
                            (r["chunk_id"], doc_id, f"{ctx}\n{r['text']}"))
                if ctx != r["context"]:   # re-embed only if the context line changed
                    con.execute("DELETE FROM embeddings WHERE chunk_id=?", (r["chunk_id"],))


def embed_missing(con, adapter) -> int:
    rows = con.execute(
        "SELECT c.chunk_id, c.context, c.text FROM chunks c LEFT JOIN embeddings e ON e.chunk_id = c.chunk_id "
        "WHERE c.context IS NOT NULL AND (e.chunk_id IS NULL OR e.model != ?)", (config.EMBED_DEPLOYMENT,)).fetchall()
    for i in range(0, len(rows), EMBED_BATCH):
        batch = rows[i:i + EMBED_BATCH]
        vectors = adapter.embed([f"{r['context']}\n\n{r['text']}"[:EMBED_MAX_CHARS] for r in batch])
        with transaction(con):
            for r, v in zip(batch, vectors):
                arr = np.asarray(v, dtype=np.float32)
                con.execute("INSERT OR REPLACE INTO embeddings VALUES (?,?,?,?)",
                            (r["chunk_id"], config.EMBED_DEPLOYMENT, arr.size, arr.tobytes()))
    return len(rows)
