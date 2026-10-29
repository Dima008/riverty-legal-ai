"""Register queries: the questions Legal asks most often, answered without a model call.

Once the register is compiled, "which contracts lack X" is a database query: exact,
complete, cheap and repeatable. UNCLEAR is always returned together with ABSENT
(recall first) and goes to a human.
"""

from __future__ import annotations

import json

BASE = ("FROM documents d JOIN metadata m ON m.doc_id = d.doc_id "
        "WHERE d.duplicate_of IS NULL AND m.is_amendment = 0")


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
    """Occurrences of former company names, split into open and already resolved by an amendment."""
    rows = _rows(con, f"SELECT h.doc_id, h.name, h.page, h.snippet, h.resolved_by "
                      f"FROM name_hits h JOIN documents d ON d.doc_id = h.doc_id "
                      f"JOIN metadata m ON m.doc_id = h.doc_id "
                      f"WHERE d.duplicate_of IS NULL AND m.is_amendment = 0 ORDER BY h.doc_id, h.char_start")
    return {"open": [r for r in rows if not r["resolved_by"]], "resolved": [r for r in rows if r["resolved_by"]]}


def by_law(con, law: str, equal: bool = False, doc_type: str | None = None) -> list[dict]:
    sql = f"SELECT m.doc_id, m.title, m.counterparty_name, m.governing_law {BASE} AND "
    sql += "m.governing_law = ?" if equal else "COALESCE(m.governing_law, '') != ?"
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
