"""Read-only endpoints over the register: overview, changes, documents, evidence and the pipeline explorer.

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

from pipeline import catalogue, chunking, compare, config, extract, queries, search
from pipeline.chunking import page_of
from pipeline.evidence import quote_boxes, text_boxes
from pipeline.store import now

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


@router.get("/matrix")
def contract_matrix(con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Every document against Legal's playbook: one row per document, one cell per clause type,
    plus open and resolved former company names - and whether a poor scan leaves a former name
    open (`former_names.not_ruled_out`, F19). The comparison standard is the catalogue
    (definition and the document types where a clause is required). No model call."""
    clauses = {k: {"label": c["label"], "definition": c["definition"], "required_for": c["required_for"]}
               for k, c in catalogue.CLAUSES.items()}
    cells: dict[str, dict] = {}
    for r in con.execute("SELECT doc_id, clause_type, status, model_status, confidence FROM clauses"):
        cells.setdefault(r["doc_id"], {})[r["clause_type"]] = {
            "status": r["status"], "model_status": r["model_status"], "confidence": r["confidence"]}
    names: dict[str, dict] = {}
    for r in con.execute("SELECT doc_id, SUM(resolved_by IS NULL) open, SUM(resolved_by IS NOT NULL) resolved "
                         "FROM name_hits GROUP BY doc_id"):
        names[r["doc_id"]] = {"open": r["open"], "resolved": r["resolved"]}
    stage = queries.stages(con)
    rows = []
    for r in con.execute(
            "SELECT d.doc_id, d.format, d.status AS ingest_status, d.ocr_mean_conf, d.family_id, d.duplicate_of,"
            " d.flags, d.ingested_at, m.doc_type, m.title, m.counterparty_name, m.effective_date, m.governing_law,"
            " m.law_quote_verified, m.law_flags, m.language, m.is_amendment"
            " FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id ORDER BY d.doc_id"):
        row = dict(r)
        row["stage"] = stage[row["doc_id"]]
        row["flags"] = _json(row["flags"], [])
        row["is_amendment"] = bool(row["is_amendment"])
        # the law's evidence (decision 94): null = not checked yet (read before extract-v3)
        law_flags = queries.law_flag_list(row.pop("law_flags"))
        row["law_quote_verified"] = None if row["law_quote_verified"] is None else bool(row["law_quote_verified"])
        row["law_reason"] = queries.law_reason(row["ingest_status"], row["ocr_mean_conf"], row["governing_law"], law_flags)
        row["cells"] = cells.get(row["doc_id"], {})
        for key, cell in row["cells"].items():
            cell["required"] = row["doc_type"] in clauses[key]["required_for"]
        row["gaps"] = sorted(k for k, c in row["cells"].items() if c["required"] and c["status"] != "PRESENT")
        n = names.get(row["doc_id"], {"open": 0, "resolved": 0})
        row["former_names"] = queries.former_names(row["ingest_status"], row["ocr_mean_conf"], n["open"], n["resolved"])
        rows.append(row)
    return {"clauses": clauses, "rows": rows}


