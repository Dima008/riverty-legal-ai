"""Numbers and data for the talk's cards (acts 2, 3, 5, 6), read from the register - never typed by hand.

The cards import web/src/deck/slides/deck-data.json; this script writes it. Run it again after the
register changed, and the cards follow:

    python -m tools.deck_data            # needs the built register; embeds one query (< $0.0001)

What it collects:
- embedding ruler: the query "limitation of liability" embedded once, every passage's cosine
  similarity to it, the k = 5 nearest, M14's planted note against M19's real German cap, and the
  similarities of a few passages to M01's liability section (the decoy lesson);
- register snapshot of the merchant agreements: the three required clauses, copy, former names;
- one contract through the pipeline (M18), the chunking comparison for M09, the M08 liability
  finding (model said vs register says), the M14 hidden note, coverage and cost totals;
- the Prompt Shields probe result from eval/results.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

from api.main import app
from pipeline import config, queries
from pipeline.llm import ModelAdapter
from pipeline.store import connect

OUT = config.ROOT / "web" / "src" / "deck" / "slides" / "deck-data.json"
QUERY = "limitation of liability"
K = 5
Q1_LACKING = ["M03", "M08", "M10", "M14", "M18"]          # data/gold_queries.json, Q1
REQUIRED = ["liability_limitation", "consumer_terms_checkout", "dpa_reference"]
LIABILITY = re.compile(r"liabil|haftung", re.I)
DECOY_ANCHOR = "M01:008"                                     # "7. Liability" of M01
DECOY_PASSAGES = ["M02:008", "M10:008", "M01:005", "M01:010", "M19:008"]


def group(doc_id: str) -> str:
    return doc_id[0] if doc_id[0] in "MVCH" else "?"


def embedding_map(con) -> dict:
    """Every passage as one dot on a ruler: how close its vector is to the question's vector
    (cosine similarity). A 2-D projection (PCA) was tried first and rejected: it sorts the dots by
    contract group and template, not by meaning, so 'near on the map' would have been misleading."""
    rows = con.execute("SELECT e.chunk_id, e.vector, c.doc_id, c.section_title FROM embeddings e "
                       "JOIN chunks c ON c.chunk_id = e.chunk_id ORDER BY c.doc_id, c.seq").fetchall()
    ids = [r["chunk_id"] for r in rows]
    mat = np.vstack([np.frombuffer(r["vector"], dtype=np.float32) for r in rows]).astype(np.float64)
    unit = mat / np.linalg.norm(mat, axis=1, keepdims=True)
    q = np.asarray(ModelAdapter(record=False).embed([QUERY], purpose="search")[0], dtype=np.float64)
    q /= np.linalg.norm(q)
    sims = unit @ q
    order = np.argsort(-sims)
    rank = {ids[i]: n + 1 for n, i in enumerate(order)}
    titles = {r["chunk_id"]: r["section_title"] for r in rows}
    spot = lambda cid, has_cap: {"id": cid, "title": titles[cid], "sim": round(float(sims[ids.index(cid)]), 3),  # noqa: E731
                                 "rank": rank[cid], "has_cap": has_cap}
    anchor = unit[ids.index(DECOY_ANCHOR)]
    return {
        "query": QUERY, "k": K, "passages": len(rows), "dims": int(mat.shape[1]),
        "points": [{"id": ids[i], "s": round(float(sims[i]), 3), "g": group(r["doc_id"]),
                    "lia": bool(LIABILITY.search(r["section_title"] or ""))} for i, r in enumerate(rows)],
        "near": [{"id": ids[i], "title": titles[ids[i]], "sim": round(float(sims[i]), 3)} for i in order[:K]],
        # the planted note in M14 (no cap) scores higher than M19's real cap in German
        "spots": [spot("M14:013", False), spot("M19:008", True)],
        "decoy": {"anchor": DECOY_ANCHOR, "anchor_title": titles[DECOY_ANCHOR],
                  "sims": [{"id": cid, "title": titles[cid], "sim": round(float(unit[ids.index(cid)] @ anchor), 3)}
                           for cid in DECOY_PASSAGES]},
    }


def register_snapshot(con) -> dict:
    docs = con.execute("SELECT d.doc_id, d.duplicate_of, m.counterparty_name FROM documents d JOIN metadata m "
                       "ON m.doc_id = d.doc_id WHERE m.doc_type = 'merchant_agreement' ORDER BY d.doc_id").fetchall()
    status = {(r["doc_id"], r["clause_type"]): r["status"]
              for r in con.execute("SELECT doc_id, clause_type, status FROM clauses")}
    names = {r["doc_id"]: r["n"] for r in con.execute(
        "SELECT doc_id, COUNT(*) AS n FROM name_hits WHERE resolved_by IS NULL GROUP BY doc_id")}
    rows = [{"id": d["doc_id"], "party": d["counterparty_name"], "copy_of": d["duplicate_of"],
             "cells": [status.get((d["doc_id"], c), "UNCLEAR") for c in REQUIRED],
             "former_names": names.get(d["doc_id"], 0)} for d in docs]
    return {"clauses": ["Limitation of liability", "Consumer terms in checkout", "Data processing agreement"],
            "rows": rows, "documents": con.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
            "passages": con.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]}


def chunking_m09(client) -> dict:
    data = client.get("/documents/M09/chunks", params={"compare": "fixed", "size": 2000}).json()
    sections = [{"title": c["section_title"], "start": c["char_start"], "end": c["char_end"]} for c in data["chunks"]]
    liability = next(s for s in sections if LIABILITY.search(s["title"]))
    fixed = [{"start": w["char_start"], "end": w["char_end"]} for w in data["fixed"]["windows"]]
    return {"length": data["text_length"], "page_break": data["page_offsets"][1], "sections": sections,
            "fixed": fixed, "liability": liability, "fixed_size": data["fixed"]["size"],
            "cut_by_fixed": data["fixed"]["cut_sections"]}


def finding(con, doc_id: str, clause: str) -> dict:
    r = con.execute("SELECT status, model_status, quote, quote_score, confidence, flags, section, page "
                    "FROM clauses WHERE doc_id=? AND clause_type=?", (doc_id, clause)).fetchone()
    return {**dict(r), "flags": json.loads(r["flags"] or "[]")}


def main() -> None:
    con = connect()
    client = TestClient(app)
    hidden = con.execute("SELECT text FROM chunks WHERE chunk_id='M14:013'").fetchone()["text"]
    probe = json.loads(sorted((config.ROOT / "eval" / "results").glob("*_prompt_shields_probe.json"))[-1].read_text(encoding="utf-8"))
    data = {
        "embedding": embedding_map(con),
        "register": register_snapshot(con),
        "m18": client.get("/documents/M18/journey").json(),
        "m09": chunking_m09(client),
        "m08": finding(con, "M08", "liability_limitation"),
        "m14": {"note": hidden.strip(), "finding": finding(con, "M14", "liability_limitation")},
        "costs": queries.costs(con),
        "prompt_shields": {"cases": probe["cases"], "chunks": probe["register"]["chunks"],
                           "flagged": [f["chunk_id"] for f in probe["register"]["flagged"]],
                           "characters": probe["register"]["characters"]},
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    e = data["embedding"]
    print(f"written {OUT.relative_to(config.ROOT)}: {e['passages']} passages, nearest {[n['id'] for n in e['near']]}, spots {e['spots']}, "
          f"decoy {[(s['id'], s['sim']) for s in e['decoy']['sims']]}, M09 cut by the fixed size: {data['m09']['cut_by_fixed']}")


if __name__ == "__main__":
    main()
