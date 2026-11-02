"""Portfolio checks: one question over every contract in scope, answered from the register.

No model call. A check never drops a contract silently - the lesson from failure case F10, where
a wrong "amendment" flag hid a contract from every answer. Three mechanisms make sure of it:
the scope is read from all documents, also those never extracted (LEFT JOIN); a contract of
unknown type is always in scope; and every contract in scope lands in exactly one list -
checked (with status and evidence) or excluded with a stated reason (duplicate, amendment, type
unknown, not extracted). The tests count scope = checked + excluded against the register.

Every checked contract also gets a traffic light (decision 95): red, orange or green, by one rule
(light() below). The answer keeps three lists, and every contract in scope is in exactly one:
`rows` - the reported contracts, exactly what the evaluation counts (red and orange); `unreported` -
every other checked contract, with its evidence and its light (mostly green: "Found", "no former
name", "same law", "unique"); and `coverage.excluded` with the reason.

Legal may choose the scope (decision 75): a selection of contracts from the register. Then the
selection is the scope - every chosen contract is checked or excluded with a reason (also one of
another type), an id that is not in the register is refused, and the coverage says "N of 47,
selected", so a subset never reads like an answer about the whole portfolio.

The same fixed list of check types is what the planner may choose from later (decision 55).
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter

from . import catalogue
from .extract import EXTRACTION_SCHEMA
from .queries import (LAW_NOT_CONFIRMED, LAW_REPORTED, LAW_UNKNOWN, NAME_NOT_RULED_OUT, law_answer, law_flag_list,
                      law_reason, name_not_ruled_out, poor_scan_reason)

DOC_TYPES = EXTRACTION_SCHEMA["properties"]["doc_type"]["enum"]
UNKNOWN_TYPES = (None, "unknown")    # could be anything: always in scope, shown as excluded

MAX_SELECTION = 1000
DOC_ID = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
MAX_FILTERS, MAX_FILTER_TEXT = 12, 100

# Triage (decision 53): deterministic signals only, never the model's self-assessment
REVIEW_BELOW = 0.8
SAMPLE_PERCENT = 10                   # share of CONFIRM rows marked for a spot check
FOUR_EYES_SIGNALS = {"prompt_injection_suspected", "document_contains_suspected_injection",
                     "quote_in_suspected_injection", "amendment_contradiction"}
# a person has to look, whatever the confidence: unclear, a former name or a law a poor scan cannot settle (F19,
# F36), a law whose quote failed its check (decision 94), no governing law found
REVIEW_STATUSES = {"UNCLEAR", NAME_NOT_RULED_OUT, LAW_NOT_CONFIRMED, LAW_UNKNOWN}

CHECKS = {
    "missing_clause": {
        "label": "Contracts that lack a clause (absent or unclear)",
        "params": {"clause_type": list(catalogue.CLAUSES), "doc_type": DOC_TYPES},
        "required": ["clause_type"],
    },
    "legacy_names": {
        "label": "Contracts that still name a former company",
        "params": {"doc_type": DOC_TYPES},
        "required": [],
    },
    "governing_law_not": {
        "label": "Contracts not governed by a given law",
        "params": {"law": "two-letter country code, e.g. DE", "doc_type": DOC_TYPES},
        "required": ["law"],
    },
    "duplicates": {
        "label": "Duplicate documents",
        "params": {},
        "required": [],
    },
}


# ---------------------------------------------------------------------------- plan
def validate_plan(plan: dict) -> dict:
    """Return a clean plan or raise ValueError. Only known checks with allowed values pass:
    the planner (and later an agent) can choose, but never invent a query."""
    check = plan.get("check")
    if check not in CHECKS:
        raise ValueError(f"unknown check {check!r}; allowed: {sorted(CHECKS)}")
    spec, params = CHECKS[check], dict(plan.get("params") or {})
    unknown = set(params) - set(spec["params"])
    if unknown:
        raise ValueError(f"{check}: unknown parameters {sorted(unknown)}")
    for name in spec["required"]:
        if not params.get(name):
            raise ValueError(f"{check}: parameter {name!r} is required")
    for name, allowed in spec["params"].items():
        value = params.get(name)
        if value and isinstance(allowed, list) and value not in allowed:
            raise ValueError(f"{check}: {name}={value!r} not in {allowed}")
    if params.get("law"):
        law = str(params["law"]).upper()
        if len(law) != 2 or not law.isalpha():
            raise ValueError("law must be a two-letter country code, e.g. DE")
        params["law"] = law
    clean = {"check": check, "params": {k: v for k, v in params.items() if v}}
    if plan.get("scope") is not None:
        clean["scope"] = validate_scope(plan["scope"])
    return clean


def validate_scope(scope) -> dict:
    """A selection chosen in the register: the contract ids (they decide) and, for the record,
    the filters that produced them (shown in the run and the audit, never re-applied)."""
    if not isinstance(scope, dict) or set(scope) - {"doc_ids", "filters"}:
        raise ValueError("scope must be {doc_ids: [...], filters: {...}}")
    ids = scope.get("doc_ids")
    if not isinstance(ids, list) or not ids or len(ids) > MAX_SELECTION:
        raise ValueError(f"scope.doc_ids must list 1 to {MAX_SELECTION} contracts")
    if not all(isinstance(i, str) and DOC_ID.match(i) for i in ids):
        raise ValueError("scope.doc_ids: every id must be a contract id like M08")
    filters = scope.get("filters") or {}
    if (not isinstance(filters, dict) or len(filters) > MAX_FILTERS
            or not all(isinstance(k, str) and isinstance(v, str) and len(k) <= 40 and len(v) <= MAX_FILTER_TEXT
                       for k, v in filters.items())):
        raise ValueError(f"scope.filters: at most {MAX_FILTERS} short texts")
    return {"doc_ids": sorted(set(ids)), "filters": filters}


# ---------------------------------------------------------------------------- the traffic light
# Decision 95: one colour rule for every analysis, computed here and tested (tests/test_portfolio_lights.py).
# red = the issue the question looks for is in the text; orange = the register cannot settle it, a person
# looks; green = positive: no issue, and here is the evidence.
RED = {"ABSENT", "LEGACY_NAME", "OTHER_LAW", "DUPLICATE"}
ORANGE = {"UNCLEAR", NAME_NOT_RULED_OUT, LAW_UNKNOWN, LAW_NOT_CONFIRMED, "SAME_LAW_NOT_CHECKED"}
GREEN = {"PRESENT", "NO_FORMER_NAME", "NAME_RESOLVED", "SAME_LAW", "UNIQUE", "ORIGINAL"}


def light(status: str, triage: str | None, doc_status: str | None) -> tuple[str, str]:
    """The light of one contract for one question, with the reason for it (light_why).
    Doubt never turns green: a poor scan proves neither absence nor presence (F19, decision 89) - not of a
    clause, and not of a copy: a misread text is not "unique" (F43). A Found that needs Review or Four eyes
    is not routine. Red stays red - a person sees it anyway."""
    if status in ORANGE:
        return "orange", "status"
    if doc_status == "LOW_QUALITY" and status in ("ABSENT", "PRESENT", "UNIQUE"):
        return "orange", "poor_scan"
    if status in RED:
        return "red", "status"
    if status in GREEN:
        return ("green", "status") if triage in (None, "CONFIRM") else ("orange", "not_sure")
    raise ValueError(f"no light for status {status!r}")     # an unknown status is never silently green


# ---------------------------------------------------------------------------- triage
def triage(status: str, confidence: float | None, flags: list[str]) -> str:
    """FOUR_EYES: injection suspected or contradicting metadata. REVIEW: a status in REVIEW_STATUSES,
    or below REVIEW_BELOW. CONFIRM: everything else (with a spot-check sample)."""
    if any(f.split(":")[0] in FOUR_EYES_SIGNALS for f in flags):
        return "FOUR_EYES"
    if status in REVIEW_STATUSES or (confidence is not None and confidence < REVIEW_BELOW):
        return "REVIEW"
    return "CONFIRM"


def sampled(run_id: str, doc_id: str) -> bool:
    """Deterministic spot-check sample: the same run always samples the same contracts."""
    return int(hashlib.sha256(f"{run_id}:{doc_id}".encode()).hexdigest(), 16) % 100 < SAMPLE_PERCENT


# ---------------------------------------------------------------------------- scope
def _documents(con) -> list[dict]:
    rows = con.execute(
        "SELECT d.doc_id, d.status, d.ocr_mean_conf, d.duplicate_of, d.family_id, d.flags, d.ingested_at, d.page_count,"
        " d.text_sha256 AS doc_sha256, m.doc_type,"
        " m.title, m.counterparty_name, m.governing_law, m.is_amendment, m.text_sha256 AS extracted_sha256,"
        " m.prompt_version, m.governing_law_quote, m.law_page, m.law_char_start, m.law_char_end, m.law_flags"
        " FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id ORDER BY d.doc_id").fetchall()
    docs = [dict(r) for r in rows]
    for d in docs:
        d["flags"] = json.loads(d["flags"] or "[]")
        d["law_flags"] = law_flag_list(d["law_flags"])     # None: read before extract-v3, not checked
    return docs


def _exclusion(doc: dict, check: str, doc_type: str | None = None) -> str | None:
    """Why a contract in scope is not checked, or None if it is checked. `doc_type` is set only
    for a selection: a chosen contract of another type stays in the scope, excluded by name."""
    if doc["doc_type"] is None:
        return f"not extracted (status {doc['status']})"
    if doc["doc_type"] == "unknown":
        return "document type unknown - check manually"
    if doc_type and doc["doc_type"] != doc_type:
        return f"selected, but a {doc['doc_type'].replace('_', ' ')} - the question is about {doc_type.replace('_', ' ')}s"
    if check == "duplicates":
        return None
    if doc["duplicate_of"]:
        return f"duplicate of {doc['duplicate_of']} - the original is checked"
    if doc["is_amendment"]:
        if doc["family_id"] != doc["doc_id"]:
            return f"amendment of {doc['family_id']} - read together with its base agreement"
        return "amendment, base agreement not in register"
    return None


def _row(doc: dict, **fields) -> dict:
    """A row of the answer, reported or not. It also carries the document's scan quality, page count and
    arrival, so every check can say "poor scan", "whole contract read: 2 pages" or "new" - also those whose
    rows have no low_ocr_quality flag (names, law, copies)."""
    return {"doc_id": doc["doc_id"], "title": doc["title"], "counterparty_name": doc["counterparty_name"],
            "doc_type": doc["doc_type"], "doc_status": doc["status"], "ocr_mean_conf": doc["ocr_mean_conf"],
            "ingested_at": doc["ingested_at"], "page_count": doc["page_count"], **fields}


# ---------------------------------------------------------------------------- checks
def _missing_clause(con, docs: list[dict], params: dict) -> tuple[list[dict], list[dict], dict, dict]:
    """Not found and unclear are reported; a Found goes to `unreported`, with its passage (decision 95)."""
    findings = {r["doc_id"]: dict(r) for r in
                con.execute("SELECT * FROM clauses WHERE clause_type=?", (params["clause_type"],))}
    rows, unreported, counts = [], [], Counter()
    for d in docs:
        f = findings.get(d["doc_id"])
        if f is None:     # every extraction stores every clause type; if not, unknown = unclear (recall first)
            f = {"status": "UNCLEAR", "model_status": None, "confidence": 0.0, "quote": None, "page": None,
                 "section": None, "char_start": None, "char_end": None,
                 "rationale": "no finding stored for this clause", "flags": "[]"}
        counts[f["status"]] += 1
        flags = json.loads(f["flags"] or "[]") + d["flags"]
        row = _row(d, status=f["status"], model_status=f["model_status"], confidence=f["confidence"],
                   quote=f["quote"], page=f["page"], section=f["section"], char_start=f["char_start"],
                   char_end=f["char_end"], rationale=f["rationale"],
                   flags=flags, triage=triage(f["status"], f["confidence"], flags),
                   # the finding version, so reviews made elsewhere can be reused (decision 73)
                   text_sha256=d["extracted_sha256"], prompt_version=d["prompt_version"])
        (unreported if f["status"] == "PRESENT" else rows).append(row)
    return rows, unreported, dict(counts), {}


def _legacy_names(con, docs: list[dict], params: dict) -> tuple[list[dict], list[dict], dict, dict]:
    """Exact matches of the former names (families.py). A poor scan without any match is not
    "without hits" but a REVIEW row: the exact match cannot prove absence there (F19, decision 89).
    Unreported: "no former name" (no hit on a good scan) and "resolved by an amendment" (with its hits)."""
    ids = {d["doc_id"] for d in docs}
    hits: dict[str, list[dict]] = {}
    resolved: dict[str, list[dict]] = {}      # the hits an amendment replaced, each with the amendment's id
    found = Counter()             # every exact match per contract, open or resolved
    for h in con.execute("SELECT doc_id, name, page, snippet, resolved_by FROM name_hits ORDER BY doc_id, char_start"):
        if h["doc_id"] not in ids:
            continue
        found[h["doc_id"]] += 1
        hit = {"name": h["name"], "page": h["page"], "snippet": h["snippet"]}
        if h["resolved_by"]:
            resolved.setdefault(h["doc_id"], []).append({**hit, "resolved_by": h["resolved_by"]})
        else:
            hits.setdefault(h["doc_id"], []).append(hit)
    rows, unreported, unsure = [], [], 0
    for d in docs:
        if d["doc_id"] in hits:   # exact name match: deterministic, so no confidence needed
            rows.append(_row(d, status="LEGACY_NAME", confidence=None, hits=hits[d["doc_id"]], flags=d["flags"],
                             triage=triage("LEGACY_NAME", None, d["flags"])))
        elif name_not_ruled_out(d["status"], found[d["doc_id"]]):
            unsure += 1
            rows.append(_row(d, status=NAME_NOT_RULED_OUT, confidence=None, hits=[],
                             reason=poor_scan_reason(d["ocr_mean_conf"]), ocr_mean_conf=d["ocr_mean_conf"],
                             flags=d["flags"], triage=triage(NAME_NOT_RULED_OUT, None, d["flags"])))
        elif d["doc_id"] in resolved:
            unreported.append(_row(d, status="NAME_RESOLVED", confidence=None, hits=resolved[d["doc_id"]],
                                   flags=d["flags"], triage=None))
        else:
            unreported.append(_row(d, status="NO_FORMER_NAME", confidence=None, hits=[], flags=d["flags"], triage=None))
    # every checked contract in exactly one count - the four add up to "checked"
    counts = {"with_open_hits": len(hits), "not_ruled_out_poor_scan": unsure,
              "resolved_by_amendment": len(set(resolved) - set(hits)),
              "without_hits": len(docs) - len(set(hits) | set(resolved)) - unsure}
    info = {"resolved_by_amendment": [{"doc_id": k, "resolved_by": v[0]["resolved_by"]} for k, v in sorted(resolved.items())
                                      if k not in hits],
            # what the exact search looked for, so every screen can name it (the question names only two)
            "searched_names": catalogue.OWN_ENTITY_LEGACY}
    return rows, unreported, counts, info


def _governing_law_not(con, docs: list[dict], params: dict) -> tuple[list[dict], list[dict], dict, dict]:
    """Laws are stored as ISO 3166 codes, with the state for federal countries (US-NY, CA-BC); the
    check compares the country (F16). Where a contract lands is queries.law_answer: the same law counts
    only when its quote confirmed it on a good scan (decision 94); a poor scan or a failed quote check is
    a REVIEW row with a fixed reason (F36). Every row carries the law's quote, page and span as evidence.
    The five counts add up to "checked"."""
    rows, unreported, counts = [], [], Counter()
    for d in docs:
        status = law_answer(d["status"], d["governing_law"], d["law_flags"], params["law"])
        counts[status] += 1
        reported = status in LAW_REPORTED      # else the same law: SAME_LAW or SAME_LAW_NOT_CHECKED
        (rows if reported else unreported).append(_row(
            d, status=status, governing_law=d["governing_law"], confidence=None,
            law_quote=d["governing_law_quote"], law_page=d["law_page"],
            law_char_start=d["law_char_start"], law_char_end=d["law_char_end"], law_flags=d["law_flags"],
            reason=law_reason(d["status"], d["ocr_mean_conf"], d["governing_law"], d["law_flags"]),
            flags=d["flags"], triage=triage(status, None, d["flags"]) if reported else None))
    return rows, unreported, {"other_law": counts["OTHER_LAW"], "law_unknown": counts[LAW_UNKNOWN],
                  "law_not_confirmed": counts[LAW_NOT_CONFIRMED], "same_law": counts["SAME_LAW"],
                  # read before extract-v3: no quote yet, the old answer stands until the contract is read again
                  "same_law_not_checked": counts["SAME_LAW_NOT_CHECKED"]}, {}


def _duplicates(con, docs: list[dict], params: dict) -> tuple[list[dict], list[dict], dict, dict]:
    """A copy is reported; every other document is unreported: an original (with its copies) or unique.
    `match` says how the copy was found (families.py): the same text, or at least 98 % the same text."""
    text_hash = dict(con.execute("SELECT doc_id, text_sha256 FROM documents").fetchall())
    copies: dict[str, list[str]] = {}
    for d in docs:
        if d["duplicate_of"]:
            copies.setdefault(d["duplicate_of"], []).append(d["doc_id"])
    rows, unreported = [], []
    for d in docs:
        if d["duplicate_of"]:
            same = d["doc_sha256"] is not None and d["doc_sha256"] == text_hash.get(d["duplicate_of"])
            rows.append(_row(d, status="DUPLICATE", duplicate_of=d["duplicate_of"], confidence=None, flags=d["flags"],
                             match="same_text" if same else "near_identical",
                             triage=triage("DUPLICATE", None, d["flags"])))
        else:
            mine = copies.get(d["doc_id"], [])
            unreported.append(_row(d, status="ORIGINAL" if mine else "UNIQUE", copies=mine, confidence=None,
                                   flags=d["flags"], triage=None))
    return rows, unreported, {"duplicates": len(rows), "unique": len(docs) - len(rows)}, {}


def count_lights(rows: list[dict]) -> dict:
    """How many contracts are red, orange and green - always all three keys."""
    n = Counter(r["light"] for r in rows)
    return {k: n[k] for k in ("red", "orange", "green")}


RUNNERS = {"missing_clause": _missing_clause, "legacy_names": _legacy_names,
           "governing_law_not": _governing_law_not, "duplicates": _duplicates}


def run_check(con, plan: dict, run_id: str = "") -> dict:
    """Answer one question over the whole portfolio - or over the selection Legal chose - with
    coverage. No model call."""
    plan = validate_plan(plan)
    check, params = plan["check"], plan["params"]
    doc_type = params.get("doc_type")
    docs = _documents(con)
    selection = plan.get("scope")
    if selection:
        known = {d["doc_id"] for d in docs}
        unknown = [i for i in selection["doc_ids"] if i not in known]
        if unknown:      # never answer for a contract we do not have - and never drop it silently
            raise ValueError(f"not in the register: {unknown}")
        chosen = set(selection["doc_ids"])
        in_scope = [d for d in docs if d["doc_id"] in chosen]
    else:
        in_scope = [d for d in docs if not doc_type or d["doc_type"] in (doc_type, *UNKNOWN_TYPES)]
    checked, excluded = [], []
    for d in in_scope:   # each contract in scope lands in exactly one of the two lists
        reason = _exclusion(d, check, doc_type if selection else None)
        if reason:
            excluded.append({"doc_id": d["doc_id"], "reason": reason})
        else:
            checked.append(d)
    rows, unreported, counts, info = RUNNERS[check](con, checked, params)
    for r in rows:
        r["sample"] = r["triage"] == "CONFIRM" and sampled(run_id, r["doc_id"])
    for r in unreported:
        r["sample"] = False           # nothing to decide, so never a spot check
    for r in rows + unreported:
        r["light"], r["light_why"] = light(r["status"], r["triage"], r["doc_status"])
    return {
        "plan": plan,
        "rows": rows,                 # reported: exactly the evaluation's answer (red and orange)
        "unreported": unreported,     # every other checked contract, with its evidence and its light
        "lights": count_lights(rows + unreported),
        "counts": counts,
        "info": info,
        # checked_ids: the answer names every contract it covered, so a stored run can later tell
        # what arrived or was removed since (the Workbench's "out of date")
        "coverage": {"scope": doc_type or "all documents", "in_scope": len(in_scope), "checked": len(checked),
                     "checked_ids": [d["doc_id"] for d in checked], "excluded": excluded, "reported": len(rows),
                     "selection": {"chosen": len(in_scope), "of": len(docs), "filters": selection["filters"]}
                     if selection else None},
        "triage": dict(Counter(r["triage"] for r in rows)),
    }
