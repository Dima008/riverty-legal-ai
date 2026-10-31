"""Forget a document: remove it and everything derived from it from the register.

    python -m pipeline.forget H01                           # refused while H01.jpg is still in the inbox
    python -m pipeline.forget H01 --remove-file --dry-run   # only show what would be removed, files too
    python -m pipeline.forget H01 --remove-file             # also delete its file from the inbox

Why. The register is compiled from the contract library. A contract that leaves the library
must leave the register too, or "which contracts lack clause X?" keeps answering with a
contract that no longer exists. This is the first building block of deletion sync (a known
gap): in production the Microsoft Graph delta query on the SharePoint library returns the
removed item with a "deleted" facet, and the connector calls forget() with its id. Today it
puts the register back to the 47 documents of the gold set after the live demo added the
handwritten contract H01 (tools/demo.py, docs/demo.md).

Removed, in one transaction - every table of pipeline/store.py that holds the document:
documents, doc_text, pages, chunks, chunks_fts (search rows), embeddings (by chunk id),
metadata, clauses (findings), name_hits (legacy names). Documents that pointed at it
(duplicate_of, family_id) are reset, then the families step runs again exactly as in
pipeline.run: copies, amendments, the current company name and every legacy-name hit are
recomputed without it. The rebuild is part of the same transaction: if it fails, nothing is
removed and forget can simply be run again. Rows of an id that has no document row any more
(left behind by a watcher that was still writing when the document was forgotten) are
removed the same way.

Kept on purpose:
- llm_calls: the money was really spent, so the cost view must still add up. The calls are
  re-labelled "forgotten:<id>@<time>" instead of deleted. No count of documents or findings
  reads llm_calls, and a per-document count (journey, show, calls per document) never mixes
  them with a later document that gets the same id - e.g. H01 added again at the next rehearsal.
  Calls that arrive after the forget (the model was still reading the document) get the same
  label: pipeline/extract.py drops the late result and calls late_calls().
- audit_log: history is append-only; a "forgotten" entry records what was removed, the label of
  the calls and the first-ingest time.
- the workflow database (api/workbench.py): runs are snapshots of what a reviewer saw and
  reviews are human decisions; neither is regenerated. A review belongs to one version of a
  finding (decision 73): if the same file comes back with the same text, its reviews apply again.

Refused, nothing changed:
- an unknown id;
- a document whose file is in a source folder (the library; here the gold set in data/raw and
  data/cuad_subset). forget never deletes from the library: in production the deletion there
  is what calls forget, not the other way round. Remove the file yourself first. If it comes
  back later it is a new document with a new first-ingest time, so it can swap roles with its
  copy (the earlier document stays the original - F6, F22);
- a document whose file is still in the inbox, unless --remove-file is given - otherwise the
  watcher would put it straight back. --remove-file only ever deletes inbox files.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import config, families, ingest
from .store import audit, connect, now, transaction

# Tables holding rows of one document, keyed by doc_id (embeddings are keyed by chunk id).
DOC_TABLES = ("documents", "pages", "doc_text", "chunks", "chunks_fts", "metadata", "clauses", "name_hits")
KEPT = "llm_calls (kept, re-labelled)"


class ForgetRefused(Exception):
    """Nothing was changed."""


def files_to_be_read_again(doc_ids: list[str]) -> dict[str, list[Path]]:
    """Files the next run would ingest under these ids (source folders and the inbox)."""
    found = ingest.discover(config.SOURCE_DIRS + [config.WATCH_DIR])
    return {s.doc_id: s.files for s in found if s.doc_id in doc_ids}


def in_inbox(path: Path) -> bool:
    return path.resolve().is_relative_to(config.WATCH_DIR.resolve())


def rows_of(con, doc_id: str) -> dict[str, int]:
    """How many rows the document has in every table that holds it."""
    count = lambda sql: con.execute(sql, (doc_id,)).fetchone()[0]
    counts = {t: count(f"SELECT COUNT(*) FROM {t} WHERE doc_id=?") for t in DOC_TABLES}
    counts["embeddings"] = count("SELECT COUNT(*) FROM embeddings WHERE chunk_id IN "
                                 "(SELECT chunk_id FROM chunks WHERE doc_id=?)")
    counts[KEPT] = count("SELECT COUNT(*) FROM llm_calls WHERE doc_id=?")
    return counts


def leftovers(con, doc_id: str) -> dict[str, int]:
    """Rows of an id that has no document row: written by a watcher that was still working on it
    when it was forgotten. Empty if the document is in the register, or if nothing is left."""
    rows = rows_of(con, doc_id)
    return {} if rows["documents"] else {t: n for t, n in rows.items() if n}


def calls_label(con, doc_id: str) -> str:
    """The label the last forget gave the document's model calls (a new one if there was none)."""
    row = con.execute("SELECT details_json FROM audit_log WHERE action='forgotten' AND target=? "
                      "ORDER BY id DESC LIMIT 1", (doc_id,)).fetchone()
    return (json.loads(row[0]).get("calls_label") if row else None) or f"forgotten:{doc_id}@{now()}"


