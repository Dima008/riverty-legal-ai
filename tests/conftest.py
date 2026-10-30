"""Tests never touch the real workflow database: every test gets its own temporary one."""

import pytest


@pytest.fixture(autouse=True)
def temporary_workbench_db(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKBENCH_DB", str(tmp_path / "workbench.sqlite"))
