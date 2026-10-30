"""Check the compiled register against the gold set.

    python -m eval.check_register                    # print the report
    python -m eval.check_register --json result.json # also save the numbers as JSON

Answers Q1-Q8 from the register (no model call) and compares them with
data/gold_queries.json; checks clause statuses and metadata against
data/ground_truth.csv and the CUAD labels. Recall comes first: a contract
that lacks a clause must never be missed. UNCLEAR counts as flagged.

evaluate() computes the numbers, render() prints the report. The API uses
evaluate() for the quality view; the JSON files make runs comparable
(several runs, other models).
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from pipeline import config, queries
from pipeline.store import connect, now

LAW = {"DE": "DE", "NL": "NL", "EN": "GB"}

CLAUSE_QUESTIONS = {
    "Q1": ("liability_limitation", "merchant_agreement"),
    "Q3": ("consumer_terms_checkout", "merchant_agreement"),
    "Q4": ("dpa_reference", "merchant_agreement"),
    "Q6": ("audit_clause", "data_processing_agreement"),
    "Q7": ("subprocessor_clause", "data_processing_agreement"),
}


def pr(found: set, expected: set) -> tuple[float, float]:
    tp = len(found & expected)
    precision = tp / len(found) if found else 1.0
    recall = tp / len(expected) if expected else 1.0
    return precision, recall


# ---------------------------------------------------------------------------- compute
def _gold_questions(con, gold: dict) -> list[dict]:
    """Q1-Q8 answered from the register, compared with the expected contracts."""
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
    out = []
    for qid, rows in answers.items():
        found = {r["doc_id"] for r in rows}
        expected = set(gold[qid]["expected"])
        precision, recall = pr(found, expected)
        out.append({
            "id": qid,
            "question": gold[qid]["question_en"],
            "precision": precision,
            "recall": recall,
            "found": sorted(found),
            "expected": sorted(expected),
            "to_review": sorted({x["doc_id"] for x in rows
                                 if x.get("confidence", 1) < 0.85 or x.get("status") == "UNCLEAR"}),
            "resolved_by_amendment": sorted({x["doc_id"] for x in legacy["resolved"]}) if qid == "Q2" else None,
        })
    return out


def _ablation(con, gold: dict) -> list[dict]:
    """Same questions, answered from what the model said (model_status) instead of the checked status.
    Shows what the checks are worth - computed from stored data, no model call."""
    out = []
    for qid, (clause, doc_type) in CLAUSE_QUESTIONS.items():
        expected = set(gold[qid]["expected"])
        found = {}
        for col in ("model_status", "status"):
            found[col] = {r[0] for r in con.execute(
                f"SELECT c.doc_id FROM clauses c JOIN metadata m ON m.doc_id = c.doc_id "
                f"JOIN documents d ON d.doc_id = c.doc_id WHERE d.duplicate_of IS NULL AND m.is_amendment = 0 "
                f"AND m.doc_type = ? AND c.clause_type = ? AND c.{col} != 'PRESENT'", (doc_type, clause))}
        out.append({
            "id": qid,
            "recall_model": pr(found["model_status"], expected)[1],
            "recall_checked": pr(found["status"], expected)[1],
            "missed_by_model": sorted(expected - found["model_status"]),
        })
    return out


def _metadata(con, truth: dict) -> dict:
    """Law, date and document type of our own contracts against data/ground_truth.csv."""
    meta = {r["doc_id"]: dict(r) for r in con.execute("SELECT * FROM metadata")}
    correct = {"governing_law": 0, "effective_date": 0, "doc_type": 0}
    notes, n = [], 0
    for doc_id, t in truth.items():
        m = meta.get(doc_id)
        if not m:
            notes.append(f"{doc_id}: not in register")
            continue
        n += 1
        if t["governing_law"] and m["governing_law"] != LAW.get(t["governing_law"]):
            notes.append(f"{doc_id}: law {m['governing_law']} != {t['governing_law']}")
        else:
            correct["governing_law"] += 1
        if m["effective_date"] == t["date"]:
            correct["effective_date"] += 1
        else:
            notes.append(f"{doc_id}: date {m['effective_date']} != {t['date']}")
        expected_type = "amendment" if t["doc_type"] == "amendment" else t["doc_type"]
        if m["doc_type"] == expected_type:
            correct["doc_type"] += 1
        else:
            notes.append(f"{doc_id}: type {m['doc_type']} != {expected_type}")
    return {"n": n, "correct": correct, "notes": notes}


def _cuad(con, cuad: dict) -> dict:
    """Limitation of liability in the public CUAD contracts against the lawyers' labels."""
    status = {r["doc_id"]: dict(r) for r in con.execute(
        "SELECT doc_id, status FROM clauses WHERE clause_type='liability_limitation' AND doc_id LIKE 'C%'")}
    counts = {"tp": 0, "fp": 0, "fn": 0, "tn": 0, "unclear": 0}
    disagreements = []
    for doc_id, label in cuad.items():
        s = status.get(doc_id, {}).get("status")
        has = label["cap_on_liability"] == "True"
        counts["unclear"] += s == "UNCLEAR"
        if s == "PRESENT" and has:
            counts["tp"] += 1
        elif s == "PRESENT" and not has:
            counts["fp"] += 1
            disagreements.append({"doc_id": doc_id, "register": s, "label": "no cap"})
        elif s != "PRESENT" and has:
            counts["fn"] += 1
            disagreements.append({"doc_id": doc_id, "register": s, "label": "cap"})
        else:
            counts["tn"] += 1
    return {"n": len(cuad), **counts, "disagreements": disagreements}


