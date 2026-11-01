"""Demo kit for the live moment of the talk (card "live-add", act 6): a handwritten contract
arrives in the contract library while the audience watches, and its problems appear.

    python -m tools.demo status          # documents in the register, is H01 in it, is it in the inbox
    python -m tools.demo drop            # copy data/demo/H01.jpg into the inbox; the watcher reads it
    python -m tools.demo drop --wait     # ... and wait until its findings are in the register (rehearsal)
    python -m tools.demo reset           # forget H01 and delete its inbox file: back to the gold set
    python -m tools.demo reset --force   # ... also while the watcher's pass is not finished (stop it first)

The watcher (`python -m pipeline.run --watch`) does the real work; this script only moves the
file and puts the register back (pipeline/forget.py). REGISTER_DB and INBOX_DIR point it at a
copy of the register and another folder for a dry run. Rehearsal kit: docs/demo.md.

H01 (tools/make_handwritten.py) is not part of the 47 documents: data/demo is not a source
folder, so the evaluation never sees it - unless it is left in the inbox.
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import sys
import time

from pipeline import config, extract, ingest
from pipeline.forget import ForgetRefused, forget, leftovers
from pipeline.store import connect

DEMO_FILE = config.DATA / "demo" / "H01.jpg"
DEMO_ID = "H01"
WAIT_LIMIT_S = 180


def _inbox_file():
    return config.WATCH_DIR / DEMO_FILE.name


def _in_register(con) -> bool:
    return con.execute("SELECT 1 FROM documents WHERE doc_id=?", (DEMO_ID,)).fetchone() is not None


def _pass_running(con) -> bool:
    """H01 was read by a pipeline pass that has not finished: no "run" (or "run_failed") entry in
    the audit log after its latest "ingested" entry - the watcher writes it when it prints "run
    cost". Forgetting H01 now would race the watcher, which is still extracting and indexing it."""
    ingested = con.execute("SELECT MAX(id) FROM audit_log WHERE action='ingested' AND target=?",
                           (DEMO_ID,)).fetchone()[0]
    if ingested is None or not _in_register(con):
        return False
    return con.execute("SELECT 1 FROM audit_log WHERE action IN ('run', 'run_failed') AND id > ?",
                       (ingested,)).fetchone() is None


def _workbench_reviews() -> int | None:
    """Reviews of H01 findings in the workflow database. They are human decisions and survive a
    reset; if H01 comes back with the same text, they apply again (decision 73)."""
    from api.workbench import db_path   # lazy: the demo kit itself does not need the API
    path = db_path()
    if not path.exists():
        return None
    con = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
    try:
        return con.execute("SELECT COUNT(*) FROM finding_reviews WHERE doc_id=?", (DEMO_ID,)).fetchone()[0]
    except sqlite3.OperationalError:
        return None
    finally:
        con.close()


def status(con) -> bool:
    """Print the state; True if the register is ready for the live moment. Not ready while the
    watcher's next pass would read contracts other than H01 again (extract.pending: read with an
    older prompt version, decision 97): it would take minutes, cost money, and a model may answer
    differently on stage (F7)."""
    count = con.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    gold = len(ingest.discover(config.SOURCE_DIRS))
    in_register, in_inbox = _in_register(con), _inbox_file().exists()
    left = leftovers(con, DEMO_ID)
    stale = [d for d in extract.pending(con) if d != DEMO_ID]
    reviews = _workbench_reviews()
    print(f"register   {config.DB_PATH}: {count} documents (source folders hold {gold})")
    state = "IN the register" if in_register else "not in the register"
    if _pass_running(con):
        state += " - the watcher is still working on it (wait until it printed 'run cost')"
    print(f"{DEMO_ID}        {state}")
    print(f"inbox      {config.WATCH_DIR}: {DEMO_FILE.name} {'is there' if in_inbox else 'not there'}")
    if left:
        print(f"leftovers  {DEMO_ID} rows without a document (a reset while the watcher was still writing): "
              + ", ".join(f"{t} {n}" for t, n in left.items()))
    if reviews:
        print(f"reviews    {reviews} review(s) of {DEMO_ID} findings in the workflow database - "
              "they come back when the same file is added again")
    ready = count == gold and not in_register and not in_inbox and not left and DEMO_FILE.exists() and not stale
    if ready:
        verdict = "yes"
    elif in_register or in_inbox or left:
        verdict = "NO - run `python -m tools.demo reset`"
    elif not DEMO_FILE.exists():
        verdict = f"NO - {DEMO_FILE} is missing (python tools/make_handwritten.py)"
    elif stale:
        verdict = (f"NO - {len(stale)} contract{'s were' if len(stale) != 1 else ' was'} read with an older "
                   f"prompt version; the watcher would read {'them' if len(stale) != 1 else 'it'} again "
                   f"(PROMPT_VERSION is {config.PROMPT_VERSION})")
    else:
        verdict = "NO - the register does not match the source folders (python -m pipeline.run)"
    print(f"ready for the live demo: {verdict}")
    return ready


