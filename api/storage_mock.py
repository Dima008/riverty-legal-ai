"""Mock of the contract storage API (stand-in for Riverty's storage service in the prototype).

The task allows this API for one purpose only: "to store an additional copy of a contract in a
legally compliant manner". So the mock offers exactly one operation, PUT - nothing to read,
list or delete (decision 2). Idempotent by content hash: the same file is stored once, a
repeated PUT returns the existing receipt. Write once (WORM) is simulated: no overwrite.

Mounted under /storage-mock in the prototype; the workbench talks to it over HTTP through
api/storage_client.py, exactly as it would talk to the real service.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request, Response

from pipeline import config
from pipeline.store import now

app = FastAPI(title="Contract storage (mock)", description="Write-only: PUT a contract copy, nothing else.")


def storage_dir() -> Path:
    """STORAGE_MOCK_DIR overrides the location (tests use a temporary folder)."""
    return Path(os.environ.get("STORAGE_MOCK_DIR", config.VAR / "storage_mock"))


@app.put("/contracts/{sha256}", status_code=201)
async def put_contract(sha256: str, request: Request, response: Response,
                       x_doc_id: str = Header(...), x_run_id: str = Header(...),
                       x_approved_by: str = Header(...)) -> dict:
    if not re.fullmatch(r"[0-9a-f]{64}", sha256):
        raise HTTPException(422, "path must be the SHA-256 of the content")
    body = await request.body()
    if hashlib.sha256(body).hexdigest() != sha256:
        raise HTTPException(422, "content does not match its hash - nothing stored")
    folder = storage_dir()
    folder.mkdir(parents=True, exist_ok=True)
    receipt = {"receipt_id": f"rcpt-{sha256[:12]}", "sha256": sha256, "size": len(body), "doc_id": x_doc_id,
               "run_id": x_run_id, "approved_by": x_approved_by.split(","), "stored_at": now(),
               "retention": "write once (simulated WORM)"}
    try:   # exclusive create: two parallel requests cannot both store the same file
        with open(folder / f"{sha256}.json", "x", encoding="utf-8") as f:
            json.dump(receipt, f)
    except FileExistsError:
        response.status_code = 200
        return {**json.loads((folder / f"{sha256}.json").read_text(encoding="utf-8")), "status": "already_stored"}
    (folder / f"{sha256}.bin").write_bytes(body)
    return {**receipt, "status": "stored"}