@router.get("/compare")
def compare_contracts(a: str = Query(..., description="first contract, e.g. M15"),
                      b: str = Query(..., description="second contract, e.g. M01"),
                      con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Two contracts side by side: relation (duplicate, family), similarity, metadata differences,
    every playbook clause for both, and the text section by section with word differences."""
    if a == b:
        raise HTTPException(422, "choose two different contracts")
    result = compare.compare(con, a, b)
    if result is None:
        raise HTTPException(404, f"{a} or {b} is not in the register")
    return result


@router.get("/catalogue")
def clause_catalogue() -> dict:
    """Legal's playbook as data: clause definitions and where they are required."""
    return {"prompt_version": config.PROMPT_VERSION,
            "clauses": {k: {"label": c["label"], "definition": c["definition"], "required_for": c["required_for"]}
                        for k, c in catalogue.CLAUSES.items()}}


# ---------------------------------------------------------------------------- changes
EVENTS = ("ingested", "ingest_failed", "extracted", "extraction_failed", "forgotten")
EVENT_DETAILS = ("format", "pages", "status", "ocr_mean_conf", "model", "prompt_version", "error")   # never a path
MAX_EVENTS = 200


@router.get("/changes")
def register_changes(after: int | None = Query(None, ge=0, description="the register version the client has seen"),
                     con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Did the register change since version `after`? The version is the highest audit_log id - the
    same idea as a Graph delta link. Without `after` the events are empty: the cheap poll. With it,
    the pipeline events since then (a contract arrived, was read, reading failed, was removed),
    oldest first, at most the newest 200. `reset`: the client is ahead of the register (it was
    rebuilt) and reloads everything. Read-only."""
    version = queries.register_version(con)
    rows = []
    if after is not None:
        rows = con.execute(f"SELECT id, ts, action, target, details_json FROM audit_log WHERE id > ? AND action IN"
                           f" ({', '.join('?' * len(EVENTS))}) ORDER BY id DESC LIMIT ?",
                           (after, *EVENTS, MAX_EVENTS + 1)).fetchall()
    events = []
    for r in reversed(rows[:MAX_EVENTS]):
        details = {k: v for k, v in _json(r["details_json"], {}).items() if k in EVENT_DETAILS}
        if "error" in details:
            details["error"] = str(details["error"])[:200]
        events.append({"id": r["id"], "ts": r["ts"], "action": r["action"], "doc_id": r["target"], "details": details})
    return {"version": version, "now": now(), "documents": con.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
            "reset": after is not None and after > version, "more": len(rows) > MAX_EVENTS, "events": events}


# ---------------------------------------------------------------------------- documents
@router.get("/documents")
def list_documents(doc_type: str | None = None, con: sqlite3.Connection = Depends(get_con)) -> list[dict]:
    """Every document, also one that is still being read (doc_type null) - the live-add card counts them."""
    sql = ("SELECT d.doc_id, d.format, d.status, d.page_count, d.language, d.family_id, d.duplicate_of, d.flags, "
           "d.ingested_at, m.doc_type, m.title, m.counterparty_name, m.effective_date, m.governing_law, m.is_amendment "
           "FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id")
    args: list = []
    if doc_type:
        sql += " WHERE m.doc_type = ?"
        args.append(doc_type)
    rows = [dict(r) for r in con.execute(sql + " ORDER BY d.doc_id", args)]
    stage = queries.stages(con)
    for r in rows:
        r["stage"] = stage[r["doc_id"]]
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
        # the law's evidence (decision 94): quote, page, span and the failed checks; null = not checked yet
        meta["law_flags"] = queries.law_flag_list(m["law_flags"])
        meta["law_quote_verified"] = None if m["law_quote_verified"] is None else bool(m["law_quote_verified"])
        meta["law_reason"] = queries.law_reason(d["status"], d["ocr_mean_conf"], m["governing_law"], meta["law_flags"])
    names = [dict(r) for r in con.execute(
        "SELECT name, page, snippet, resolved_by FROM name_hits WHERE doc_id=? ORDER BY char_start", (doc_id,))]
    resolved = sum(1 for h in names if h["resolved_by"])
    return {
        "doc_id": doc_id,
        "source_files": [Path(p).name for p in d["source_path"].split(";")],
        "format": d["format"], "status": d["status"], "language": d["language"],
        "page_count": d["page_count"], "ocr_mean_conf": d["ocr_mean_conf"],
        # when it arrived (the first ingest, F14), when the model read it, and where it stands now
        "ingested_at": d["ingested_at"], "extracted_at": m["extracted_at"] if m else None,
        "stage": queries.stages(con)[doc_id],
        "flags": _json(d["flags"], []),
        "family_id": d["family_id"], "duplicate_of": d["duplicate_of"],
        # both directions, so the file of a copy leads to its original and the original to its copies
        "copies": [r[0] for r in con.execute("SELECT doc_id FROM documents WHERE duplicate_of=? ORDER BY doc_id",
                                             (doc_id,))],
        "family": [r[0] for r in con.execute("SELECT doc_id FROM documents WHERE family_id=? ORDER BY doc_id",
                                             (d["family_id"],))],
        "metadata": meta,
        "legacy_names": names,
        # the legacy-name answer for this document: on a poor scan without an exact match a former
        # name cannot be ruled out - a person reads the page (F19, decision 89)
        "former_names": queries.former_names(d["status"], d["ocr_mean_conf"], len(names) - resolved, resolved),
        "pages": [dict(r) for r in con.execute(
            "SELECT page_no, source, ocr_conf, width, height FROM pages WHERE doc_id=? ORDER BY page_no", (doc_id,))],
    }


@router.get("/documents/{doc_id}/journey")
def get_journey(doc_id: str, con: sqlite3.Connection = Depends(get_con)) -> dict:
    """One contract station by station through the pipeline, from what the register recorded:
    pages and OCR, clause sections, the extraction and checker calls with tokens, seconds and
    cents, the findings and how many the checks changed, the family, the search index. No model
    call; nothing is estimated. Embeddings are made in batches across contracts, so their cost
    cannot be assigned to one contract - only their number is shown."""
    d = _document(con, doc_id)
    m = con.execute("SELECT * FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()

    def last_call(purpose: str) -> dict | None:
        r = con.execute("SELECT model, prompt_tokens, completion_tokens, cached_tokens, cost_usd, latency_ms "
                        "FROM llm_calls WHERE doc_id=? AND purpose=? ORDER BY id DESC LIMIT 1", (doc_id, purpose)).fetchone()
        return None if r is None else {**dict(r), "seconds": round(r["latency_ms"] / 1000, 1)}

    count = lambda sql: con.execute(sql, (doc_id,)).fetchone()[0]
    findings = [dict(r) for r in con.execute("SELECT clause_type, status, model_status FROM clauses WHERE doc_id=?", (doc_id,))]
    required = {k for k, c in catalogue.CLAUSES.items() if m and m["doc_type"] in c["required_for"]}
    extract, check = last_call("extract"), last_call("check")
    stations = [
        {"station": "ingest", "facts": {"format": d["format"], "pages": d["page_count"], "status": d["status"],
                                        "ocr_confidence": d["ocr_mean_conf"] and round(d["ocr_mean_conf"], 1),
                                        "language": d["language"]}},
        {"station": "chunking", "facts": {"sections": count("SELECT COUNT(*) FROM chunks WHERE doc_id=?")}},
        {"station": "extract", "facts": extract and {**extract, "prompt_version": m["prompt_version"] if m else None}},
        {"station": "checks", "facts": {
            "checker": check,
            "findings": {s: sum(f["status"] == s for f in findings) for s in ("PRESENT", "ABSENT", "UNCLEAR")},
            "changed_by_checks": sum(f["status"] != f["model_status"] for f in findings),
            "flags": _json(d["flags"], [])}},
        {"station": "families", "facts": {
            "family_id": d["family_id"], "duplicate_of": d["duplicate_of"],
            "former_names_open": count("SELECT COUNT(*) FROM name_hits WHERE doc_id=? AND resolved_by IS NULL"),
            "former_names_resolved": count("SELECT COUNT(*) FROM name_hits WHERE doc_id=? AND resolved_by IS NOT NULL"),
            "former_name_not_ruled_out": queries.name_not_ruled_out(
                d["status"], count("SELECT COUNT(*) FROM name_hits WHERE doc_id=?"))}},
        {"station": "index", "facts": {
            "search_rows": count("SELECT COUNT(*) FROM chunks_fts WHERE doc_id=?"),
            "embeddings": count("SELECT COUNT(*) FROM embeddings e JOIN chunks c ON c.chunk_id = e.chunk_id WHERE c.doc_id=?")}},
        {"station": "register", "facts": {
            "doc_type": m["doc_type"] if m else None,
            "required_not_found": sorted(f["clause_type"] for f in findings
                                         if f["clause_type"] in required and f["status"] != "PRESENT")}},
    ]
    calls = [c for c in (extract, check) if c]
    return {"doc_id": doc_id, "title": m["title"] if m else None, "counterparty": m["counterparty_name"] if m else None,
            "stations": stations,
            "model": {"calls": len(calls), "cost_usd": round(sum(c["cost_usd"] for c in calls), 6),
                      "seconds": round(sum(c["latency_ms"] for c in calls) / 1000, 1)}}


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


@router.get("/documents/{doc_id}/law/highlight")
def get_law_highlight(doc_id: str, con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Word boxes of the governing law's quote (decision 94), the same way as a clause quote.
    kind=none: no quote stored (no choice of law, or read before extract-v3)."""
    _document(con, doc_id)
    r = con.execute("SELECT governing_law_quote, law_page, law_char_start, law_char_end FROM metadata WHERE doc_id=?",
                    (doc_id,)).fetchone()
    if r is None or not r["governing_law_quote"]:
        return {"kind": "none", "char_start": None, "char_end": None, "coverage": 0.0, "pages": []}
    return {"kind": "quote", "char_start": r["law_char_start"], "char_end": r["law_char_end"],
            **quote_boxes(con, doc_id, r["governing_law_quote"], r["law_page"])}


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
