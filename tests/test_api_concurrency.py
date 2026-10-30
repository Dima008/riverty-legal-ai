"""F13: requests to the workflow database at the same moment must all succeed.

FastAPI runs the setup of a sync `yield` dependency, the endpoint and the teardown as separate
thread-pool calls, which can land on different threads. Sequential tests never see what goes
wrong then, so this test fires the requests concurrently - like two reviewers in the four-eyes
demo, or a refresh while another request is still running."""

from __future__ import annotations

import asyncio

import httpx
import pytest

from api.main import app
from pipeline import config

pytestmark = pytest.mark.skipif(not config.DB_PATH.exists(), reason="register not built: python -m pipeline.run")


async def _burst(path: str, n: int = 10) -> list:
    """n concurrent GETs; an exception inside the app (also after the response) counts as a failure."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        results = await asyncio.gather(*(client.get(path) for _ in range(n)), return_exceptions=True)
    return [r.status_code if isinstance(r, httpx.Response) else type(r).__name__ for r in results]


@pytest.mark.parametrize("path", ["/runs", "/audit"])
def test_concurrent_requests_to_the_workflow_database_all_succeed(path):
    for _ in range(3):
        assert asyncio.run(_burst(path)) == [200] * 10