def evaluate(con) -> dict:
    """Every number of the evaluation, as data. No model call."""
    gold = {q["id"]: q for q in json.loads((config.DATA / "gold_queries.json").read_text(encoding="utf-8"))}
    with open(config.DATA / "ground_truth.csv", encoding="utf-8") as f:
        truth = {r["doc_id"]: r for r in csv.DictReader(f)}
    with open(config.DATA / "cuad_subset" / "labels.csv", encoding="utf-8") as f:
        cuad = {r["doc_id"]: r for r in csv.DictReader(f)}
    questions = _gold_questions(con, gold)
    models = con.execute("SELECT DISTINCT model, prompt_version FROM metadata").fetchall()
    return {
        "config": {"extraction": [{"model": m[0], "prompt_version": m[1]} for m in models],
                   "documents": con.execute("SELECT COUNT(*) FROM documents").fetchone()[0]},
        "questions": questions,
        "ablation": _ablation(con, gold),
        "metadata": _metadata(con, truth),
        "cuad": _cuad(con, cuad),
        "cost": queries.costs(con),
        "all_found": all(q["recall"] == 1.0 for q in questions),
    }


# ---------------------------------------------------------------------------- report
def render(result: dict) -> str:
    """The text report (stored in eval/results/*.txt and compared between runs)."""
    lines = ["Gold questions (answered from the register, no model call)",
             f"{'id':4} {'precision':>9} {'recall':>7}  found / expected / to review"]
    for q in result["questions"]:
        extra = f"  resolved by amendment: {q['resolved_by_amendment']}" if q["id"] == "Q2" else ""
        lines.append(f"{q['id']:4} {q['precision']:9.2f} {q['recall']:7.2f}  "
                     f"{q['found']} / {q['expected']} / {q['to_review']}{extra}")

    lines += ["", "Ablation: model alone (model_status) vs. model + checks (status)",
              f"{'id':4} {'recall model':>12} {'recall checked':>15}  missed by the model alone"]
    for a in result["ablation"]:
        lines.append(f"{a['id']:4} {a['recall_model']:12.2f} {a['recall_checked']:15.2f}  {a['missed_by_model'] or '-'}")

    m = result["metadata"]
    lines += ["", "Metadata vs ground truth (own contracts)"]
    lines += [f"  {note}" for note in m["notes"]]
    lines.append("  " + ", ".join(f"{k} {v}/{m['n']}" for k, v in m["correct"].items()))

    c = result["cuad"]
    lines += ["", "CUAD (public contracts, labels by lawyers): limitation of liability"]
    for d in c["disagreements"]:
        lines.append(f"  {d['doc_id']}: model {d['register']}, CUAD label: {d['label']}")
    lines.append(f"  agreement {c['tp'] + c['tn']}/{c['n']} "
                 f"(TP {c['tp']}, TN {c['tn']}, FP {c['fp']}, FN {c['fn']}, unclear {c['unclear']})")

    cost = result["cost"]
    lines += ["", f"Cost so far: ${cost['cost_usd']} in {cost['calls']} calls "
                  f"({cost['prompt_tokens']} prompt / {cost['completion_tokens']} completion tokens)"]
    for b in cost["by_purpose"]:
        lines.append(f"  {b['purpose']:8} {b['model']:24} {b['calls']:4} calls  ${b['cost_usd']}")
    lines += ["", "RESULT: " + ("all gold contracts found (recall 1.0)" if result["all_found"]
                                else "MISSED contracts - see above")]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description="Evaluate the register against the gold set")
    ap.add_argument("--json", type=Path, help="also write the result as JSON to this file")
    args = ap.parse_args()
    result = evaluate(connect())
    print(render(result))
    if args.json:
        args.json.write_text(json.dumps({"generated_at": now(), **result}, ensure_ascii=False, indent=2),
                             encoding="utf-8")


if __name__ == "__main__":
    main()
