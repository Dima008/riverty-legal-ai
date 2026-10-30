"""Shared dependencies: one database connection per request, one model adapter per process."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from functools import lru_cache

from fastapi import Header, HTTPException

from pipeline.llm import ModelAdapter
from pipeline.store import connect

# Simulated sign-in (decision 54). In production the user comes from the Entra ID token and the
# role from an Entra group; the rest of the API stays the same.
USERS = {"reviewer_a": "Legal Reviewer A", "reviewer_b": "Legal Reviewer B"}


def current_user(x_user: str | None = Header(None, description="Simulated reviewer: reviewer_a or reviewer_b")) -> str:
    user = x_user or "reviewer_a"
    if user not in USERS:
        raise HTTPException(401, f"unknown user {user!r}; simulated users: {sorted(USERS)}")
    return user


def get_con() -> Iterator[sqlite3.Connection]:
    """A fresh connection per request, never shared between requests (engineering issue in
    docs/failure-cases.md). Within one request FastAPI may open, use and close it on different
    threads of its pool, which pipeline/store.connect allows (F13)."""
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
