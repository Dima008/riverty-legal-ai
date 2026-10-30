"""What if a safeguard were missing? The live failure demo ("switch a check off").

The stored model answers are replayed through the checks with chosen layers switched off, on an
in-memory copy of the register: production data is never touched, no model is called, nothing
costs money, and the result is the same every time (well under a second). The gold questions are
then answered from the copy exactly as in production, so the numbers compare 1:1 with the
evaluation.

    python -m eval.what_if                      # every layer switched off on its own
    python -m eval.what_if checker clause_vocabulary
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys

from pipeline import extract, families
from pipeline.portfolio import triage
from pipeline.store import connect

from .check_register import gold_questions, load_gold

# Every safeguard that can be switched off, in the order of the guardrail sandwich.
LAYERS = [
    {"id": "quote_found", "group": "Checks on a found clause",
     "label": "The quote must exist in the contract",
     "guards": "evidence the model invented or misquoted", "failures": ["F4"]},
    {"id": "clause_vocabulary", "group": "Checks on a found clause",
     "label": "The quote must use the clause's vocabulary",
     "guards": "a real quote filed under the wrong clause", "failures": ["F1"]},
    {"id": "checker", "group": "Checks on a found clause",
     "label": "A second model call must agree (maker-checker)",
     "guards": "a quote that does not meet Legal's definition", "failures": ["F1", "F7", "F11"]},
    {"id": "injection_guard", "group": "Checks on a found clause",
     "label": "Text addressed to software is fenced off",
     "guards": "instructions hidden in a contract (prompt injection, M14)", "failures": []},
    {"id": "absence_signals", "group": "Signals that call a human",
     "label": "Clause words in the text question a 'missing'",
     "guards": "a 'missing' that nobody double-checks", "failures": ["F5"]},
    {"id": "ocr_guard", "group": "Signals that call a human",
     "label": "Scanned text lowers the confidence",
     "guards": "trusting text that OCR may have misread", "failures": ["F2", "F9"]},
    {"id": "amendment_check", "group": "Register rules",
     "label": "Only a real amendment is treated as one",
     "guards": "a contract silently dropped from every answer as an 'amendment'", "failures": ["F10"]},
    {"id": "recall_first", "group": "Register rules",
     "label": "Unclear counts as missing",
     "guards": "dropping every case the system is unsure about", "failures": []},
]
LAYER_IDS = frozenset(layer["id"] for layer in LAYERS)
# The model's answer as it is: every check on a found clause switched off. Matches the
# "model alone" ablation of the evaluation (eval.check_register._ablation).
MODEL_ALONE = frozenset({"quote_found", "clause_vocabulary", "checker", "injection_guard"})


def replay(con: sqlite3.Connection, off: frozenset[str]) -> sqlite3.Connection:
    """An in-memory copy of the register, re-assessed with the layers in `off` left out."""
    copy = sqlite3.connect(":memory:", check_same_thread=False)
    con.backup(copy)
    copy.row_factory = sqlite3.Row
    extract.reassess(copy, log=lambda *_: None, off=off)
    families.run(copy)
    if "recall_first" in off:   # report only what is surely missing; unsure cases are dropped
        copy.execute("UPDATE clauses SET status = 'PRESENT' WHERE status = 'UNCLEAR'")
    return copy


def _findings(con: sqlite3.Connection) -> dict[tuple[str, str], dict]:
    """Every finding as a lawyer would meet it: reported as missing or not, and who looks at it."""
    out = {}
    for r in con.execute(
            "SELECT c.doc_id, c.clause_type, c.status, c.confidence, c.flags, d.flags AS doc_flags, "
            "d.duplicate_of, m.is_amendment FROM clauses c JOIN documents d ON d.doc_id = c.doc_id "
            "JOIN metadata m ON m.doc_id = c.doc_id"):
        flags = json.loads(r["flags"] or "[]") + json.loads(r["doc_flags"] or "[]")
        reported = r["status"] != "PRESENT" and not r["is_amendment"] and r["duplicate_of"] is None
        out[(r["doc_id"], r["clause_type"])] = {
            "status": r["status"], "confidence": r["confidence"], "reported": reported,
            "triage": triage(r["status"], r["confidence"], flags) if reported else None,
            "flags": [f.split(":")[0] for f in flags],
        }
    return out


CAUTION = {None: 0, "CONFIRM": 1, "REVIEW": 2, "FOUR_EYES": 3}   # not reported < confirm < review < four eyes


def _changes(before: dict, after: dict) -> list[dict]:
    """Findings that a lawyer would see differently, with the signals that no longer fire."""
    out = []
    for key, b in sorted(before.items()):
        a = after[key]
        if (b["status"], b["reported"], b["triage"]) == (a["status"], a["reported"], a["triage"]):
            continue
        out.append({
            "doc_id": key[0], "clause_type": key[1],
            "before": {k: b[k] for k in ("status", "confidence", "reported", "triage")},
            "after": {k: a[k] for k in ("status", "confidence", "reported", "triage")},
            "no_longer_raised": sorted(set(b["flags"]) - set(a["flags"])),
        })
    return out


def what_if(con: sqlite3.Connection, off) -> dict:
    """Q1-Q8 and every finding, with all safeguards and with the layers in `off` switched off."""
    off = frozenset(off)
    if unknown := off - LAYER_IDS:
        raise ValueError(f"unknown layers {sorted(unknown)}; known: {sorted(LAYER_IDS)}")
    gold = load_gold()
    before = gold_questions(con, gold)
    copy = replay(con, off)
    try:
        after = gold_questions(copy, gold)
        changes = _changes(_findings(con), _findings(copy))
    finally:
        copy.close()
    questions = []
    for b, a in zip(before, after):
        expected = set(b["expected"])
        questions.append({
            "id": b["id"], "question": b["question"], "expected": b["expected"],
            "recall": [b["recall"], a["recall"]], "precision": [b["precision"], a["precision"]],
            "missed": sorted((set(b["found"]) - set(a["found"])) & expected),
            "wrongly_reported": sorted(set(a["found"]) - set(b["found"]) - expected),
        })
    return {
        "off": sorted(off),
        "questions": questions,
        "changes": changes,
        "summary": {
            "questions_changed": sum(q["recall"][0] != q["recall"][1] or q["precision"][0] != q["precision"][1]
                                     for q in questions),
            "contracts_missed": sorted({d for q in questions for d in q["missed"]}),
            "findings_changed": len(changes),
            "second_look_lost": sum(c["before"]["triage"] in ("FOUR_EYES", "REVIEW")
                                    and c["after"]["triage"] not in ("FOUR_EYES", "REVIEW") for c in changes),
            # Design invariant: a safeguard only ever adds caution, so switching one off can never
            # make a finding more cautious. Always 0 - tested in tests/test_what_if.py.
            "more_cautious": sum(CAUTION[c["after"]["triage"]] > CAUTION[c["before"]["triage"]] for c in changes),
        },
    }


_EVERY_LAYER: dict[tuple, list[dict]] = {}


def every_layer(con: sqlite3.Connection) -> list[dict]:
    """Each layer switched off on its own, then the model alone: what changes on Q1-Q8.
    Cached per register state (file and modification time) - about 0.7 s per layer."""
    path = con.execute("PRAGMA database_list").fetchone()[2]
    stamp = (path, os.stat(path).st_mtime_ns) if path else None
    if stamp in _EVERY_LAYER:
        return _EVERY_LAYER[stamp]
    rows = []
    for layer_id, off in [(layer["id"], frozenset({layer["id"]})) for layer in LAYERS] + [("model_alone", MODEL_ALONE)]:
        r = what_if(con, off)
        rows.append({
            "layer": layer_id, "off": r["off"],
            "recall_before": {q["id"]: q["recall"][0] for q in r["questions"]},
            "recall": {q["id"]: q["recall"][1] for q in r["questions"]},
            "precision": {q["id"]: q["precision"][1] for q in r["questions"]},
            **r["summary"],
        })
    if stamp:
        _EVERY_LAYER[stamp] = rows
    return rows


def main() -> None:
    con = connect()
    if len(sys.argv) > 1:
        r = what_if(con, sys.argv[1:])
        for q in r["questions"]:
            print(f"{q['id']}  recall {q['recall'][0]:.2f} -> {q['recall'][1]:.2f}  "
                  f"precision {q['precision'][0]:.2f} -> {q['precision'][1]:.2f}  missed {q['missed']}")
        for c in r["changes"]:
            print(f"  {c['doc_id']:6} {c['clause_type']:24} {c['before']['status']:8} -> {c['after']['status']:8} "
                  f"triage {c['before']['triage']} -> {c['after']['triage']}  no longer raised {c['no_longer_raised']}")
        return
    print(f"{'switched off':20} " + " ".join(f"{q:>4}" for q in [f"Q{i}" for i in range(1, 9)])
          + "  missed / findings changed / second look lost")
    for row in every_layer(con):
        print(f"{row['layer']:20} " + " ".join(f"{row['recall'][f'Q{i}']:4.2f}" for i in range(1, 9))
              + f"  {row['contracts_missed']} / {row['findings_changed']} / {row['second_look_lost']}")


if __name__ == "__main__":
    main()
