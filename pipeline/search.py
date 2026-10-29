"""Hybrid search over the register: metadata filter first, then BM25 + vectors, fused with RRF.

Exact terms (names, "Art. 28") are found by full text; paraphrases ("neither side will
have to pay more than ...") by vectors. Reciprocal Rank Fusion combines both lists
without having to calibrate their scores against each other.
"""

from __future__ import annotations

import re

import numpy as np

from . import config

RRF_K = 60


def _fts_query(text: str) -> str:
    tokens = [t for t in re.findall(r"\w+", text.lower()) if len(t) > 2]
    return " OR ".join(f'"{t}"' for t in tokens[:30])


def _allowed(con, filters: dict | None) -> set[str] | None:
    if not filters:
        return None
    sql, args = "SELECT m.doc_id FROM metadata m JOIN documents d ON d.doc_id = m.doc_id WHERE d.duplicate_of IS NULL", []
    for col in ("doc_type", "governing_law", "language"):
        if filters.get(col):
            sql += f" AND m.{col} = ?"
            args.append(filters[col])
    if filters.get("doc_ids"):
        sql += f" AND m.doc_id IN ({','.join('?' * len(filters['doc_ids']))})"
        args += list(filters["doc_ids"])
    return {r[0] for r in con.execute(sql, args)}


def hybrid_search(con, adapter, query: str, filters: dict | None = None, k: int = 10) -> list[dict]:
    allowed = _allowed(con, filters)
    ranked: dict[str, float] = {}

    fts = con.execute("SELECT chunk_id, doc_id FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) "
                      "LIMIT 200", (_fts_query(query),)).fetchall() if _fts_query(query) else []
    fts = [r["chunk_id"] for r in fts if allowed is None or r["doc_id"] in allowed]
    for rank, cid in enumerate(fts[:50]):
        ranked[cid] = ranked.get(cid, 0) + 1 / (RRF_K + rank + 1)

    qv = np.asarray(adapter.embed([query], purpose="search")[0], dtype=np.float32)
    rows = con.execute("SELECT e.chunk_id, c.doc_id, e.vector FROM embeddings e JOIN chunks c ON c.chunk_id = e.chunk_id "
                       "WHERE e.model = ?", (config.EMBED_DEPLOYMENT,)).fetchall()
    rows = [r for r in rows if allowed is None or r["doc_id"] in allowed]
    if rows:
        mat = np.vstack([np.frombuffer(r["vector"], dtype=np.float32) for r in rows])
        sims = mat @ qv / (np.linalg.norm(mat, axis=1) * np.linalg.norm(qv) + 1e-9)
        for rank, i in enumerate(np.argsort(-sims)[:50]):
            cid = rows[i]["chunk_id"]
            ranked[cid] = ranked.get(cid, 0) + 1 / (RRF_K + rank + 1)

    top = sorted(ranked.items(), key=lambda x: -x[1])[:k]
    out = []
    for cid, score in top:
        c = con.execute("SELECT chunk_id, doc_id, section_title, page_start, page_end, text FROM chunks "
                        "WHERE chunk_id=?", (cid,)).fetchone()
        out.append({**dict(c), "score": round(score, 4)})
    return out
