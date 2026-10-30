"""Hybrid search over the register: metadata filter first, then BM25 + vectors, fused with RRF.
With a filter, duplicates are left out (the original is searched).

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


def bm25_ranking(con, query: str, allowed: set[str] | None, depth: int = 50) -> list[str]:
    """Full-text list: chunk ids ordered by BM25 (exact words; rare words count more). The
    metadata filter is part of the query, so it applies before the list is cut to `depth` (F15)."""
    fts_query = _fts_query(query)
    if not fts_query or allowed == set():
        return []
    sql, args = "SELECT chunk_id FROM chunks_fts WHERE chunks_fts MATCH ?", [fts_query]
    if allowed is not None:
        sql += f" AND doc_id IN ({','.join('?' * len(allowed))})"
        args += sorted(allowed)
    rows = con.execute(sql + " ORDER BY bm25(chunks_fts) LIMIT ?", [*args, depth]).fetchall()
    return [r["chunk_id"] for r in rows]


def vector_ranking(con, adapter, query: str, allowed: set[str] | None, depth: int = 50) -> list[tuple[str, float]]:
    """Meaning list: (chunk id, cosine similarity), most similar first (finds paraphrases)."""
    qv = np.asarray(adapter.embed([query], purpose="search")[0], dtype=np.float32)
    rows = con.execute("SELECT e.chunk_id, c.doc_id, e.vector FROM embeddings e JOIN chunks c ON c.chunk_id = e.chunk_id "
                       "WHERE e.model = ?", (config.EMBED_DEPLOYMENT,)).fetchall()
    rows = [r for r in rows if allowed is None or r["doc_id"] in allowed]
    if not rows:
        return []
    mat = np.vstack([np.frombuffer(r["vector"], dtype=np.float32) for r in rows])
    sims = mat @ qv / (np.linalg.norm(mat, axis=1) * np.linalg.norm(qv) + 1e-9)
    return [(rows[i]["chunk_id"], float(sims[i])) for i in np.argsort(-sims)[:depth]]


def rrf(*rankings: list[str]) -> list[tuple[str, float]]:
    """Reciprocal Rank Fusion: score = sum of 1 / (60 + rank) over all lists. Only ranks count,
    so BM25 scores and cosine similarities never have to be calibrated against each other."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, cid in enumerate(ranking):
            scores[cid] = scores.get(cid, 0) + 1 / (RRF_K + rank + 1)
    return sorted(scores.items(), key=lambda x: -x[1])


def _chunk(con, cid: str) -> dict:
    return dict(con.execute("SELECT chunk_id, doc_id, section_title, page_start, page_end, text FROM chunks "
                            "WHERE chunk_id=?", (cid,)).fetchone())


def hybrid_search(con, adapter, query: str, filters: dict | None = None, k: int = 10,
                  explain: bool = False) -> list[dict] | dict:
    """Top-k chunks for open questions. explain=True also returns both input lists (pipeline explorer)."""
    allowed = _allowed(con, filters)
    bm25 = bm25_ranking(con, query, allowed)
    vector = vector_ranking(con, adapter, query, allowed)
    fused = [{**_chunk(con, cid), "score": round(score, 4)} for cid, score in rrf(bm25, [c for c, _ in vector])[:k]]
    if not explain:
        return fused
    return {
        "bm25": [{**_chunk(con, cid), "rank": i + 1} for i, cid in enumerate(bm25[:k])],
        "vector": [{**_chunk(con, cid), "rank": i + 1, "similarity": round(sim, 4)}
                   for i, (cid, sim) in enumerate(vector[:k])],
        "fused": fused,
    }