def late_calls(con, doc_id: str, actor: str = "pipeline") -> int:
    """The document was forgotten while the model was reading it: its calls were recorded after
    the forget, under the bare id. They get the label of that forget, so they count as its calls
    and never as calls of a later document with the same id. Returns how many were re-labelled."""
    with transaction(con):
        label = calls_label(con, doc_id)
        n = con.execute("UPDATE llm_calls SET doc_id=? WHERE doc_id=?", (label, doc_id)).rowcount
        audit(con, actor, "extraction_dropped", doc_id, reason="forgotten while the model was reading it",
              calls_relabelled=n, calls_label=label)
    return n


def _listed(files: dict[str, list[Path]]) -> str:
    return "; ".join(f"{d}: {', '.join(str(p) for p in ps)}" for d, ps in files.items())


def forget(con, doc_ids: list[str], remove_file: bool = False, dry_run: bool = False,
           actor: str = "pipeline:forget", log=print) -> dict:
    """Remove the documents from the register. Raises ForgetRefused before changing anything."""
    doc_ids = list(dict.fromkeys(doc_ids))
    removed = {d: rows_of(con, d) for d in doc_ids}
    unknown = [d for d, rows in removed.items() if not any(rows.values())]
    if unknown:
        raise ForgetRefused(f"not in the register: {', '.join(unknown)}")
    files = files_to_be_read_again(doc_ids)
    library = {d: [p for p in ps if not in_inbox(p)] for d, ps in files.items()}
    library = {d: ps for d, ps in library.items() if ps}
    if library:
        raise ForgetRefused(f"in a source folder (the library - here the gold set): {_listed(library)} - "
                            "forget never deletes from the library; remove the file there first "
                            "(if it comes back, it is a new document: docs/pipeline.md)")
    if files and not remove_file:
        raise ForgetRefused(f"still in the inbox, the next run would read it again: {_listed(files)} - "
                            "pass --remove-file to delete it from the inbox")
    result = {"documents": removed, "files_removed": [str(p) for ps in files.values() for p in ps],
              "dry_run": dry_run}
    if dry_run:
        return result
    # Files first: if the watcher polls in between, it finds neither the file nor a gap to fill.
    for ps in files.values():
        for p in ps:
            p.unlink()
            log(f"removed file {p}")
    ts = now()
    with transaction(con):
        for d in doc_ids:
            label = f"forgotten:{d}@{ts}"
            first = con.execute("SELECT ingested_at FROM documents WHERE doc_id=?", (d,)).fetchone()
            con.execute("DELETE FROM embeddings WHERE chunk_id IN (SELECT chunk_id FROM chunks WHERE doc_id=?)", (d,))
            for table in DOC_TABLES:
                con.execute(f"DELETE FROM {table} WHERE doc_id=?", (d,))
            # pointers of other documents; families.run() below sets them again where they still hold
            con.execute("UPDATE documents SET duplicate_of=NULL WHERE duplicate_of=?", (d,))
            con.execute("UPDATE documents SET family_id=doc_id WHERE family_id=?", (d,))
            con.execute("UPDATE llm_calls SET doc_id=? WHERE doc_id=?", (label, d))
            audit(con, actor, "forgotten", d, rows=removed[d], files_removed=[str(p) for p in files.get(d, [])],
                  calls_label=label, ingested_at=first[0] if first else None)
        # Inside the same transaction: transaction() is re-entrant on one connection, so the commit
        # at the end of families.run() commits the deletes too, and an error rolls both back.
        fam = families.run(con)
    result["families"] = {k: fam[k] for k in ("duplicates", "orphan_amendments", "legacy_name_hits")}
    return result


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Remove documents and everything derived from them from the register")
    ap.add_argument("doc_ids", nargs="+", help="document ids, e.g. H01")
    ap.add_argument("--remove-file", action="store_true",
                    help="also delete the file from the inbox (else the next run reads it again); "
                         "files in a source folder are never deleted")
    ap.add_argument("--dry-run", action="store_true", help="only show what would be removed")
    args = ap.parse_args(argv)
    con = connect()
    try:
        result = forget(con, args.doc_ids, remove_file=args.remove_file, dry_run=args.dry_run)
    except ForgetRefused as exc:
        print(f"refused, nothing changed: {exc}", file=sys.stderr)
        return 2
    verb = "would remove" if args.dry_run else "removed"
    if args.dry_run:
        for path in result["files_removed"]:
            print(f"would remove file {path}")
    for doc_id, rows in result["documents"].items():
        print(f"{verb} {doc_id}: " + ", ".join(f"{t} {n}" for t, n in rows.items()))
    if not args.dry_run:
        fam = result["families"]
        print(f"families rebuilt: duplicates={fam['duplicates']} base agreement not in register="
              f"{fam['orphan_amendments']} legacy name hits={fam['legacy_name_hits']}")
        print(f"documents in the register: {con.execute('SELECT COUNT(*) FROM documents').fetchone()[0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
