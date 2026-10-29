"""Model adapter.

All model access goes through this class. It records tokens and cost of every
call in the register (llm_calls), so the UI can show real costs per run.
Swapping Azure OpenAI for another provider only touches this file.
"""

from __future__ import annotations

import json
import threading
import time
from typing import Any

from openai import AzureOpenAI, APIError, RateLimitError

from . import config
from .store import connect, now, transaction


class ModelAdapter:
    """Thread-safe: each worker thread records its calls through its own register connection."""

    def __init__(self, record: bool = True):
        if not (config.AZURE_OPENAI_ENDPOINT and config.AZURE_OPENAI_API_KEY):
            raise RuntimeError("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set in .env")
        self.client = AzureOpenAI(
            azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
            api_key=config.AZURE_OPENAI_API_KEY,
            api_version=config.AZURE_OPENAI_API_VERSION,
            max_retries=0,
        )
        self.record = record
        self._local = threading.local()

    def _db(self):
        if not hasattr(self._local, "con"):
            self._local.con = connect()
        return self._local.con

    # ------------------------------------------------------------------ cost tracking
    def _record(self, purpose: str, model: str, doc_id: str | None, usage: Any, latency_ms: int) -> float:
        prompt = getattr(usage, "prompt_tokens", 0) or 0
        completion = getattr(usage, "completion_tokens", 0) or 0
        details = getattr(usage, "prompt_tokens_details", None)
        cached = (getattr(details, "cached_tokens", 0) or 0) if details else 0
        price = config.PRICES_PER_MILLION.get(model, {"input": 0, "cached_input": 0, "output": 0})
        cost = ((prompt - cached) * price["input"] + cached * price["cached_input"]
                + completion * price["output"]) / 1_000_000
        if self.record:
            con = self._db()
            with transaction(con):
                con.execute(
                    "INSERT INTO llm_calls (ts, purpose, model, doc_id, prompt_tokens, completion_tokens,"
                    " cached_tokens, cost_usd, latency_ms) VALUES (?,?,?,?,?,?,?,?,?)",
                    (now(), purpose, model, doc_id, prompt, completion, cached, cost, latency_ms),
                )
        return cost

    @staticmethod
    def _retry(fn, attempts: int = 8):
        """Retry on rate limits (honouring Retry-After) and transient server errors."""
        delay = 2.0
        for i in range(attempts):
            try:
                return fn()
            except RateLimitError as exc:
                if i == attempts - 1:
                    raise
                retry_after = exc.response.headers.get("retry-after") if exc.response is not None else None
                time.sleep(float(retry_after) + 1 if retry_after else delay)
                delay = min(delay * 2, 60)
            except APIError as exc:
                if i == attempts - 1 or (getattr(exc, "status_code", None) or 500) < 500:
                    raise
                time.sleep(delay)
                delay = min(delay * 2, 60)

    # ------------------------------------------------------------------ calls
    def chat_json(self, messages: list[dict], schema: dict, *, purpose: str, doc_id: str | None = None,
                  schema_name: str = "result") -> dict:
        """Chat completion with a strict JSON schema (structured output)."""
        t0 = time.time()
        resp = self._retry(lambda: self.client.chat.completions.create(
            model=config.CHAT_DEPLOYMENT,
            messages=messages,
            temperature=0,
            response_format={"type": "json_schema",
                             "json_schema": {"name": schema_name, "schema": schema, "strict": True}},
        ))
        self._record(purpose, config.CHAT_DEPLOYMENT, doc_id, resp.usage, int((time.time() - t0) * 1000))
        return json.loads(resp.choices[0].message.content)

    def embed(self, texts: list[str], *, purpose: str = "embed") -> list[list[float]]:
        t0 = time.time()
        resp = self._retry(lambda: self.client.embeddings.create(model=config.EMBED_DEPLOYMENT, input=texts))
        self._record(purpose, config.EMBED_DEPLOYMENT, None, resp.usage, int((time.time() - t0) * 1000))
        return [d.embedding for d in resp.data]
