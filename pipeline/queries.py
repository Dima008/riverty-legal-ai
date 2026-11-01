"""Register queries: the questions Legal asks most often, answered without a model call.

Once the register is compiled, "which contracts lack X" is a database query: exact,
complete, cheap and repeatable. UNCLEAR is always returned together with ABSENT
(recall first) and goes to a human.
"""

from __future__ import annotations

import json
from collections import Counter

from . import config

BASE = ("FROM documents d JOIN metadata m ON m.doc_id = d.doc_id "
        "WHERE d.duplicate_of IS NULL AND m.is_amendment = 0")

# F19, decision 89: the legacy-name check is an exact match. On a scan below the OCR threshold
# (document status LOW_QUALITY) "no match" does not prove "no former name" - the same trap as
# top-k for a missing clause. Such a document is never counted as "without hits": it is reported
# for review, and a person reads the page (recall first). Fuzzy matching was not chosen.
NAME_NOT_RULED_OUT = "NAME_NOT_RULED_OUT"


def name_not_ruled_out(doc_status: str | None, name_hits: int) -> bool:
    """True if a former company name cannot be ruled out: the exact match found no former name
    (open or resolved) in a document whose scan is below the OCR threshold."""
    return doc_status == "LOW_QUALITY" and name_hits == 0


def poor_scan_reason(ocr_mean_conf: float | None) -> str:
    """The reason as a fixed template - the Workbench shows it in German (web/src/labels.ts).
    The confidence is rounded down, so it never reads as "70 %, threshold 70 %"."""
    if ocr_mean_conf is None:
        return "cannot be ruled out - poor scan - a person checks"
    return (f"cannot be ruled out - poor scan (OCR confidence {int(ocr_mean_conf)} %, "
            f"threshold {config.OCR_LOW_QUALITY_CONFIDENCE:.0f} %) - a person checks")


def former_names(doc_status: str | None, ocr_mean_conf: float | None, open_hits: int, resolved_hits: int) -> dict:
    """The legacy-name state of one document, as the API shows it (contract file, register matrix)."""
    unsure = name_not_ruled_out(doc_status, open_hits + resolved_hits)
    return {"open": open_hits, "resolved": resolved_hits, "not_ruled_out": unsure,
            "reason": poor_scan_reason(ocr_mean_conf) if unsure else None}


def _rows(con, sql: str, args=()) -> list[dict]:
    out = []
    for r in con.execute(sql, args):
        r = dict(r)
        if "flags" in r and isinstance(r["flags"], str):
            r["flags"] = json.loads(r["flags"])
        out.append(r)
    return out


def missing_clause(con, clause_type: str, doc_type: str | None = None) -> list[dict]:
    """Contracts where a clause is ABSENT or UNCLEAR."""
    sql = (f"SELECT m.doc_id, m.title, m.counterparty_name, c.status, c.confidence, c.rationale, c.flags, c.quote, "
           f"c.page, c.section {BASE.replace('WHERE', 'JOIN clauses c ON c.doc_id = m.doc_id WHERE')} "
           f"AND c.clause_type = ? AND c.status != 'PRESENT'")
    args = [clause_type]
    if doc_type:
        sql += " AND m.doc_type = ?"
        args.append(doc_type)
    return _rows(con, sql + " ORDER BY m.doc_id", args)


def legacy_names(con) -> dict[str, list[dict]]:
    """Occurrences of former company names, split into open and already resolved by an amendment,
    plus the contracts where a former name cannot be ruled out: a poor scan without any exact
    match (F19) - one entry per contract, for a person to read."""
    rows = _rows(con, f"SELECT h.doc_id, h.name, h.page, h.snippet, h.resolved_by "
                      f"FROM name_hits h JOIN documents d ON d.doc_id = h.doc_id "
                      f"JOIN metadata m ON m.doc_id = h.doc_id "
                      f"WHERE d.duplicate_of IS NULL AND m.is_amendment = 0 ORDER BY h.doc_id, h.char_start")
    hits = Counter(r["doc_id"] for r in rows)
    unsure = [{"doc_id": r["doc_id"], "title": r["title"], "ocr_mean_conf": r["ocr_mean_conf"],
               "status": NAME_NOT_RULED_OUT, "reason": poor_scan_reason(r["ocr_mean_conf"])}
              for r in _rows(con, f"SELECT d.doc_id, d.status, d.ocr_mean_conf, m.title {BASE} ORDER BY d.doc_id")
              if name_not_ruled_out(r["status"], hits[r["doc_id"]])]
    return {"open": [r for r in rows if not r["resolved_by"]], "resolved": [r for r in rows if r["resolved_by"]],
            "not_ruled_out": unsure}


def by_law(con, law: str, equal: bool = False, doc_type: str | None = None) -> list[dict]:
    """Contracts governed (equal=True) or not governed by a country's law, unknown law included.
    The first two letters of an ISO 3166 code are the country (US-NY -> US, F16)."""
    sql = f"SELECT m.doc_id, m.title, m.counterparty_name, m.governing_law {BASE} AND "
    sql += "substr(m.governing_law, 1, 2) = ?" if equal else "COALESCE(substr(m.governing_law, 1, 2), '') != ?"
    args = [law]
    if doc_type:
        sql += " AND m.doc_type = ?"
        args.append(doc_type)
    return _rows(con, sql + " ORDER BY m.doc_id", args)


def duplicates(con) -> list[dict]:
    return _rows(con, "SELECT doc_id, duplicate_of, source_path FROM documents WHERE duplicate_of IS NOT NULL")


def costs(con) -> dict:
    r = con.execute("SELECT COUNT(*), COALESCE(SUM(prompt_tokens),0), COALESCE(SUM(completion_tokens),0), "
                    "COALESCE(SUM(cost_usd),0) FROM llm_calls").fetchone()
    by = _rows(con, "SELECT purpose, model, COUNT(*) calls, SUM(prompt_tokens) prompt_tokens, "
                    "SUM(completion_tokens) completion_tokens, ROUND(SUM(cost_usd), 4) cost_usd "
                    "FROM llm_calls GROUP BY purpose, model")
    return {"calls": r[0], "prompt_tokens": r[1], "completion_tokens": r[2], "cost_usd": round(r[3], 4),
            "by_purpose": by}
