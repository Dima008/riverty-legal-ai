"""Forget a document (pipeline/forget.py) and the live-demo kit (tools/demo.py), on a copy of the
register. No model call: forget is pure SQL plus the deterministic families step; the demo test
reads the handwritten page with Tesseract and stops before extraction; the late-result test
replays a stored model answer through a fake adapter."""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys

import pytest

from pipeline import chunking, config, extract, ingest
from pipeline.forget import ForgetRefused, forget, leftovers
from pipeline.store import add_missing_columns, now, transaction

QUIET = dict(log=lambda *_: None)
LOGS = ("audit_log", "sqlite_sequence")     # append-only history and SQLite's counters


@pytest.fixture
def register(tmp_path):
    if not config.DB_PATH.exists():
        pytest.skip("register not built: python -m pipeline.run")
    con = sqlite3.connect(tmp_path / "register.sqlite", check_same_thread=False)
    source = sqlite3.connect(config.DB_PATH.as_uri() + "?mode=ro", uri=True)
    source.backup(con)
    source.close()
    add_missing_columns(con)     # a copy of an older register gets today's columns
    con.row_factory = sqlite3.Row
    yield con
    con.close()


@pytest.fixture
def no_sources(tmp_path, monkeypatch):
    """Empty source folders and inbox: the next run would read nothing, so forget is allowed."""
    inbox = tmp_path / "inbox"
    inbox.mkdir()
    monkeypatch.setattr(config, "SOURCE_DIRS", [])
    monkeypatch.setattr(config, "WATCH_DIR", inbox)
    return inbox


def _tables(con, skip=LOGS) -> list[str]:
    return [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            if r[0] not in skip and not r[0].startswith("chunks_fts_")]     # FTS5 internals


def _chunk_ids(con, doc_id: str) -> set[str]:
    return {r[0] for r in con.execute("SELECT chunk_id FROM chunks WHERE doc_id=?", (doc_id,))}


def _references(con, doc_id: str, chunk_ids: set[str]) -> dict[str, int]:
    """Rows in any table (logs aside) with a value equal to the document id or one of its chunk ids."""
    found = {}
    for t in _tables(con):
        n = sum(any(v == doc_id or v in chunk_ids for v in r) for r in con.execute(f'SELECT * FROM "{t}"'))
        if n:
            found[t] = n
    return found


def _others(con, doc_id: str, chunk_ids: set[str]) -> dict[str, list[str]]:
    """Every row that does not belong to the document, table by table (llm_calls aside)."""
    out = {}
    for t in _tables(con, LOGS + ("llm_calls",)):
        cur = con.execute(f'SELECT * FROM "{t}"')
        cols = [c[0] for c in cur.description]
        out[t] = sorted(repr(tuple(r)) for r in cur
                        if dict(zip(cols, r)).get("doc_id") != doc_id and dict(zip(cols, r)).get("chunk_id") not in chunk_ids)
    return out


def test_forget_removes_every_row_and_keeps_the_cost(register, no_sources):
    con = register
    chunks = _chunk_ids(con, "M04")
    assert {"documents", "pages", "chunks", "chunks_fts", "embeddings", "clauses", "name_hits",
            "llm_calls"} <= set(_references(con, "M04", chunks))
    others = _others(con, "M04", chunks)
    calls, cost = con.execute("SELECT COUNT(*), SUM(cost_usd) FROM llm_calls").fetchone()
    own_calls = con.execute("SELECT COUNT(*) FROM llm_calls WHERE doc_id='M04'").fetchone()[0]

    result = forget(con, ["M04"], **QUIET)

    assert _references(con, "M04", chunks) == {}                 # no row of M04 left anywhere
    assert _others(con, "M04", chunks) == others                 # every other row exactly as before
    assert result["documents"]["M04"]["documents"] == 1 and result["files_removed"] == []
    # the money was spent: every call stays, re-labelled, so no per-document count includes M04
    assert tuple(con.execute("SELECT COUNT(*), SUM(cost_usd) FROM llm_calls").fetchone()) == (calls, cost)
    assert con.execute("SELECT COUNT(*) FROM llm_calls WHERE doc_id LIKE 'forgotten:M04@%'").fetchone()[0] == own_calls
    assert con.execute("SELECT COUNT(*) FROM audit_log WHERE action='forgotten' AND target='M04'").fetchone()[0] == 1
    # the search index's own tables (FTS5 internals, skipped above) are consistent with the rows
    con.execute("INSERT INTO chunks_fts(chunks_fts) VALUES('integrity-check')")
    assert con.execute("SELECT COUNT(*) FROM chunks_fts").fetchone()[0] == con.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]


