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


def poor_scan_reason(ocr_mean_conf: float | None, verdict: str = "cannot be ruled out") -> str:
    """The reason as a fixed template - the Workbench shows it in German (web/src/labels.ts).
    The confidence is rounded down, so it never reads as "70 %, threshold 70 %"."""
    if ocr_mean_conf is None:
        return f"{verdict} - poor scan - a person checks"
    return (f"{verdict} - poor scan (OCR confidence {int(ocr_mean_conf)} %, "
            f"threshold {config.OCR_LOW_QUALITY_CONFIDENCE:.0f} %) - a person checks")


# F36, decision 94: the governing law is a finding like a clause. Its quote must be in the text, choose
# a law and name the jurisdiction of the code (pipeline/extract.py check_law). Only a law confirmed that way, on
# a good scan, may take a contract out of "not governed by X": a poor scan or a failed check cannot
# prove the law, so the contract is reported as LAW_NOT_CONFIRMED for a person (recall first) - the
# same idea as NAME_NOT_RULED_OUT. A law read before extract-v3 has no quote yet (law_flags NULL): it
# keeps its old answer until the contract is read again, counted on its own as SAME_LAW_NOT_CHECKED.
LAW_NOT_CONFIRMED = "LAW_NOT_CONFIRMED"
LAW_UNKNOWN = "LAW_UNKNOWN"     # no governing law found: a person looks
LAW_REPORTED = ("OTHER_LAW", LAW_UNKNOWN, LAW_NOT_CONFIRMED)   # rows of "not governed by X"; the rest is counted

LAW_FLAG_REASON = {        # fixed templates, shown in German by the Workbench (web/src/labels.ts)
    "law_quote_missing": "not confirmed - no quote for the law - a person checks",
    "law_quote_not_verified": "not confirmed - the quote is not in the contract - a person checks",
    "law_quote_in_suspected_injection": "not confirmed - the quote comes from text addressed to AI systems - a person checks",
    "law_quote_lacks_law_terms": "not confirmed - the quote does not choose a law - a person checks",
    "law_quote_lacks_jurisdiction": "not confirmed - the quote does not name the law's country or state - a person checks",
    "law_code_not_in_map": "not confirmed - no check words for this law code yet - a person checks",
}


def law_flag_list(law_flags: str | None) -> list[str] | None:
    """The stored law_flags (JSON text) as a list; None = not checked (read before extract-v3)."""
    return None if law_flags is None else json.loads(law_flags)


def law_answer(doc_status: str | None, law: str | None, flags: list[str] | None, asked: str) -> str:
    """Where one contract lands in "not governed by <asked> law" - one rule for the portfolio check
    and the evaluation. Reported: LAW_UNKNOWN, LAW_NOT_CONFIRMED, OTHER_LAW. Counted, not reported:
    SAME_LAW (confirmed by its quote) and SAME_LAW_NOT_CHECKED (read before extract-v3).
    The country is the first part of the code (US-NY -> US, F16)."""
    if law is None:
        return LAW_UNKNOWN
    if doc_status == "LOW_QUALITY" or flags:
        return LAW_NOT_CONFIRMED
    if law.split("-")[0] != asked:
        return "OTHER_LAW"
    return "SAME_LAW" if flags == [] else "SAME_LAW_NOT_CHECKED"


def law_reason(doc_status: str | None, ocr_mean_conf: float | None, law: str | None,
               flags: list[str] | None) -> str | None:
    """Why a person checks the governing law (a fixed reason), or None: the first failed check wins.
    None also without a law: "no law found" says it by itself."""
    if law is None:
        return None
    if doc_status == "LOW_QUALITY":
        return poor_scan_reason(ocr_mean_conf, "cannot be confirmed")
    if flags:
        return LAW_FLAG_REASON.get(flags[0], f"not confirmed - {flags[0]} - a person checks")
    return None


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
    """Contracts governed (equal=True: read as the country's law) or not governed by a country's law.
    "Not governed" follows law_answer, like the portfolio check: another law, no law found, or a law the
    register cannot confirm (LAW_NOT_CONFIRMED, F36); `status` and `reason` say which."""
    sql = (f"SELECT m.doc_id, m.title, m.counterparty_name, m.governing_law, m.law_flags, d.status AS doc_status,"
           f" d.ocr_mean_conf {BASE}")
    args = []
    if doc_type:
        sql += " AND m.doc_type = ?"
        args.append(doc_type)
    out = []
    for r in _rows(con, sql + " ORDER BY m.doc_id", args):
        flags = law_flag_list(r.pop("law_flags"))
        r["status"] = law_answer(r["doc_status"], r["governing_law"], flags, law)
        r["reason"] = law_reason(r["doc_status"], r["ocr_mean_conf"], r["governing_law"], flags)
        if equal:
            keep = (r["governing_law"] or "").split("-")[0] == law
        else:
            keep = r["status"] in LAW_REPORTED
        if keep:
            out.append(r)
    return out


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


def register_version(con) -> int:
    """The register's change cursor: the highest audit_log id. Every pipeline write adds an audit row
    in the same transaction, and AUTOINCREMENT never reuses an id - a new number means the register changed."""
    return con.execute("SELECT COALESCE(MAX(id), 0) FROM audit_log").fetchone()[0]


def stages(con) -> dict[str, str]:
    """Where each document stands, for the tool: 'reading' until its findings for the current text and the
    family / former-name step are stored; 'failed' when the last attempt to read it failed; else 'ready'.
    From the documents table and the pipeline's own audit log - no model call."""
    families = con.execute("SELECT COALESCE(MAX(id), 0) FROM audit_log WHERE action = 'families_built'").fetchone()[0]
    last = {r[0]: r[1:] for r in con.execute(
        "SELECT target, MAX(CASE WHEN action = 'ingested' THEN id END), MAX(CASE WHEN action = 'extracted' THEN id END),"
        " MAX(CASE WHEN action = 'extraction_failed' THEN id END) FROM audit_log"
        " WHERE action IN ('ingested', 'extracted', 'extraction_failed') GROUP BY target")}
    out = {}
    for doc_id, status, text_sha, read_sha in con.execute(
            "SELECT d.doc_id, d.status, d.text_sha256, m.text_sha256 FROM documents d"
            " LEFT JOIN metadata m ON m.doc_id = d.doc_id"):
        ingested, extracted, failed = (x or 0 for x in last.get(doc_id, (0, 0, 0)))
        current = read_sha is not None and read_sha == text_sha        # findings belong to today's text
        # failed after the last ingest: a re-check of the old findings may come later, it does not read today's text
        if status == "FAILED" or (not current and failed > ingested):
            out[doc_id] = "failed"
        # an ingest replaces the document row (family, copy) and an extraction its findings: both wait for families
        elif not current or max(ingested, extracted) > families:
            out[doc_id] = "reading"
        else:
            out[doc_id] = "ready"
    return out
