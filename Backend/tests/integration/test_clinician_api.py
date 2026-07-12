import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_clinician_queue(async_client: AsyncClient):
    resp = await async_client.get("/clinician/queue")
    assert resp.status_code == 200
    queue = resp.json()
    assert isinstance(queue, list)

@pytest.mark.asyncio
async def test_clinician_session_not_found(async_client: AsyncClient):
    # UUID doesn't exist
    resp = await async_client.get("/clinician/session/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
