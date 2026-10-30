"""Read-only endpoints over the register: overview, documents, evidence and the pipeline explorer.

Everything here shows stored results. The only endpoint that calls a model is /search (one
embedding for the question, recorded in llm_calls).
"""

from __future__ import annotations

import json
import re
import sqlite3
from collections import Counter
from functools import lru_cache
from pathlib import Path

import pymupdf
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response

from pipeline import catalogue, chunking, config, extract, queries, search
from pipeline.chunking import page_of
from pipeline.evidence import quote_boxes, text_boxes

from .deps import get_adapter, get_con

router = APIRouter()


# ---------------------------------------------------------------------------- helpers
def _json(value: str | None, default):
    return json.loads(value) if value else default


def _document(con: sqlite3.Connection, doc_id: str) -> sqlite3.Row:
    row = con.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"{doc_id} is not in the register")
    return row


def _source_files(doc: sqlite3.Row) -> list[Path]:
    """Source files of a document, resolved inside data/ only (never serve anything else)."""
    files = []
    for rel in doc["source_path"].split(";"):
        path = (config.ROOT / rel).resolve()
        if config.DATA.resolve() not in path.parents:
            raise HTTPException(403, "source file outside the data folder")
        files.append(path)
    return files


def guardrail_layers(r: dict, flags: list[str]) -> list[dict]:
    """The guardrail sandwich of one finding, layer by layer: what the model said, what every
    deterministic check and the checker found, and what the register made of it.
    passed: True = check passed, False = check failed, None = no verdict."""
    names = {f.split(":")[0] for f in flags}
    detail = {f.split(":")[0]: f.partition(": ")[2] for f in flags}
    layers = [{"layer": "model", "result": r["model_status"], "detail": r["rationale"]}]
    if r["model_status"] == "PRESENT":
        layers += [
            {"layer": "quote_found_in_source", "passed": bool(r["quote_verified"]),
             "detail": f"match {r['quote_score']}" + (f", page {r['page']}" if r["page"] else "")},
            {"layer": "quote_not_from_suspected_injection", "passed": "quote_in_suspected_injection" not in names},
            {"layer": "quote_has_clause_vocabulary", "passed": "quote_lacks_clause_terms" not in names},
            {"layer": "checker_four_eyes",
             "passed": True if "checker_agreed" in names else False if "checker_rejected" in names else None,
             "detail": detail.get("checker_rejected")},
        ]
    elif r["model_status"] == "ABSENT":
        layers.append({"layer": "no_absence_signal", "passed": "signal_despite_absent" not in names,
                       "detail": detail.get("signal_despite_absent")})
    doc_signals = [n for n in ("low_ocr_quality", "ocr_text", "document_contains_suspected_injection") if n in names]
    layers.append({"layer": "document_signals", "passed": not doc_signals, "detail": ", ".join(doc_signals) or None})
    layers.append({"layer": "register", "result": r["status"], "detail": f"confidence {r['confidence']}"})
    return layers


# ---------------------------------------------------------------------------- overview
@router.get("/summary")
def summary(con: sqlite3.Connection = Depends(get_con)) -> dict:
    """The register at a glance: what is in it, how it was built, what it cost."""
    docs = con.execute("SELECT d.doc_id, d.status, d.duplicate_of, d.flags, m.doc_type, m.prompt_version, m.model "
                       "FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id").fetchall()
    clause_status: dict[str, dict[str, int]] = {}
    for r in con.execute("SELECT clause_type, status, COUNT(*) n FROM clauses GROUP BY clause_type, status"):
        clause_status.setdefault(r["clause_type"], {})[r["status"]] = r["n"]
    return {
        "documents": len(docs),
        "extracted": sum(1 for d in docs if d["doc_type"]),
        "by_type": dict(Counter(d["doc_type"] or "not extracted" for d in docs)),
        "by_status": dict(Counter(d["status"] for d in docs)),
        "duplicates": {d["doc_id"]: d["duplicate_of"] for d in docs if d["duplicate_of"]},
        "flagged_documents": {d["doc_id"]: _json(d["flags"], []) for d in docs if _json(d["flags"], [])},
        "clause_status": clause_status,
        "findings_changed_by_checks": con.execute("SELECT COUNT(*) FROM clauses WHERE status != model_status")
                                         .fetchone()[0],
        "prompt_versions": sorted({d["prompt_version"] for d in docs if d["prompt_version"]}),
        "models": sorted({d["model"] for d in docs if d["model"]}),
        "cost": queries.costs(con),
    }