def test_families_are_rebuilt_without_the_document(register, no_sources):
    """M15 is the copy of M01, M05-A amends M05: forget the originals, and the copy becomes a
    contract of its own, the amendment loses its base agreement (a finding for Legal)."""
    con = register
    forget(con, ["M01", "M05"], **QUIET)
    doc = lambda d: con.execute("SELECT family_id, duplicate_of, flags FROM documents WHERE doc_id=?", (d,)).fetchone()
    assert (doc("M15")["family_id"], doc("M15")["duplicate_of"]) == ("M15", None)
    assert doc("M05-A")["family_id"] == "M05-A" and "amendment_base_not_in_register" in doc("M05-A")["flags"]
    assert con.execute("SELECT COUNT(*) FROM name_hits WHERE doc_id='M05' OR resolved_by='M05'").fetchone()[0] == 0


def test_forgetting_a_renaming_amendment_brings_the_old_name_back(register, no_sources):
    """M05-A renames our entity in M05. Without it, M05 names the legacy company again, and its
    legacy-name hits are open again - no hit may point at the forgotten amendment."""
    con = register
    name = lambda: tuple(con.execute("SELECT own_entity_name, current_own_entity_name FROM metadata "
                                     "WHERE doc_id='M05'").fetchone())
    own, current = name()
    assert current != own and con.execute("SELECT COUNT(*) FROM name_hits WHERE resolved_by='M05-A'").fetchone()[0]
    forget(con, ["M05-A"], **QUIET)
    assert name() == (own, own)
    assert con.execute("SELECT COUNT(*) FROM name_hits WHERE doc_id='M05' AND resolved_by IS NULL").fetchone()[0] > 0
    assert con.execute("SELECT COUNT(*) FROM name_hits WHERE resolved_by IS NOT NULL AND resolved_by NOT IN "
                       "(SELECT doc_id FROM documents)").fetchone()[0] == 0


def _dump(con) -> dict[str, list[str]]:
    return {t: sorted(repr(tuple(r)) for r in con.execute(f'SELECT * FROM "{t}"')) for t in _tables(con, skip=())}


def test_a_failed_rebuild_removes_nothing(register, no_sources, monkeypatch):
    """Delete and families rebuild are one transaction: if the rebuild fails, the document is still
    there (and forget can be run again) - no half-forgotten state."""
    con = register
    before = _dump(con)
    def boom(_con):
        raise RuntimeError("families failed")
    with monkeypatch.context() as m:
        m.setattr("pipeline.families.run", boom)
        with pytest.raises(RuntimeError, match="families failed"):
            forget(con, ["M04"], **QUIET)
    assert _dump(con) == before        # every table, the audit log and the model calls included
    assert forget(con, ["M04"], **QUIET)["documents"]["M04"]["documents"] == 1


def test_unknown_id_is_refused_and_nothing_changes(register, no_sources):
    con = register
    before = con.total_changes
    with pytest.raises(ForgetRefused, match="not in the register: H99"):
        forget(con, ["M04", "H99"], **QUIET)      # one unknown id: none of them is removed
    assert con.total_changes == before
    assert con.execute("SELECT COUNT(*) FROM documents WHERE doc_id='M04'").fetchone()[0] == 1


def test_refused_while_the_file_would_be_read_again(register):
    """With the real source folders: M01's PDF is in data/raw, the next run would ingest it again."""
    con = register
    before = con.total_changes
    with pytest.raises(ForgetRefused, match="M01_Nordlicht.pdf"):
        forget(con, ["M01"], **QUIET)
    assert con.total_changes == before
    assert (config.DATA / "raw" / "merchant" / "M01_Nordlicht.pdf").exists()


