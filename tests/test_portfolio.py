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


@pytest.mark.parametrize("plan", [
    {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}},
    {"check": "legacy_names", "params": {}},
    {"check": "governing_law_not", "params": {"law": "DE"}},
    {"check": "duplicates", "params": {}},
], ids=lambda p: p["check"])
def test_coverage_names_every_checked_contract(con, plan):
    """The answer keeps which contracts it covered (checked_ids): with the excluded ones, exactly the scope."""
    cov = portfolio.run_check(con, plan)["coverage"]
    excluded = [e["doc_id"] for e in cov["excluded"]]
    assert len(cov["checked_ids"]) == cov["checked"] and not set(cov["checked_ids"]) & set(excluded)
    assert len(cov["checked_ids"]) + len(excluded) == cov["in_scope"]
    assert cov["checked_ids"] == sorted(cov["checked_ids"])


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


def test_law_check_compares_the_country_not_the_state(con):
    """F16: the register stores the state of a federal country (US-NY). "Not governed by US law"
    reported every contract under a US state's law as another law - in the Workbench check and
    in the register query alike."""
    from pipeline import queries
    con.execute("UPDATE metadata SET governing_law='US-NY' WHERE doc_id='A1'")
    run = portfolio.run_check(con, {"check": "governing_law_not", "params": {"law": "US"}})
    statuses = {r["doc_id"]: r["status"] for r in run["rows"]}
    assert "A1" not in statuses and statuses["I1"] == "OTHER_LAW"
    assert "A1" not in {r["doc_id"] for r in queries.by_law(con, "US")}


# ---------------------------------------------------------------------------- selection (decision 75)
def test_a_selection_is_the_scope_and_nothing_in_it_drops_out(con):
    plan = {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"},
            "scope": {"doc_ids": ["I1", "A2", "U1"], "filters": {"law": "DE"}}}
    cov = portfolio.run_check(con, plan)["coverage"]
    assert cov["in_scope"] == 3 and cov["checked"] + len(cov["excluded"]) == 3
    assert cov["selection"] == {"chosen": 3, "of": 6, "filters": {"law": "DE"}}
    assert {e["doc_id"] for e in cov["excluded"]} == {"A2", "U1"}      # duplicate and unknown type, with reason
    assert set(cov["checked_ids"]) | {e["doc_id"] for e in cov["excluded"]} == set(plan["scope"]["doc_ids"])


def test_a_selected_contract_of_another_type_is_excluded_by_name(con):
    plan = {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "data_processing_agreement"},
            "scope": {"doc_ids": ["A1"]}}
    cov = portfolio.run_check(con, plan)["coverage"]
    assert cov["checked"] == 0 and cov["excluded"][0]["doc_id"] == "A1"
    assert "merchant agreement" in cov["excluded"][0]["reason"]


def test_without_a_selection_the_coverage_says_so(con):
    plan = {"check": "missing_clause", "params": {"clause_type": "liability_limitation"}}
    assert portfolio.run_check(con, plan)["coverage"]["selection"] is None


@pytest.mark.parametrize("scope", [
    {"doc_ids": []},                                   # nothing chosen
    {"doc_ids": "A1"},                                 # not a list
    {"doc_ids": ["A1; DROP TABLE"]},                   # not an id
    {"doc_ids": ["A1"], "filters": {"law": 1}},        # filters are short texts
    {"doc_ids": ["A1"], "extra": True},                # nothing else
])
def test_malformed_selections_are_rejected(con, scope):
    with pytest.raises(ValueError):
        portfolio.run_check(con, {"check": "duplicates", "params": {}, "scope": scope})


def test_a_contract_that_is_not_in_the_register_is_refused(con):
    with pytest.raises(ValueError, match="not in the register"):
        portfolio.run_check(con, {"check": "duplicates", "params": {}, "scope": {"doc_ids": ["A1", "ZZ9"]}})


# ---------------------------------------------------------------------------- legacy names on a poor scan (F19)
def test_a_poor_scan_without_a_name_match_goes_to_a_person(con):
    """F19, decision 89: OCR read "Arfto" for "Arvato" on the handwritten H01, the exact match
    found nothing and the contract was counted "without hits". Below the OCR threshold no match
    proves nothing: the contract is a REVIEW row, and the counts still add up to "checked"."""
    con.execute("UPDATE documents SET status='LOW_QUALITY', ocr_mean_conf=61.34 WHERE doc_id='A1'")
    run = portfolio.run_check(con, {"check": "legacy_names", "params": {}})
    rows = {r["doc_id"]: r for r in run["rows"]}
    assert set(rows) == {"A1"}                    # I1: clean text, no match - nothing to report
    assert rows["A1"]["status"] == "NAME_NOT_RULED_OUT" and rows["A1"]["triage"] == "REVIEW"
    assert rows["A1"]["hits"] == [] and rows["A1"]["confidence"] is None and not rows["A1"]["sample"]
    assert rows["A1"]["reason"] == ("cannot be ruled out - poor scan (OCR confidence 61 %, threshold 70 %)"
                                    " - a person checks")
    assert run["counts"] == {"with_open_hits": 0, "not_ruled_out_poor_scan": 1, "resolved_by_amendment": 0,
                             "without_hits": 1}
    assert sum(run["counts"].values()) == run["coverage"]["checked"] == 2


def test_a_poor_scan_keeps_its_stronger_signals(con):
    """An exact match on a poor scan is still a former name (one row, not two); text addressed to
    AI systems still needs four eyes; the register query reports the same contracts."""
    from pipeline import queries
    con.execute("UPDATE documents SET status='LOW_QUALITY', ocr_mean_conf=55 WHERE doc_id IN ('A1', 'I1')")
    con.execute("INSERT INTO name_hits VALUES ('A1', 'Arvato Financial Solutions', 1, 10, 36, '... Arvato ...', NULL)")
    run = portfolio.run_check(con, {"check": "legacy_names", "params": {}})
    rows = {r["doc_id"]: (r["status"], r["triage"]) for r in run["rows"]}
    assert rows == {"A1": ("LEGACY_NAME", "CONFIRM"), "I1": ("NAME_NOT_RULED_OUT", "FOUR_EYES")}
    legacy = queries.legacy_names(con)
    assert [h["doc_id"] for h in legacy["open"]] == ["A1"]
    assert [(u["doc_id"], u["status"]) for u in legacy["not_ruled_out"]] == [("I1", "NAME_NOT_RULED_OUT")]


def test_a_former_name_resolved_by_an_amendment_is_not_a_poor_scan_row(con):
    """A match that an amendment already resolved was read: the scan did find the name."""
    con.execute("UPDATE documents SET status='LOW_QUALITY', ocr_mean_conf=55 WHERE doc_id='A1'")
    con.execute("INSERT INTO name_hits VALUES ('A1', 'Arvato Financial Solutions', 1, 10, 36, '...', 'A3')")
    run = portfolio.run_check(con, {"check": "legacy_names", "params": {}})
    assert run["rows"] == [] and run["counts"]["resolved_by_amendment"] == 1
    assert sum(run["counts"].values()) == run["coverage"]["checked"]