@router.get("/catalogue")
def clause_catalogue() -> dict:
    """Legal's playbook as data: clause definitions and where they are required."""
    return {"prompt_version": config.PROMPT_VERSION,
            "clauses": {k: {"label": c["label"], "definition": c["definition"], "required_for": c["required_for"]}
                        for k, c in catalogue.CLAUSES.items()}}


# ---------------------------------------------------------------------------- documents
@router.get("/documents")
def list_documents(doc_type: str | None = None, con: sqlite3.Connection = Depends(get_con)) -> list[dict]:
    sql = ("SELECT d.doc_id, d.format, d.status, d.page_count, d.language, d.family_id, d.duplicate_of, d.flags, "
           "m.doc_type, m.title, m.counterparty_name, m.effective_date, m.governing_law, m.is_amendment "
           "FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id")
    args: list = []
    if doc_type:
        sql += " WHERE m.doc_type = ?"
        args.append(doc_type)
    rows = [dict(r) for r in con.execute(sql + " ORDER BY d.doc_id", args)]
    for r in rows:
        r["flags"] = _json(r["flags"], [])
        r["is_amendment"] = bool(r["is_amendment"])
    return rows


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, con: sqlite3.Connection = Depends(get_con)) -> dict:
    d = _document(con, doc_id)
    m = con.execute("SELECT * FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()
    meta = None
    if m:
        meta = {k: m[k] for k in m.keys() if k not in ("raw_json", "parties_json")}
        meta["parties"] = _json(m["parties_json"], [])
        meta["is_amendment"] = bool(m["is_amendment"])
    return {
        "doc_id": doc_id,
        "source_files": [Path(p).name for p in d["source_path"].split(";")],
        "format": d["format"], "status": d["status"], "language": d["language"],
        "page_count": d["page_count"], "ocr_mean_conf": d["ocr_mean_conf"],
        "flags": _json(d["flags"], []),
        "family_id": d["family_id"], "duplicate_of": d["duplicate_of"],
        "family": [r[0] for r in con.execute("SELECT doc_id FROM documents WHERE family_id=? ORDER BY doc_id",
                                             (d["family_id"],))],
        "metadata": meta,
        "legacy_names": [dict(r) for r in con.execute(
            "SELECT name, page, snippet, resolved_by FROM name_hits WHERE doc_id=? ORDER BY char_start", (doc_id,))],
        "pages": [dict(r) for r in con.execute(
            "SELECT page_no, source, ocr_conf, width, height FROM pages WHERE doc_id=? ORDER BY page_no", (doc_id,))],
    }


@router.get("/documents/{doc_id}/findings")
def get_findings(doc_id: str, con: sqlite3.Connection = Depends(get_con)) -> list[dict]:
    """Every clause finding with its evidence and the guardrail layers that produced its status."""
    _document(con, doc_id)
    m = con.execute("SELECT doc_type FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()
    out = []
    for row in con.execute("SELECT * FROM clauses WHERE doc_id=? ORDER BY clause_type", (doc_id,)):
        r = dict(row)
        flags = _json(r["flags"], [])
        clause = catalogue.CLAUSES[r["clause_type"]]
        out.append({
            "clause_type": r["clause_type"], "label": clause["label"],
            "required": bool(m and m["doc_type"] in clause["required_for"]),
            "status": r["status"], "model_status": r["model_status"],
            "changed_by_checks": r["status"] != r["model_status"],
            "confidence": r["confidence"], "rationale": r["rationale"],
            "quote": r["quote"], "quote_verified": bool(r["quote_verified"]), "quote_score": r["quote_score"],
            "page": r["page"], "char_start": r["char_start"], "char_end": r["char_end"],
            "section": r["section"], "chunk_id": r["chunk_id"],
            "flags": flags, "layers": guardrail_layers(r, flags),
            "model": r["model"], "prompt_version": r["prompt_version"],
        })
    return out


@router.get("/documents/{doc_id}/findings/{clause_type}/highlight")
def get_highlight(doc_id: str, clause_type: str, con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Word boxes for the evidence view. kind=quote: the finding's quote. kind=signal: no quote
    (clause missing), but a passage that hints at the clause - e.g. the injected note in M14."""
    d = _document(con, doc_id)
    r = con.execute("SELECT quote, page, char_start, char_end, flags FROM clauses WHERE doc_id=? AND clause_type=?",
                    (doc_id, clause_type)).fetchone()
    if r is None:
        raise HTTPException(404, f"no finding {clause_type} for {doc_id}")
    if r["quote"]:
        return {"kind": "quote", "char_start": r["char_start"], "char_end": r["char_end"],
                **quote_boxes(con, doc_id, r["quote"], r["page"])}
    signal = next((f for f in _json(r["flags"], []) if f.startswith("signal_despite_absent")), None)
    if signal:
        # the stored snippet is cut at fixed offsets: drop the possibly partial first and last word
        words = signal.partition(": ")[2].strip("'").split()[1:-1]
        for page_no in range(1, (d["page_count"] or 0) + 1):
            found = quote_boxes(con, doc_id, " ".join(words), page_no)
            if found["pages"]:
                return {"kind": "signal", "char_start": None, "char_end": None, **found}
    return {"kind": "none", "char_start": None, "char_end": None, "coverage": 0.0, "pages": []}


@router.get("/documents/{doc_id}/text")
def get_text(doc_id: str, con: sqlite3.Connection = Depends(get_con)) -> dict:
    """The cleaned document text the model read; findings point into it with char offsets."""
    _document(con, doc_id)
    t = con.execute("SELECT text, page_offsets_json FROM doc_text WHERE doc_id=?", (doc_id,)).fetchone()
    if t is None:
        raise HTTPException(404, f"no text for {doc_id}")
    return {"doc_id": doc_id, "text": t["text"], "page_offsets": json.loads(t["page_offsets_json"])}


# ---------------------------------------------------------------------------- pages
@router.get("/documents/{doc_id}/pages/{page_no}")
def get_page(doc_id: str, page_no: int, con: sqlite3.Connection = Depends(get_con)) -> dict:
    """One page: raw text, where it came from (text layer or OCR), and every word with its box."""
    d = _document(con, doc_id)
    r = con.execute("SELECT * FROM pages WHERE doc_id=? AND page_no=?", (doc_id, page_no)).fetchone()
    if r is None:
        raise HTTPException(404, f"{doc_id} has no page {page_no}")
    return {"doc_id": doc_id, "page_no": page_no, "source": r["source"], "ocr_conf": r["ocr_conf"],
            "width": r["width"], "height": r["height"], "text": r["text"],
            "words": _json(r["words_json"], []), "has_image": d["format"] != "txt"}


@router.get("/documents/{doc_id}/pages/{page_no}/locate")
def locate_text(doc_id: str, page_no: int, q: str = Query(..., min_length=2, max_length=200),
                con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Boxes of every occurrence of a short text on a page, e.g. a former company name."""
    _document(con, doc_id)
    return {"page": page_no, "boxes": text_boxes(con, doc_id, q, page_no)}


@lru_cache(maxsize=128)
def _render_pdf_page(path: str, page_no: int, dpi: int) -> bytes:
    with pymupdf.open(path) as pdf:
        return pdf[page_no - 1].get_pixmap(dpi=dpi).tobytes("png")


def _page_index(path: Path) -> int:
    m = re.search(r"_p(\d+)$", path.stem, re.IGNORECASE)
    return int(m.group(1)) if m else 1


@router.get("/documents/{doc_id}/pages/{page_no}/image")
def get_page_image(doc_id: str, page_no: int, dpi: int = Query(110, ge=50, le=200),
                   con: sqlite3.Connection = Depends(get_con)):
    """The page as an image. PDFs are rendered on the server, JPEG scans are served as they are."""
    d = _document(con, doc_id)
    if not 1 <= page_no <= (d["page_count"] or 0):
        raise HTTPException(404, f"{doc_id} has no page {page_no}")
    files = _source_files(d)
    if d["format"].startswith("pdf"):
        return Response(_render_pdf_page(str(files[0]), page_no, dpi), media_type="image/png")
    if d["format"] == "jpeg":
        return FileResponse(sorted(files, key=_page_index)[page_no - 1], media_type="image/jpeg")
    raise HTTPException(404, "plain-text document: no page image, use /text")


# ---------------------------------------------------------------------------- pipeline explorer
@router.get("/documents/{doc_id}/chunks")
def get_chunks(doc_id: str, compare: str | None = Query(None, pattern="^fixed$"),
               size: int = Query(2000, ge=200, le=10000), con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Our chunks (cut at clause headings) and, with compare=fixed, fixed-size windows of `size`
    characters for comparison (~500 tokens = ~2000 characters), including the sections they cut."""
    _document(con, doc_id)
    t = con.execute("SELECT text, page_offsets_json FROM doc_text WHERE doc_id=?", (doc_id,)).fetchone()
    if t is None:
        raise HTTPException(404, f"no text for {doc_id}")
    text, offsets = t["text"], json.loads(t["page_offsets_json"])
    rows = [dict(r) for r in con.execute(
        "SELECT chunk_id, seq, section_title, page_start, page_end, char_start, char_end, context, text "
        "FROM chunks WHERE doc_id=? ORDER BY seq", (doc_id,))]
    out = {"doc_id": doc_id, "text_length": len(text), "page_offsets": offsets,
           "max_chunk_chars": chunking.MAX_CHUNK_CHARS, "chunks": rows}
    if compare == "fixed":
        windows = [(s, min(s + size, len(text))) for s in range(0, len(text), size)]
        cuts = [s for s, _ in windows[1:]]
        out["fixed"] = {
            "size": size,
            "windows": [{"char_start": s, "char_end": e, "page_start": page_of(offsets, s),
                         "page_end": page_of(offsets, max(s, e - 1))} for s, e in windows],
            "cut_sections": [r["section_title"] for r in rows
                             if any(r["char_start"] < c < r["char_end"] for c in cuts)],
        }
    return out


@router.get("/documents/{doc_id}/prompt")
def get_prompt(doc_id: str, con: sqlite3.Connection = Depends(get_con)) -> dict:
    """The extraction prompt for this contract, rebuilt from the register. Identical to what was
    sent as long as the stored prompt_version equals the current one."""
    _document(con, doc_id)
    if con.execute("SELECT 1 FROM doc_text WHERE doc_id=?", (doc_id,)).fetchone() is None:
        raise HTTPException(404, f"no text for {doc_id}")
    requests, sections, _ = extract.prepare(con, doc_id)
    stored = con.execute("SELECT prompt_version FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()
    return {"prompt_version": config.PROMPT_VERSION, "stored_prompt_version": stored[0] if stored else None,
            "model": config.CHAT_DEPLOYMENT, "sections": len(sections),
            "parts": [{"part": i, "messages": m} for i, m in enumerate(requests, 1)],
            "output_schema": extract.EXTRACTION_SCHEMA, "checker_prompt": extract.CHECKER_PROMPT}


@router.get("/search")
def search_chunks(q: str = Query(..., min_length=2, max_length=500), doc_type: str | None = None,
                  k: int = Query(10, ge=1, le=50), con: sqlite3.Connection = Depends(get_con),
                  adapter=Depends(get_adapter)) -> dict:
    """Hybrid search for open questions, with both input rankings (BM25, vector) next to the fused one."""
    filters = {"doc_type": doc_type} if doc_type else None
    return {"query": q, "filters": filters, **search.hybrid_search(con, adapter, q, filters, k, explain=True)}
