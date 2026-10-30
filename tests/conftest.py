"""Tests never touch the real workflow database or the real storage folder: every test gets
temporary ones."""

import pytest


@pytest.fixture(autouse=True)
def temporary_state(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKBENCH_DB", str(tmp_path / "workbench.sqlite"))
    monkeypatch.setenv("STORAGE_MOCK_DIR", str(tmp_path / "storage_mock"))
