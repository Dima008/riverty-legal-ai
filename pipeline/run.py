"""Pipeline entry point.

    python -m pipeline.run                 # process new or changed documents
    python -m pipeline.run --only M14 --force
    python -m pipeline.run --watch         # watch data/inbox (stand-in for the SharePoint library)
    python -m pipeline.run --no-index      # without search index (evaluation runs, see eval/repeat.py)

Every step is idempotent: unchanged files (same hash) are skipped, extraction only
reruns when the text or the prompt version changed.
"""

from __future__ import annotations

import argparse
import time

from . import chunking, config, extract, families, index, ingest
from .llm import ModelAdapter
from .store import audit, connect, now, transaction


def run_once(con, adapter, only: list[str] | None = None, force: bool = False, log=print,
             build_index: bool = True) -> dict:
    started = now()
    sources = ingest.discover(config.SOURCE_DIRS + [config.WATCH_DIR])
    if only:
        sources = [s for s in sources if s.doc_id in only]
    if force:
        with transaction(con):
            for s in sources:
                con.execute("UPDATE documents SET file_sha256='' WHERE doc_id=?", (s.doc_id,))
    new = ingest.ingest(con, sources)
    if new:
        log(f"ingested {len(new)}: {', '.join(new)}")
        log(f"chunks: {chunking.run(con, new)}")
    todo = [d for d in extract.pending(con) if not only or d in only]
    result = {"ingested": new, "extracted": [], "failed": []}
    if todo:
        log(f"extracting {len(todo)} with {config.CHAT_DEPLOYMENT} ({config.PROMPT_VERSION})")
        result.update(extract.run(con, adapter, todo, log=log))
        fam = families.run(con)
        log(f"families: duplicates={fam['duplicates']} amendments={fam['amendments']} "
            f"base agreement not in register={fam['orphan_amendments']} legacy name hits={fam['legacy_name_hits']}")
        if build_index:
            index.contextualise(con, result["extracted"])
    # the search index is only needed for open questions; evaluation runs skip it (--no-index)
    embedded = index.embed_missing(con, adapter) if build_index else 0
    if embedded:
        log(f"embedded {embedded} chunks with {config.EMBED_DEPLOYMENT}")
    cost = con.execute("SELECT COALESCE(SUM(cost_usd),0), COUNT(*) FROM llm_calls WHERE ts >= ?", (started,)).fetchone()
    result["cost_usd"], result["model_calls"] = round(cost[0], 4), cost[1]
    if new or todo or embedded:
        with transaction(con):
            audit(con, "pipeline", "run", "*", **result)
        log(f"run cost: ${cost[0]:.4f} in {cost[1]} model calls")
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description="Contract pipeline")
    ap.add_argument("--only", help="comma-separated doc ids")
    ap.add_argument("--force", action="store_true", help="reprocess even if unchanged")
    ap.add_argument("--watch", action="store_true", help="poll the inbox folder")
    ap.add_argument("--interval", type=int, default=5)
    ap.add_argument("--reassess", action="store_true", help="replay deterministic checks without model calls")
    ap.add_argument("--no-index", action="store_true", help="skip context lines and embeddings (evaluation runs)")
    args = ap.parse_args()
    config.check_prices()
    con = connect()
    adapter = ModelAdapter()
    only = args.only.split(",") if args.only else None
    if args.reassess:
        extract.reassess(con)
        families.run(con)
        return
    run_once(con, adapter, only, args.force, build_index=not args.no_index)
    if args.watch:
        config.WATCH_DIR.mkdir(parents=True, exist_ok=True)
        print(f"watching {config.WATCH_DIR} - drop a PDF, JPEG or TXT there (Ctrl+C to stop)")
        while True:
            time.sleep(args.interval)
            run_once(con, adapter)


if __name__ == "__main__":
    main()
