"""Legal Workbench API.

    uvicorn api.main:app --reload --port 8010     # then open http://127.0.0.1:8010/docs

Port 8010, not the default 8000: on the demo laptop another local app already uses 8000.

register.py: read-only register and pipeline-explorer endpoints (step 1).
workflow.py: runs over the whole portfolio with coverage and triage (step 2); review,
approval and archive copy follow in step 3.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pipeline import config

from . import register, workflow

app = FastAPI(
    title="Legal Workbench API",
    version="0.1.0",
    description="Contract register for Riverty Legal: findings with verified evidence, "
                "observations not legal judgments. Synthetic and public test data only.",
)
# the React dev server (Vite) runs on port 5173
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(register.router)
app.include_router(workflow.router)


@app.get("/health")
def health() -> dict:
    """Names the service, so a smoke test cannot mistake another app on the same port for this one."""
    return {"service": "legal-workbench-api", "status": "ok", "register": config.DB_PATH.exists(),
            "prompt_version": config.PROMPT_VERSION}
