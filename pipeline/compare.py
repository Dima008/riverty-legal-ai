"""Compare two contracts from the register: metadata, every playbook clause side by side, and the
text section by section with word-level differences. Deterministic, no model call.

Used for duplicates ("what exactly is this a copy of?") and for the second meaning of "compare"
in the task: one contract against another, e.g. against the template it was made from.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher

from rapidfuzz import fuzz

from . import catalogue
from .ingest import normalise_for_hash

SECTION_NUMBER = re.compile(r"^\s*(?:§\s*)?(\d{1,2})\b")
MIN_CONTENT_MATCH = 50          # % similarity needed to pair two sections without a common number
METADATA_FIELDS = ("doc_type", "title", "counterparty_name", "own_entity_name", "current_own_entity_name",
                   "effective_date", "governing_law", "language")


def _document(con, doc_id: str) -> dict | None:
    row = con.execute(
        "SELECT d.doc_id, d.format, d.page_count, d.file_sha256, d.text_sha256, d.family_id, d.duplicate_of,"
        " m.* FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id WHERE d.doc_id = ?", (doc_id,)).fetchone()
    return dict(row) if row else None


def _sections(con, doc_id: str) -> list[dict]:
    """Sections of the cleaned text in reading order; continuation chunks of a long section are joined."""
    text_row = con.execute("SELECT text FROM doc_text WHERE doc_id=?", (doc_id,)).fetchone()
    if text_row is None:
        return []
    sections: list[dict] = []
    for c in con.execute("SELECT section_title, char_start, char_end, page_start, page_end FROM chunks "
                         "WHERE doc_id=? ORDER BY seq", (doc_id,)):
        title = c["section_title"].split(" (cont. ")[0]
        if sections and sections[-1]["title"] == title:      # a continuation window of the same section
            sections[-1]["end"] = max(sections[-1]["end"], c["char_end"])
            sections[-1]["page_end"] = c["page_end"]
        else:
            sections.append({"title": title, "start": c["char_start"], "end": c["char_end"],
                             "page_start": c["page_start"], "page_end": c["page_end"]})
    for s in sections:
        s["text"] = text_row["text"][s["start"]:s["end"]].strip()
    return sections


def _number(title: str) -> str | None:
    m = SECTION_NUMBER.match(title)
    return m.group(1) if m else None


def _similarity(a: str, b: str) -> float:
    return round(fuzz.ratio(normalise_for_hash(a), normalise_for_hash(b)), 1)


def _pair_sections(sa: list[dict], sb: list[dict]) -> list[tuple[int | None, int | None]]:
    """Pair sections: first by their number ("7." with "7."), else by the most similar unused text."""
    by_number = {}
    for j, s in enumerate(sb):
        by_number.setdefault(_number(s["title"]), j)
    used, pairs = set(), []
    for i, s in enumerate(sa):
        j = by_number.get(_number(s["title"])) if _number(s["title"]) else None
        if j is None or j in used:
            scored = [(_similarity(s["text"], t["text"]), k) for k, t in enumerate(sb) if k not in used]
            best = max(scored, default=(0.0, None))
            j = best[1] if best[0] >= MIN_CONTENT_MATCH else None
        pairs.append((i, j))
        if j is not None:
            used.add(j)
    pairs += [(None, j) for j in range(len(sb)) if j not in used]
    return pairs


def word_diff(a: str, b: str) -> list[dict]:
    """Word-level differences as segments: equal, replace, delete (only in a) or insert (only in b)."""
    wa, wb = a.split(), b.split()
    ops = SequenceMatcher(None, wa, wb, autojunk=False).get_opcodes()
    return [{"tag": tag, "a": " ".join(wa[i1:i2]), "b": " ".join(wb[j1:j2])} for tag, i1, i2, j1, j2 in ops]


def compare(con, a_id: str, b_id: str) -> dict | None:
    """Everything needed to show two contracts side by side. None if one of them is not in the register."""
    a, b = _document(con, a_id), _document(con, b_id)
    if a is None or b is None:
        return None
    if a["duplicate_of"] == b_id or b["duplicate_of"] == a_id:
        relation = "duplicate"
    elif a["family_id"] and a["family_id"] == b["family_id"]:
        relation = "same family"
    else:
        relation = "unrelated"

    clauses = {}
    for r in con.execute("SELECT doc_id, clause_type, status, quote, page, section FROM clauses "
                         "WHERE doc_id IN (?, ?)", (a_id, b_id)):
        clauses.setdefault(r["clause_type"], {})[r["doc_id"]] = {
            "status": r["status"], "quote": r["quote"], "page": r["page"], "section": r["section"]}
    clause_rows = []
    for key, spec in catalogue.CLAUSES.items():
        ca, cb = clauses.get(key, {}).get(a_id), clauses.get(key, {}).get(b_id)
        clause_rows.append({
            "clause_type": key, "label": spec["label"], "a": ca, "b": cb,
            "same_status": bool(ca and cb and ca["status"] == cb["status"]),
            "same_quote": bool(ca and cb and ca["quote"] and cb["quote"]
                               and normalise_for_hash(ca["quote"]) == normalise_for_hash(cb["quote"])),
        })

    sa, sb = _sections(con, a_id), _sections(con, b_id)
    section_rows = []
    for i, j in _pair_sections(sa, sb):
        x, y = (sa[i] if i is not None else None), (sb[j] if j is not None else None)
        similarity = _similarity(x["text"], y["text"]) if x and y else 0.0
        section_rows.append({
            "a": {k: x[k] for k in ("title", "page_start", "page_end")} if x else None,
            "b": {k: y[k] for k in ("title", "page_start", "page_end")} if y else None,
            "similarity": similarity,
            "diff": word_diff(x["text"], y["text"]) if x and y and similarity < 100 else None,
        })

    text_a = " ".join(s["text"] for s in sa)
    text_b = " ".join(s["text"] for s in sb)
    summary = {
        "identical": sum(1 for s in section_rows if s["a"] and s["b"] and s["similarity"] == 100),
        "changed": sum(1 for s in section_rows if s["a"] and s["b"] and s["similarity"] < 100),
        "only_in_a": sum(1 for s in section_rows if s["a"] and not s["b"]),
        "only_in_b": sum(1 for s in section_rows if s["b"] and not s["a"]),
    }
    return {
        "a": {k: a[k] for k in ("doc_id", "title", "counterparty_name", "doc_type", "format", "page_count")},
        "b": {k: b[k] for k in ("doc_id", "title", "counterparty_name", "doc_type", "format", "page_count")},
        "relation": relation,
        "same_file": a["file_sha256"] == b["file_sha256"],
        "same_text": a["text_sha256"] == b["text_sha256"],
        "similarity": _similarity(text_a, text_b),
        "metadata": [{"field": f, "a": a.get(f), "b": b.get(f)} for f in METADATA_FIELDS if a.get(f) != b.get(f)],
        "clauses": clause_rows,
        "sections": section_rows,
        "summary": summary,
    }
