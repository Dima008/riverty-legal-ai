"""Check the compiled register against the gold set.

    python -m eval.check_register

Answers Q1-Q8 from the register (no model call) and compares them with
data/gold_queries.json; checks clause statuses and metadata against
data/ground_truth.csv and the CUAD labels. Recall comes first: a contract
that lacks a clause must never be missed. UNCLEAR counts as flagged.
"""

from __future__ import annotations

import csv
import json

from pipeline import config, queries
from pipeline.store import connect

LAW = {"DE": "DE", "NL": "NL", "EN": "GB"}


def pr(found: set, expected: set) -> tuple[float, float]:
    tp = len(found & expected)
    precision = tp / len(found) if found else 1.0
    recall = tp / len(expected) if expected else 1.0
    return precision, recall


def main() -> None:
    con = connect()
    gold = {q["id"]: q for q in json.load(open(config.DATA / "gold_queries.json", encoding="utf-8"))}
    truth = {r["doc_id"]: r for r in csv.DictReader(open(config.DATA / "ground_truth.csv", encoding="utf-8"))}
    cuad = {r["doc_id"]: r for r in csv.DictReader(open(config.DATA / "cuad_subset" / "labels.csv", encoding="utf-8"))}

    legacy = queries.legacy_names(con)
    answers = {
        "Q1": queries.missing_clause(con, "liability_limitation", "merchant_agreement"),
        "Q2": legacy["open"],
        "Q3": queries.missing_clause(con, "consumer_terms_checkout", "merchant_agreement"),
        "Q4": queries.missing_clause(con, "dpa_reference", "merchant_agreement"),
        "Q5": queries.by_law(con, "DE", doc_type="merchant_agreement"),
        "Q6": queries.missing_clause(con, "audit_clause", "data_processing_agreement"),
        "Q7": queries.missing_clause(con, "subprocessor_clause", "data_processing_agreement"),
        "Q8": queries.duplicates(con),
    }
    print("Gold questions (answered from the register, no model call)")
    print(f"{'id':4} {'precision':>9} {'recall':>7}  found / expected / to review")
    all_ok = True
    for qid, rows in answers.items():
        found = {r["doc_id"] for r in rows}
        expected = set(gold[qid]["expected"])
        p, r = pr(found, expected)
        review = sorted({x["doc_id"] for x in rows if x.get("confidence", 1) < 0.85 or x.get("status") == "UNCLEAR"})
        all_ok &= r == 1.0
        extra = f"  resolved by amendment: {sorted({x['doc_id'] for x in legacy['resolved']})}" if qid == "Q2" else ""
        print(f"{qid:4} {p:9.2f} {r:7.2f}  {sorted(found)} / {sorted(expected)} / {review}{extra}")

    print("\nMetadata vs ground truth (own contracts)")
    meta = {r["doc_id"]: dict(r) for r in con.execute("SELECT * FROM metadata")}
    checks = {"governing_law": 0, "effective_date": 0, "doc_type": 0}
    n = 0
    for doc_id, t in truth.items():
        m = meta.get(doc_id)
        if not m:
            print(f"  {doc_id}: not in register")
            continue
        n += 1
        if t["governing_law"] and m["governing_law"] != LAW.get(t["governing_law"]):
            print(f"  {doc_id}: law {m['governing_law']} != {t['governing_law']}")
        else:
            checks["governing_law"] += 1
        if m["effective_date"] == t["date"]:
            checks["effective_date"] += 1
        else:
            print(f"  {doc_id}: date {m['effective_date']} != {t['date']}")
        expected_type = "amendment" if t["doc_type"] == "amendment" else t["doc_type"]
        if m["doc_type"] == expected_type:
            checks["doc_type"] += 1
        else:
            print(f"  {doc_id}: type {m['doc_type']} != {expected_type}")
    print("  " + ", ".join(f"{k} {v}/{n}" for k, v in checks.items()))

    print("\nCUAD (public contracts, labels by lawyers): limitation of liability")
    status = {r["doc_id"]: dict(r) for r in con.execute(
        "SELECT doc_id, status FROM clauses WHERE clause_type='liability_limitation' AND doc_id LIKE 'C%'")}
    tp = fp = fn = tn = unclear = 0
    for doc_id, label in cuad.items():
        s = status.get(doc_id, {}).get("status")
        has = label["cap_on_liability"] == "True"
        unclear += s == "UNCLEAR"
        if s == "PRESENT" and has:
            tp += 1
        elif s == "PRESENT" and not has:
            fp += 1
            print(f"  {doc_id}: model PRESENT, CUAD label: no cap")
        elif s != "PRESENT" and has:
            fn += 1
            print(f"  {doc_id}: model {s}, CUAD label: cap")
        else:
            tn += 1
    print(f"  agreement {tp + tn}/{len(cuad)} (TP {tp}, TN {tn}, FP {fp}, FN {fn}, unclear {unclear})")

    c = queries.costs(con)
    print(f"\nCost so far: ${c['cost_usd']} in {c['calls']} calls "
          f"({c['prompt_tokens']} prompt / {c['completion_tokens']} completion tokens)")
    for b in c["by_purpose"]:
        print(f"  {b['purpose']:8} {b['model']:24} {b['calls']:4} calls  ${b['cost_usd']}")
    print("\nRESULT:", "all gold contracts found (recall 1.0)" if all_ok else "MISSED contracts - see above")


if __name__ == "__main__":
    main()
