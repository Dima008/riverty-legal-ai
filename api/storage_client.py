"""Client for the contract storage API, behind an adapter.

Prototype: the mock under /storage-mock on the same server. Production: Riverty's storage
service at STORAGE_API_URL, called with a managed identity token instead of no auth. The
workbench code does not change.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import httpx


class StorageClient:
    def __init__(self, http: httpx.Client):
        self.http = http

    def put_copy(self, content: bytes, sha256: str, doc_id: str, run_id: str, approved_by: list[str]) -> tuple[int, dict]:
        """Store one file. Returns (HTTP status, receipt): 201 stored, 200 already stored."""
        r = self.http.put(f"/contracts/{sha256}", content=content,
                          headers={"Content-Type": "application/octet-stream", "X-Doc-Id": doc_id,
                                   "X-Run-Id": run_id, "X-Approved-By": ",".join(approved_by)})
        r.raise_for_status()
        return r.status_code, r.json()


def get_storage() -> Iterator[StorageClient]:
    base_url = os.environ.get("STORAGE_API_URL", "http://127.0.0.1:8010/storage-mock")
    with httpx.Client(base_url=base_url, timeout=30) as http:
        yield StorageClient(http)
