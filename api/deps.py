"""Shared dependencies: one database connection per request, one model adapter per process."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from functools import lru_cache

from pipeline.llm import ModelAdapter
from pipeline.store import connect


def get_con() -> Iterator[sqlite3.Connection]:
    """A fresh connection per request. SQLite connections must not be shared between threads
    (engineering issue in docs/failure-cases.md), and FastAPI runs requests in a thread pool."""
    con = connect()
    try:
        yield con
    finally:
        con.close()


@lru_cache
def get_adapter() -> ModelAdapter:
    """The model adapter (Azure OpenAI). Created on first use, so read-only endpoints work
    without credentials; every call it makes is recorded in llm_calls with its cost."""
    return ModelAdapter()
