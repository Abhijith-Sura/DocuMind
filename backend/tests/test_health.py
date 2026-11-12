import pytest
import httpx
from app.main import app


@pytest.mark.anyio
async def test_root_endpoint():
    """Verify that root endpoint returns service info."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["health"] == "/health"


@pytest.mark.anyio
async def test_health_check_endpoint():
    """Verify system health endpoint returns healthy status."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "DocuMind" in data["app"]


@pytest.mark.anyio
async def test_docs_available():
    """Verify Swagger OpenAPI docs are accessible."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/docs")
        assert response.status_code == 200