def drop(con, wait: bool = False) -> int:
    if not DEMO_FILE.exists():
        print(f"{DEMO_FILE} is missing - run `python tools/make_handwritten.py`", file=sys.stderr)
        return 2
    if _in_register(con):
        # same file, same hash: the watcher would skip it and the card would show nothing new
        print(f"{DEMO_ID} is already in the register - run `python -m tools.demo reset` first", file=sys.stderr)
        return 2
    config.WATCH_DIR.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    shutil.copy2(DEMO_FILE, _inbox_file())
    print(f"dropped {DEMO_FILE.name} into {config.WATCH_DIR} at {time.strftime('%H:%M:%S')}")
    if not wait:
        return 0
    print("waiting for the watcher (`python -m pipeline.run --watch`) ...")
    while time.monotonic() - started < WAIT_LIMIT_S:
        if con.execute("SELECT COUNT(*) FROM clauses WHERE doc_id=?", (DEMO_ID,)).fetchone()[0]:
            print(f"{DEMO_ID} findings in the register after {time.monotonic() - started:.1f} s")
            return 0
        time.sleep(0.5)
    print(f"no findings for {DEMO_ID} after {WAIT_LIMIT_S} s - is the watcher running on this inbox and register?",
          file=sys.stderr)
    return 1


def _keep_demo_file() -> None:
    """A plain drag in Explorer moves the file instead of copying it; the reset would then delete
    the only copy. Put it back first."""
    if not DEMO_FILE.exists() and _inbox_file().exists():
        DEMO_FILE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(_inbox_file(), DEMO_FILE)
        print(f"copied {_inbox_file()} back to {DEMO_FILE} (it had been moved, not copied)")


def reset(con, force: bool = False) -> int:
    if _pass_running(con) and not force:
        print(f"refused, nothing changed: the watcher is still working on {DEMO_ID} - wait until it printed "
              "'run cost', or stop it (Ctrl+C) and run `python -m tools.demo reset --force`", file=sys.stderr)
        return 2
    _keep_demo_file()
    if _in_register(con) or leftovers(con, DEMO_ID):
        try:
            result = forget(con, [DEMO_ID], remove_file=True, actor="demo:reset")
        except ForgetRefused as exc:
            print(f"refused, nothing changed: {exc}", file=sys.stderr)
            return 2
        rows = result["documents"][DEMO_ID]
        print(f"forgot {DEMO_ID}: " + ", ".join(f"{t} {n}" for t, n in rows.items()))
    elif _inbox_file().exists():   # dropped, but the watcher never read it
        _inbox_file().unlink()
        print(f"removed {_inbox_file()} ({DEMO_ID} was not in the register)")
    else:
        print(f"nothing to reset: {DEMO_ID} is neither in the register nor in the inbox")
    return 0 if status(con) else 1


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Live-demo kit: drop the handwritten contract H01, reset, status")
    ap.add_argument("command", choices=["drop", "reset", "status"])
    ap.add_argument("--wait", action="store_true", help="drop: wait until the findings are in the register")
    ap.add_argument("--force", action="store_true",
                    help="reset: also while the watcher's pass is not finished (stop the watcher first)")
    args = ap.parse_args(argv)
    con = connect()
    if args.command == "drop":
        return drop(con, args.wait)
    if args.command == "reset":
        return reset(con, args.force)
    return 0 if status(con) else 1


if __name__ == "__main__":
    sys.exit(main())
