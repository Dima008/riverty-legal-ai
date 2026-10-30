"""Portfolio checks on a tiny hand-made register: no contract may drop out silently (F10).

Independent of the real register and of any model answer.
"""

from __future__ import annotations

import json
import sqlite3

import pytest

from pipeline import portfolio
from pipeline.store import SCHEMA


@pytest.fixture
def con():
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    docs = [  # doc_id, status, duplicate_of, family_id, doc_type, is_amendment, flags
        ("A1", "INGESTED", None, "A1", "merchant_agreement", 0, []),
        ("A2", "INGESTED", "A1", "A1", "merchant_agreement", 0, []),                    # duplicate
        ("A3", "INGESTED", None, "A1", "amendment", 1, []),                             # amendment of A1
        ("U1", "INGESTED", None, "U1", "unknown", 0, []),                               # type unknown
        ("X1", "FAILED", None, "X1", None, 0, []),                                      # never extracted
        ("I1", "INGESTED", None, "I1", "merchant_agreement", 0, ["prompt_injection_suspected"]),
    ]
    for doc_id, status, dup, fam, doc_type, amend, flags in docs:
        con.execute("INSERT INTO documents (doc_id, source_path, file_sha256, status, family_id, duplicate_of, flags)"
                    " VALUES (?,?,?,?,?,?,?)", (doc_id, f"{doc_id}.pdf", doc_id, status, fam, dup, json.dumps(flags)))
        if doc_type:
            con.execute("INSERT INTO metadata (doc_id, doc_type, is_amendment, governing_law) VALUES (?,?,?,?)",
                        (doc_id, doc_type, amend, "DE"))
    for doc_id, status, conf in [("A1", "PRESENT", 0.95), ("I1", "ABSENT", 0.7)]:
        con.execute("INSERT INTO clauses (doc_id, clause_type, status, model_status, confidence, flags)"
                    " VALUES (?,?,?,?,?,?)", (doc_id, "liability_limitation", status, status, conf, "[]"))
    return con


def test_unknown_and_unextracted_documents_stay_visible(con):
    run = portfolio.run_check(con, {"check": "missing_clause",
                                    "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}})
    cov = run["coverage"]
    excluded = {e["doc_id"]: e["reason"] for e in cov["excluded"]}
    assert cov["in_scope"] == cov["checked"] + len(excluded)
    assert excluded["U1"].startswith("document type unknown")        # could be a merchant agreement
    assert excluded["X1"].startswith("not extracted")
    assert excluded["A2"].startswith("duplicate of A1")
    assert {r["doc_id"]: r["triage"] for r in run["rows"]} == {"I1": "FOUR_EYES"}


def test_missing_finding_counts_as_unclear(con):
    """A checked contract without a stored finding is reported as UNCLEAR, never skipped."""
    con.execute("DELETE FROM clauses WHERE doc_id='I1'")
    run = portfolio.run_check(con, {"check": "missing_clause", "params": {"clause_type": "liability_limitation"}})
    i1 = next(r for r in run["rows"] if r["doc_id"] == "I1")
    assert i1["status"] == "UNCLEAR"


def test_amendment_is_excluded_with_its_base_agreement(con):
    run = portfolio.run_check(con, {"check": "legacy_names", "params": {}})
    excluded = {e["doc_id"]: e["reason"] for e in run["coverage"]["excluded"]}
    assert excluded["A3"].startswith("amendment of A1")


@pytest.mark.parametrize("plan", [
    {"check": "drop_table"},
    {"check": "missing_clause", "params": {}},
    {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "sql": "1=1"}},
    {"check": "governing_law_not", "params": {"law": "DEU"}},
])
def test_plans_outside_the_fixed_list_are_rejected(con, plan):
    with pytest.raises(ValueError):
        portfolio.run_check(con, plan)