def test_remove_file_deletes_the_inbox_file(register, no_sources):
    con = register
    dropped = no_sources / "V02_copy.txt"     # discovered as V02, like a file dropped into the inbox
    dropped.write_text("x", encoding="utf-8")
    with pytest.raises(ForgetRefused, match="--remove-file"):
        forget(con, ["V02"], **QUIET)
    assert dropped.exists()
    preview = forget(con, ["V02"], remove_file=True, dry_run=True, **QUIET)     # the dry run names the file
    assert preview["files_removed"] == [str(dropped)] and dropped.exists()
    result = forget(con, ["V02"], remove_file=True, **QUIET)
    assert not dropped.exists() and result["files_removed"] == [str(dropped)]
    assert con.execute("SELECT COUNT(*) FROM documents WHERE doc_id='V02'").fetchone()[0] == 0


def test_remove_file_never_deletes_from_a_source_folder(register, tmp_path, monkeypatch):
    """--remove-file only deletes inbox files. A file in a source folder (the library, here the
    gold set) is refused even with the flag - a temporary source folder stands in for data/raw."""
    con = register
    library, inbox = tmp_path / "library", tmp_path / "inbox"
    library.mkdir(), inbox.mkdir()
    kept = library / "V02_copy.txt"
    kept.write_text("x", encoding="utf-8")
    monkeypatch.setattr(config, "SOURCE_DIRS", [library])
    monkeypatch.setattr(config, "WATCH_DIR", inbox)
    before = con.total_changes
    for dry_run in (True, False):
        with pytest.raises(ForgetRefused, match="source folder"):
            forget(con, ["V02"], remove_file=True, dry_run=dry_run, **QUIET)
    assert kept.exists() and con.total_changes == before


class ForgottenWhileReading:
    """A model adapter that replays the stored answer for a document, but the document is forgotten
    while the 'model' reads it, and the call is recorded afterwards - like a reset during the live
    demo while the watcher waits for Azure."""

    def __init__(self, con, doc_id):
        self.con, self.calls = con, 0
        self.raw = json.loads(con.execute("SELECT raw_json FROM metadata WHERE doc_id=?", (doc_id,)).fetchone()[0])

    def chat_json(self, messages, schema, *, purpose, doc_id=None, schema_name=""):
        if purpose == "extract":
            forget(self.con, [doc_id], **QUIET)
        with transaction(self.con):
            self.con.execute("INSERT INTO llm_calls (ts, purpose, model, doc_id, cost_usd) VALUES (?,?,?,?,?)",
                             (now(), purpose, "replay", doc_id, 0.001))
        self.calls += 1
        if purpose == "extract":
            return self.raw["extraction"]
        return {"checks": list(self.raw["checks"].values())}


def test_a_late_model_answer_is_dropped(register, no_sources):
    """The result of a document forgotten during its model call is not stored (no orphan findings),
    and its late calls get the label of that forget - one forget, one label, no merge with a later
    document of the same id."""
    con = register
    chunks = _chunk_ids(con, "M04")
    own_calls = con.execute("SELECT COUNT(*) FROM llm_calls WHERE doc_id='M04'").fetchone()[0]
    adapter = ForgottenWhileReading(con, "M04")

    result = extract.run(con, adapter, ["M04"], **QUIET)

    assert result == {"extracted": [], "failed": []} and adapter.calls >= 1
    assert _references(con, "M04", chunks) == {}            # no metadata, clauses or bare calls of M04
    labels = con.execute("SELECT COUNT(DISTINCT doc_id), COUNT(*) FROM llm_calls WHERE doc_id LIKE 'forgotten:M04@%'")
    assert tuple(labels.fetchone()) == (1, own_calls + adapter.calls)
    assert con.execute("SELECT COUNT(*) FROM audit_log WHERE action='extraction_dropped' AND target='M04'").fetchone()[0] == 1
    # the last line of defence: the write itself refuses a document that is gone (one statement)
    with pytest.raises(extract.DocumentGone):
        extract._store(con, "M04", adapter.raw["extraction"], adapter.raw["checks"], [], extract.LAW_NOT_CHECKED,
                       "sha", False)
    assert _references(con, "M04", chunks) == {}


