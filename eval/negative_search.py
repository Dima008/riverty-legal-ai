"""Why top-k retrieval cannot answer "which contracts lack X?" - measured on our own register.

A RAG system answers a question from the top k passages a search returns. For a completeness
question the only reading it has is "a contract that is not among the top k does not contain the
clause". This script measures that reading for Q1 (merchant agreements without a limitation of
liability) with keyword search (BM25) over the register - no model call - and compares it with the
register's answer. Chapter 2 of the talk shows the result (docs/approach.md).

    python -m eval.negative_search                 # table for k = 5, 10, 20, 40
    python -m eval.negative_search --json PATH     # also store the numbers
"""

from __future__ import annotations

import argparse
import json

from pipeline import queries, search
from pipeline.store import connect

from .check_register import load_gold

QUERY = "limitation of liability"
DOC_TYPE = "merchant_agreement"
KS = (5, 10, 20, 40)


def measure(con) -> dict:
    expected = set(load_gold()["Q1"]["expected"])
    allowed = search._allowed(con, {"doc_type": DOC_TYPE})          # duplicates left out (M15)
    ranking = search.bm25_ranking(con, QUERY, allowed, depth=200)   # every matching passage, best first
    first_rank: dict[str, int] = {}
    for rank, chunk_id in enumerate(ranking, start=1):
        first_rank.setdefault(chunk_id.split(":")[0], rank)
    rows = []
    for k in KS:
        seen = {chunk_id.split(":")[0] for chunk_id in ranking[:k]}
        flagged = allowed - seen                                     # "not in the top k" read as "missing"
        hits = flagged & expected
        rows.append({
            "k": k, "contracts_in_top_k": len(seen), "flagged_as_missing": len(flagged),
            "precision": round(len(hits) / len(flagged), 2) if flagged else 1.0,
            "recall": round(len(hits) / len(expected), 2),
            "false_alarms": sorted(flagged - expected), "missed": sorted(expected - flagged),
        })
    register = {r["doc_id"] for r in queries.missing_clause(con, "liability_limitation", DOC_TYPE)}
    return {
        "query": QUERY, "doc_type": DOC_TYPE, "contracts": len(allowed), "expected": sorted(expected),
        "contracts_matching_at_all": len(first_rank),
        "first_rank_per_contract": dict(sorted(first_rank.items(), key=lambda x: x[1])),
        "top_k": rows,
        "register": {"reported": sorted(register), "recall": round(len(register & expected) / len(expected), 2),
                     "precision": round(len(register & expected) / len(register), 2) if register else 1.0},
    }


def render(m: dict) -> str:
    lines = [f'"{m["query"]}" over {m["contracts"]} merchant agreements (keyword search, no model call);'
             f' {m["contracts_matching_at_all"]} match at all. Gold answer: {", ".join(m["expected"])}',
             "",
             f"{'k':>3}  {'in top k':>8}  {'flagged':>7}  {'precision':>9}  {'recall':>6}  missed / false alarms"]
    for r in m["top_k"]:
        lines.append(f"{r['k']:>3}  {r['contracts_in_top_k']:>8}  {r['flagged_as_missing']:>7}  {r['precision']:>9.2f}"
                     f"  {r['recall']:>6.2f}  {r['missed']} / {len(r['false_alarms'])}")
    reg = m["register"]
    lines += ["", f"register: precision {reg['precision']:.2f}, recall {reg['recall']:.2f} - {', '.join(reg['reported'])}",
              "first rank per contract: " + ", ".join(f"{d} {r}" for d, r in m["first_rank_per_contract"].items())]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", help="also write the numbers to this file")
    args = ap.parse_args()
    m = measure(connect())
    print(render(m))
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(m, f, indent=2)


if __name__ == "__main__":
    main()
