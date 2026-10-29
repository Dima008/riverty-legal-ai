"""Contract families: duplicates, amendments, current company name, legacy-name occurrences.

Deterministic. A contract is only understood together with its amendments:
an old company name in the main agreement is no finding if an amendment has
already renamed the party.
"""

from __future__ import annotations

import json
import re

from rapidfuzz import fuzz

from . import catalogue
from .chunking import page_of
from .ingest import normalise_for_hash
from .store import audit, transaction

NEAR_DUPLICATE_RATIO = 98


def _same_party(a: str | None, b: str | None) -> bool:
    return bool(a and b) and fuzz.token_set_ratio(a.lower(), b.lower()) >= 90


def _name_pattern(name: str) -> re.Pattern:
    return re.compile(r"\s+".join(re.escape(w) for w in name.split()), re.IGNORECASE)


def run(con) -> dict:
    docs = {r["doc_id"]: dict(r) for r in con.execute(
        "SELECT d.doc_id, d.ingested_at, d.text_sha256, m.doc_type, m.counterparty_name, m.effective_date, m.is_amendment,"
        " m.amended_agreement_date, m.renames_from, m.renames_to, m.own_entity_name, t.text, t.page_offsets_json"
        " FROM documents d JOIN metadata m ON m.doc_id = d.doc_id JOIN doc_text t ON t.doc_id = d.doc_id")}
    family = {d: d for d in docs}
    duplicate_of: dict[str, str] = {}

    # 1. duplicates: identical normalised text, or near-identical text for the same counterparty.
    #    The document that was in the register first stays the original.
    ids = sorted(docs, key=lambda d: (docs[d]["ingested_at"] or "", d))
    for i, a in enumerate(ids):
        if a in duplicate_of:
            continue
        for b in ids[i + 1:]:
            if b in duplicate_of:
                continue
            da, db = docs[a], docs[b]
            same = da["text_sha256"] == db["text_sha256"]
            if not same and _same_party(da["counterparty_name"], db["counterparty_name"]):
                same = fuzz.ratio(normalise_for_hash(da["text"]), normalise_for_hash(db["text"])) >= NEAR_DUPLICATE_RATIO
            if same:
                duplicate_of[b] = a
                family[b] = a

    # 2. amendments -> base agreement (same counterparty, date of the amended agreement)
    amendments = sorted((d for d in docs.values() if d["is_amendment"]), key=lambda d: d["effective_date"] or "")
    for am in amendments:
        candidates = [d for d in docs.values() if not d["is_amendment"] and d["doc_id"] not in duplicate_of
                      and _same_party(d["counterparty_name"], am["counterparty_name"])]
        dated = [d for d in candidates if am["amended_agreement_date"] and d["effective_date"] == am["amended_agreement_date"]]
        base = (dated or candidates or [None])[0]
        if base:
            family[am["doc_id"]] = base["doc_id"]

    # 3. current name of our own entity after applying the family's amendments in date order
    current = {d: docs[d]["own_entity_name"] for d in docs}
    resolved_by: dict[str, str] = {}
    for am in amendments:
        base = family[am["doc_id"]]
        if base != am["doc_id"] and am["renames_to"] and _same_party(am["renames_from"], current[base]):
            current[base] = am["renames_to"]
            resolved_by[base] = am["doc_id"]
        if am["renames_to"]:
            current[am["doc_id"]] = am["renames_to"]
            resolved_by[am["doc_id"]] = am["doc_id"]   # the renaming document itself
    for dup, orig in duplicate_of.items():
        current[dup] = current[orig]
        if orig in resolved_by:
            resolved_by[dup] = resolved_by[orig]

    # 4. every occurrence of a legacy name, with page, so Legal can fix all of them
    hits = []
    for doc_id, d in docs.items():
        offsets = json.loads(d["page_offsets_json"])
        for name in catalogue.OWN_ENTITY_LEGACY:
            for m in _name_pattern(name).finditer(d["text"]):
                snippet = d["text"][max(0, m.start() - 60):m.end() + 60].replace("\n", " ")
                hits.append((doc_id, name, page_of(offsets, m.start()), m.start(), m.end(), snippet,
                             resolved_by.get(doc_id)))

    with transaction(con):
        for doc_id in docs:
            con.execute("UPDATE documents SET family_id=?, duplicate_of=? WHERE doc_id=?",
                        (family[doc_id], duplicate_of.get(doc_id), doc_id))
            con.execute("UPDATE metadata SET current_own_entity_name=? WHERE doc_id=?", (current[doc_id], doc_id))
        con.execute("DELETE FROM name_hits")
        con.executemany("INSERT INTO name_hits VALUES (?,?,?,?,?,?,?)", hits)
        audit(con, "pipeline", "families_built", "*", duplicates=duplicate_of,
              amendments={a["doc_id"]: family[a["doc_id"]] for a in amendments}, legacy_name_hits=len(hits))
    return {"duplicates": duplicate_of, "amendments": {a["doc_id"]: family[a["doc_id"]] for a in amendments},
            "legacy_name_hits": len(hits)}