def test_the_watcher_survives_a_failed_pass(register, monkeypatch):
    from pipeline import run
    con, lines = register, []
    def broken(*_args, **_kwargs):
        raise TypeError("'NoneType' object is not subscriptable")
    monkeypatch.setattr(run, "run_once", broken)
    assert run.watch_pass(con, adapter=None, log=lines.append) is None
    assert lines == ["pass failed, still watching: TypeError: 'NoneType' object is not subscriptable"]
    assert con.execute("SELECT COUNT(*) FROM audit_log WHERE action='run_failed'").fetchone()[0] == 1


def test_ingest_skips_a_file_that_left_while_being_read(register, tmp_path, monkeypatch):
    """A reset removes the inbox file while the watcher reads it: nothing is registered, not even
    a FAILED row (which would make the next drop of the same file look unchanged)."""
    try:
        ingest.check_ocr_languages()
    except Exception as exc:
        pytest.skip(f"Tesseract not ready: {exc}")
    con = register
    gone, vanishing = tmp_path / "X01_gone.txt", tmp_path / "X02_vanishing.txt"
    vanishing.write_text("A contract text long enough to be a page of its own. " * 3, encoding="utf-8")
    read = ingest.read_pages
    def read_then_vanish(src):
        pages = read(src)
        src.files[0].unlink()
        return pages
    monkeypatch.setattr(ingest, "read_pages", read_then_vanish)
    sources = [ingest.SourceDoc("X01", [gone], "txt"), ingest.SourceDoc("X02", [vanishing], "txt")]
    assert ingest.ingest(con, sources) == []
    assert con.execute("SELECT COUNT(*) FROM documents WHERE doc_id IN ('X01', 'X02')").fetchone()[0] == 0


def test_demo_drop_and_reset_restore_the_register(register, tmp_path, monkeypatch):
    """The live demo end to end up to the model call: drop H01 into a temporary inbox, ingest
    (Tesseract) and chunk it, then reset - the register is exactly as before, the inbox empty."""
    from tools import demo
    if not demo.DEMO_FILE.exists():
        pytest.skip("data/demo/H01.jpg missing: python tools/make_handwritten.py")
    try:
        ingest.check_ocr_languages()
    except Exception as exc:
        pytest.skip(f"Tesseract not ready: {exc}")
    con = register
    monkeypatch.setattr(config, "WATCH_DIR", tmp_path / "inbox")
    before = _others(con, "H01", set())
    assert demo.drop(con) == 0 and (tmp_path / "inbox" / "H01.jpg").exists()
    new = ingest.ingest(con, ingest.discover([config.WATCH_DIR]))
    chunking.run(con, new)
    assert new == ["H01"]
    row = con.execute("SELECT status, ocr_mean_conf, source_path FROM documents WHERE doc_id='H01'").fetchone()
    assert row["status"] == "LOW_QUALITY" and row["ocr_mean_conf"] < config.OCR_LOW_QUALITY_CONFIDENCE
    assert row["source_path"] == str((tmp_path / "inbox" / "H01.jpg").resolve())   # outside the repo: absolute
    assert demo.drop(con) == 2                   # already in the register: the card would show nothing new
    # the pass that read H01 has not finished (no "run" entry yet): the reset waits for the watcher
    changes = con.total_changes
    assert demo.reset(con) == 2 and con.total_changes == changes and (tmp_path / "inbox" / "H01.jpg").exists()

    demo.reset(con, force=True)                  # the watcher was stopped (Ctrl+C)

    assert not (tmp_path / "inbox" / "H01.jpg").exists()
    assert _others(con, "H01", set()) == before
    assert _references(con, "H01", set()) == {}


