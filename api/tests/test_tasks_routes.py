"""Tests for api/routes/tasks.py — Tasks API endpoints.

The venv is a minimal test environment; api.db has a complex import chain
(pgvector, dateutil, etc.) that isn't fully installed. We mock the modules
we need so the router can be imported without the full dependency tree.
"""

import sys
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── Stub out api.db and auth before importing api.routes.tasks ───────────────
_mock_db_client = MagicMock()
_mock_api_db = MagicMock()
_mock_api_db.db_client = _mock_db_client

_mock_user_model_cls = MagicMock()
_mock_models = MagicMock()
_mock_models.UserModel = _mock_user_model_cls

_mock_get_user_fn = MagicMock()
_mock_auth_depends = MagicMock()
_mock_auth_depends.get_user = _mock_get_user_fn

sys.modules["api.db"] = _mock_api_db
sys.modules["api.db.models"] = _mock_models
sys.modules["api.services"] = sys.modules.get("api.services", MagicMock())
sys.modules["api.services.auth"] = MagicMock()
sys.modules["api.services.auth.depends"] = _mock_auth_depends
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from api.routes.tasks import router  # noqa: E402
from api.services.auth.depends import get_user  # noqa: E402


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


def _mock_user():
    user = MagicMock()
    user.id = 1
    user.selected_organization_id = 1
    return user


def _mock_campaign(id: int = 1, name: str = "Test Task"):
    c = MagicMock()
    c.id = id
    c.name = name
    c.state = "draft"
    c.total_rows = 10
    c.processed_rows = 5
    c.created_at = datetime(2024, 1, 1)
    return c


@pytest.fixture
def app():
    a = _make_app()
    a.dependency_overrides[get_user] = _mock_user
    return a


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_list_tasks_returns_200(app):
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.get_campaigns = AsyncMock(return_value=[_mock_campaign()])
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/tasks")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == 1
    assert data[0]["name"] == "Test Task"


async def test_list_tasks_returns_empty_on_error(app):
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.get_campaigns = AsyncMock(side_effect=Exception("DB error"))
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/tasks")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_task_returns_200(app):
    campaign = _mock_campaign()
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.create_campaign = AsyncMock(return_value=campaign)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/tasks", json={"name": "Test Task"})

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Test Task"
    assert data["status"] == "created"


async def test_get_task_returns_404_when_not_found(app):
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.get_campaign = AsyncMock(return_value=None)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/tasks/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


async def test_get_task_returns_200_when_found(app):
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.get_campaign = AsyncMock(return_value=_mock_campaign())
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/tasks/1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["template"] == "maritime_screener"


async def test_toggle_task_returns_200_with_is_active(app):
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.get_campaign = AsyncMock(return_value=_mock_campaign())
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.patch("/api/v1/tasks/1/toggle")

    assert response.status_code == 200
    data = response.json()
    assert "is_active" in data
    assert data["id"] == 1


async def test_toggle_task_returns_404_when_not_found(app):
    with patch("api.routes.tasks.db_client") as mock_db:
        mock_db.get_campaign = AsyncMock(return_value=None)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.patch("/api/v1/tasks/999/toggle")

    assert response.status_code == 404


async def test_start_task_returns_200_with_status(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/tasks/1/start")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert data["id"] == 1


async def test_stop_task_returns_200_with_status(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/tasks/1/stop")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "paused"
    assert data["id"] == 1


async def test_get_candidates_returns_200_empty_list(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/tasks/1/candidates")

    assert response.status_code == 200
    assert response.json() == []
