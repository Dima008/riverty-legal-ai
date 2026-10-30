"""Look into the register from the terminal (until the Legal Workbench exists).

    python -m pipeline.show            # overview: documents, clause findings, costs
    python -m pipeline.show M08        # one contract: metadata, family, every finding with evidence
    python -m pipeline.show --audit 15 # last 15 audit log entries
"""

from __future__ import annotations

import argparse
import json

from . import catalogue, queries
from .store import connect


def overview(con) -> None:
    docs = con.execute("SELECT COUNT(*) n, SUM(page_count) p FROM documents").fetchone()
    print(f"Register: {docs['n']} documents, {docs['p']} pages, "
          f"{con.execute('SELECT COUNT(*) FROM chunks').fetchone()[0]} chunks, "
          f"{con.execute('SELECT COUNT(*) FROM embeddings').fetchone()[0]} embeddings\n")
    print("Documents by type and format")
    for r in con.execute("SELECT m.doc_type, d.format, COUNT(*) n FROM documents d JOIN metadata m USING (doc_id) "
                         "GROUP BY 1, 2 ORDER BY 1, 2"):
        print(f"  {r['doc_type']:28} {r['format']:10} {r['n']:3}")
    print("\nFindings per clause type (status after checks; model said PRESENT but checks disagreed = overruled)")
    print(f"  {'clause':26} {'PRESENT':>8} {'ABSENT':>7} {'UNCLEAR':>8} {'overruled':>10} {'to review':>10}")
    for key in catalogue.CLAUSES:
        r = con.execute(
            "SELECT SUM(status='PRESENT') p, SUM(status='ABSENT') a, SUM(status='UNCLEAR') u, "
            "SUM(model_status='PRESENT' AND status!='PRESENT') o, SUM(confidence < 0.85) rv "
            "FROM clauses WHERE clause_type=?", (key,)).fetchone()
        print(f"  {key:26} {r['p']:8} {r['a']:7} {r['u']:8} {r['o']:10} {r['rv']:10}")
    dups = queries.duplicates(con)
    legacy = queries.legacy_names(con)
    dup_text = ", ".join(f"{d['doc_id']} = copy of {d['duplicate_of']}" for d in dups) or "none"
    print(f"\nDuplicates: {dup_text}")
    print(f"Legacy company names: {len(legacy['open'])} open occurrences in "
          f"{len({h['doc_id'] for h in legacy['open']})} contracts, "
          f"{len(legacy['resolved'])} already resolved by an amendment")
    c = queries.costs(con)
    print(f"\nModel cost so far: ${c['cost_usd']} in {c['calls']} calls")
    for b in c["by_purpose"]:
        print(f"  {b['purpose']:8} {b['model']:24} {b['calls']:4} calls  ${b['cost_usd']}")
    print("\nDetails of one contract: python -m pipeline.show M08")


def contract(con, doc_id: str) -> None:
    d = con.execute("SELECT * FROM documents WHERE doc_id=?", (doc_id,)).fetchone()
    m = con.execute("SELECT * FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()
    if d is None:
        print(f"{doc_id} is not in the register")
        return
    print(f"{doc_id}  {m['title'] if m else ''}")
    print(f"  file:          {d['source_path']}")
    print(f"  format:        {d['format']}, {d['page_count']} pages, language {d['language']}, status {d['status']}"
          + (f", OCR confidence {d['ocr_mean_conf']:.0f}" if d["ocr_mean_conf"] else ""))
    if m:
        print(f"  type:          {m['doc_type']}")
        print(f"  parties:       {m['own_entity_name']} / {m['counterparty_name']}")
        print(f"  current name:  {m['current_own_entity_name']}")
        print(f"  date, law:     {m['effective_date']}, {m['governing_law']}")
    print(f"  family:        {d['family_id']}" + (f", DUPLICATE of {d['duplicate_of']}" if d["duplicate_of"] else ""))
    if json.loads(d["flags"] or "[]"):
        print(f"  flags:         {', '.join(json.loads(d['flags']))}")
    hits = con.execute("SELECT name, page, resolved_by FROM name_hits WHERE doc_id=?", (doc_id,)).fetchall()
    for h in hits:
        print(f"  legacy name:   '{h['name']}' on page {h['page']}"
              + (f" (resolved by {h['resolved_by']})" if h["resolved_by"] else " (open)"))
    print("\nFindings")
    for r in con.execute("SELECT * FROM clauses WHERE doc_id=? ORDER BY clause_type", (doc_id,)):
        required = m and m["doc_type"] in catalogue.CLAUSES[r["clause_type"]]["required_for"]
        changed = f" (model said {r['model_status']})" if r["model_status"] != r["status"] else ""
        print(f"\n  {r['clause_type']}{' [required]' if required else ''}: {r['status']}{changed}, "
              f"confidence {r['confidence']}")
        if r["quote"]:
            print(f"    quote:     \"{r['quote'][:220]}\"")
            print(f"    found:     page {r['page']}, {r['section']}, match {r['quote_score']}")
        print(f"    rationale: {r['rationale']}")
        for f in json.loads(r["flags"] or "[]"):
            print(f"    signal:    {f[:160]}")
    cost = con.execute("SELECT COUNT(*), COALESCE(SUM(cost_usd),0) FROM llm_calls WHERE doc_id=?", (doc_id,)).fetchone()
    print(f"\n  model calls for this document: {cost[0]}, ${cost[1]:.4f}")


def audit_log(con, n: int) -> None:
    for r in con.execute("SELECT ts, actor, action, target, details_json FROM audit_log ORDER BY id DESC LIMIT ?", (n,)):
        print(f"{r['ts']}  {r['actor']:18} {r['action']:18} {r['target']:8} {r['details_json'][:120]}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Show the contract register")
    ap.add_argument("doc_id", nargs="?")
    ap.add_argument("--audit", type=int, metavar="N")
    args = ap.parse_args()
    con = connect()
    if args.audit:
        audit_log(con, args.audit)
    elif args.doc_id:
        contract(con, args.doc_id)
    else:
        overview(con)


if __name__ == "__main__":
    main()