def test_demo_status_and_reset_see_leftovers(register, tmp_path, monkeypatch, capsys):
    """Rows of H01 without a document row (an old watcher wrote them after a reset) make status say
    NO; the reset removes them and gives bare model calls a forgotten label."""
    from tools import demo
    con = register
    monkeypatch.setattr(config, "WATCH_DIR", tmp_path / "inbox")
    _code_reads_like_the_copy(con, monkeypatch)
    # the copied register may already hold calls of earlier rehearsals (they are kept, re-labelled)
    forgotten = "SELECT COUNT(*) FROM llm_calls WHERE doc_id LIKE 'forgotten:H01@%'"
    before = con.execute(forgotten).fetchone()[0]
    with transaction(con):
        con.execute("INSERT INTO clauses (doc_id, clause_type, status) VALUES ('H01', 'liability_limitation', 'ABSENT')")
        con.execute("INSERT INTO llm_calls (ts, purpose, model, doc_id, cost_usd) VALUES (?, 'extract', 'replay', 'H01', 0.001)",
                    (now(),))
    assert leftovers(con, "H01") == {"clauses": 1, "llm_calls (kept, re-labelled)": 1}
    assert demo.status(con) is False and "leftovers  H01 rows without a document" in capsys.readouterr().out
    demo.reset(con)
    assert leftovers(con, "H01") == {}
    assert con.execute(forgotten).fetchone()[0] == before + 1
    assert demo.status(con) is demo.DEMO_FILE.exists()


def _code_reads_like_the_copy(con, monkeypatch) -> None:
    """The code's prompt version = the copy's, so the watcher would read nothing again (decision 97
    keeps the real register on extract-v2 while the working tree may say extract-v3)."""
    versions = {r[0] for r in con.execute("SELECT DISTINCT prompt_version FROM metadata")}
    assert len(versions) == 1
    monkeypatch.setattr(config, "PROMPT_VERSION", versions.pop())


def test_demo_status_says_no_while_the_watcher_would_read_contracts_again(register, tmp_path, monkeypatch, capsys):
    """A register read with an older prompt version is not ready: the watcher's next pass would read
    those contracts again - minutes, money, and model answers that may change on stage (F7). H01 itself
    does not count: it is the contract the demo adds."""
    from tools import demo
    if not demo.DEMO_FILE.exists():
        pytest.skip("data/demo/H01.jpg missing: python tools/make_handwritten.py")
    con = register
    monkeypatch.setattr(config, "WATCH_DIR", tmp_path / "inbox")
    _code_reads_like_the_copy(con, monkeypatch)
    assert demo.status(con) is True and capsys.readouterr().out.endswith("ready for the live demo: yes\n")

    monkeypatch.setattr(config, "PROMPT_VERSION", "extract-v99")       # the code moved on, the register did not
    n = con.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    assert demo.status(con) is False
    assert capsys.readouterr().out.endswith(
        f"ready for the live demo: NO - {n} contracts were read with an older prompt version; the watcher would "
        "read them again (PROMPT_VERSION is extract-v99)\n")

    _code_reads_like_the_copy(con, monkeypatch)                           # one contract left behind
    con.execute("UPDATE metadata SET prompt_version='extract-v1' WHERE doc_id='M01'")
    assert demo.status(con) is False
    assert capsys.readouterr().out.endswith(
        "ready for the live demo: NO - 1 contract was read with an older prompt version; the watcher would "
        "read it again (PROMPT_VERSION is " + config.PROMPT_VERSION + ")\n")


def test_inbox_dir_overrides_the_watch_folder(tmp_path):
    """INBOX_DIR points the watcher elsewhere (read at import, like REGISTER_DB): a fresh process."""
    code = "from pipeline import config; print(config.WATCH_DIR)"
    env = {k: v for k, v in os.environ.items() if k != "INBOX_DIR"}
    run = lambda e: subprocess.run([sys.executable, "-c", code], env=e, capture_output=True, text=True,
                                   cwd=config.ROOT, check=True).stdout.strip()
    assert run({**env, "INBOX_DIR": str(tmp_path)}) == str(tmp_path)
    assert run(env) == str(config.DATA / "inbox")
