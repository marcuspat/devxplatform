"""
Tests for health check endpoints
"""
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


def test_health_check(client: TestClient):
    """Test basic health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "fastapi-service",
        "version": "1.0.0"
    }


def test_ready_check(client: TestClient):
    """Test readiness check endpoint"""
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["service"] == "fastapi-service"


@pytest.mark.asyncio
async def test_health_check_async(async_client: AsyncClient):
    """Test health check with async client"""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "fastapi-service",
        "version": "1.0.0"
    }


@pytest.mark.asyncio
async def test_detailed_health_check(async_client: AsyncClient):
    """Test detailed health check endpoint"""
    response = await async_client.get("/api/v1/health/detailed")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert data["checks"]["api"] == "healthy"