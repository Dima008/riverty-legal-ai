"""Portfolio checks: one question over every contract in scope, answered from the register.

No model call. A check never drops a contract silently - the lesson from failure case F10, where
a wrong "amendment" flag hid a contract from every answer. Three mechanisms make sure of it:
the scope is read from all documents, also those never extracted (LEFT JOIN); a contract of
unknown type is always in scope; and every contract in scope lands in exactly one list -
checked (with status and evidence) or excluded with a stated reason (duplicate, amendment, type
unknown, not extracted). The tests count scope = checked + excluded against the register.

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
from .queries import NAME_NOT_RULED_OUT, name_not_ruled_out, poor_scan_reason

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
REVIEW_STATUSES = {"UNCLEAR", NAME_NOT_RULED_OUT}    # a person has to look, whatever the confidence

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


# ---------------------------------------------------------------------------- triage
def triage(status: str, confidence: float | None, flags: list[str]) -> str:
    """FOUR_EYES: injection suspected or contradicting metadata. REVIEW: unclear, a former name
    that a poor scan cannot rule out (F19), or below REVIEW_BELOW. CONFIRM: everything else (with
    a spot-check sample)."""
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
        "SELECT d.doc_id, d.status, d.ocr_mean_conf, d.duplicate_of, d.family_id, d.flags, m.doc_type, m.title,"
        " m.counterparty_name, m.governing_law, m.is_amendment, m.text_sha256 AS extracted_sha256, m.prompt_version"
        " FROM documents d LEFT JOIN metadata m ON m.doc_id = d.doc_id "
        "ORDER BY d.doc_id").fetchall()
    docs = [dict(r) for r in rows]
    for d in docs:
        d["flags"] = json.loads(d["flags"] or "[]")
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
    return {"doc_id": doc["doc_id"], "title": doc["title"], "counterparty_name": doc["counterparty_name"],
            "doc_type": doc["doc_type"], **fields}


# ---------------------------------------------------------------------------- checks
def _missing_clause(con, docs: list[dict], params: dict) -> tuple[list[dict], dict, dict]:
    findings = {r["doc_id"]: dict(r) for r in
                con.execute("SELECT * FROM clauses WHERE clause_type=?", (params["clause_type"],))}
    rows, counts = [], Counter()
    for d in docs:
        f = findings.get(d["doc_id"])
        if f is None:     # every extraction stores every clause type; if not, unknown = unclear (recall first)
            f = {"status": "UNCLEAR", "model_status": None, "confidence": 0.0, "quote": None, "page": None,
                 "section": None, "rationale": "no finding stored for this clause", "flags": "[]"}
        counts[f["status"]] += 1
        if f["status"] == "PRESENT":
            continue
        flags = json.loads(f["flags"] or "[]") + d["flags"]
        rows.append(_row(d, status=f["status"], model_status=f["model_status"], confidence=f["confidence"],
                         quote=f["quote"], page=f["page"], section=f["section"], rationale=f["rationale"],
                         flags=flags, triage=triage(f["status"], f["confidence"], flags),
                         # the finding version, so reviews made elsewhere can be reused (decision 73)
                         text_sha256=d["extracted_sha256"], prompt_version=d["prompt_version"]))
    return rows, dict(counts), {}


def _legacy_names(con, docs: list[dict], params: dict) -> tuple[list[dict], dict, dict]:
    """Exact matches of the former names (families.py). A poor scan without any match is not
    "without hits" but a REVIEW row: the exact match cannot prove absence there (F19, decision 89)."""
    ids = {d["doc_id"] for d in docs}
    hits: dict[str, list[dict]] = {}
    resolved: dict[str, str] = {}
    found = Counter()             # every exact match per contract, open or resolved
    for h in con.execute("SELECT doc_id, name, page, snippet, resolved_by FROM name_hits ORDER BY doc_id, char_start"):
        if h["doc_id"] not in ids:
            continue
        found[h["doc_id"]] += 1
        if h["resolved_by"]:
            resolved[h["doc_id"]] = h["resolved_by"]
        else:
            hits.setdefault(h["doc_id"], []).append({"name": h["name"], "page": h["page"], "snippet": h["snippet"]})
    rows, unsure = [], 0
    for d in docs:
        if d["doc_id"] in hits:   # exact name match: deterministic, so no confidence needed
            rows.append(_row(d, status="LEGACY_NAME", confidence=None, hits=hits[d["doc_id"]], flags=d["flags"],
                             triage=triage("LEGACY_NAME", None, d["flags"])))
        elif name_not_ruled_out(d["status"], found[d["doc_id"]]):
            unsure += 1
            rows.append(_row(d, status=NAME_NOT_RULED_OUT, confidence=None, hits=[],
                             reason=poor_scan_reason(d["ocr_mean_conf"]), ocr_mean_conf=d["ocr_mean_conf"],
                             flags=d["flags"], triage=triage(NAME_NOT_RULED_OUT, None, d["flags"])))
    # every checked contract in exactly one count - the four add up to "checked"
    counts = {"with_open_hits": len(hits), "not_ruled_out_poor_scan": unsure,
              "resolved_by_amendment": len(set(resolved) - set(hits)),
              "without_hits": len(docs) - len(set(hits) | set(resolved)) - unsure}
    return rows, counts, {"resolved_by_amendment": [{"doc_id": k, "resolved_by": v} for k, v in sorted(resolved.items())
                                                    if k not in hits]}


def _governing_law_not(con, docs: list[dict], params: dict) -> tuple[list[dict], dict, dict]:
    """Laws are stored as ISO 3166 codes, with the state for federal countries (US-NY, CA-BC);
    the check compares the country (F16)."""
    rows = []
    for d in docs:
        law = d["governing_law"]
        if law and law.split("-")[0] == params["law"]:
            continue
        status = "LAW_UNKNOWN" if law is None else "OTHER_LAW"
        level = triage(status, None, d["flags"])
        if level == "CONFIRM" and law is None:     # no governing law found: a person has to look
            level = "REVIEW"
        rows.append(_row(d, status=status, governing_law=law, confidence=None, flags=d["flags"], triage=level))
    return rows, {"other_law": sum(r["status"] == "OTHER_LAW" for r in rows),
                  "law_unknown": sum(r["status"] == "LAW_UNKNOWN" for r in rows),
                  "same_law": len(docs) - len(rows)}, {}


def _duplicates(con, docs: list[dict], params: dict) -> tuple[list[dict], dict, dict]:
    rows = [_row(d, status="DUPLICATE", duplicate_of=d["duplicate_of"], confidence=None, flags=d["flags"],
                 triage=triage("DUPLICATE", None, d["flags"])) for d in docs if d["duplicate_of"]]
    return rows, {"duplicates": len(rows), "unique": len(docs) - len(rows)}, {}


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
    rows, counts, info = RUNNERS[check](con, checked, params)
    for r in rows:
        r["sample"] = r["triage"] == "CONFIRM" and sampled(run_id, r["doc_id"])
    return {
        "plan": plan,
        "rows": rows,
        "counts": counts,
        "info": info,
        "coverage": {"scope": doc_type or "all documents", "in_scope": len(in_scope), "checked": len(checked),
                     "excluded": excluded, "reported": len(rows),
                     "selection": {"chosen": len(in_scope), "of": len(docs), "filters": selection["filters"]}
                     if selection else None},
        "triage": dict(Counter(r["triage"] for r in rows)),
    }
