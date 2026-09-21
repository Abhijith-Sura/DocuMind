import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify that root endpoint returns service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["health"] == "/health"


def test_health_check_endpoint():
    """Verify system health endpoint returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "DocuMind" in data["app"]


def test_docs_available():
    """Verify Swagger OpenAPI docs are accessible."""
    response = client.get("/docs")
    assert response.status_code == 200
