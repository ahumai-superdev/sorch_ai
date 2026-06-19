"""Tests for api/routes/onboarding.py — Onboarding status endpoint.

Mocks api.db, api.db.models, and api.services.auth.depends to avoid
the full dependency tree (same pattern as test_tasks_routes.py).
"""

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── Stub out api.db and auth before importing api.routes.onboarding ──────────
_mock_db_client = MagicMock()
_mock_api_db = MagicMock()
_mock_api_db.db_client = _mock_db_client

_mock_user_model_cls = MagicMock()
_mock_models = MagicMock()
_mock_models.UserModel = _mock_user_model_cls

_mock_get_user_fn = MagicMock()
_mock_auth_depends = MagicMock()
_mock_auth_depends.get_user = _mock_get_user_fn

_mock_enums = MagicMock()

class _FakeKey:
    TELEPHONY_CONFIGURATION = MagicMock(value="TELEPHONY_CONFIGURATION")

_mock_enums.OrganizationConfigurationKey = _FakeKey

sys.modules["api.db"] = _mock_api_db
sys.modules["api.db.models"] = _mock_models
sys.modules["api.services"] = sys.modules.get("api.services", MagicMock())
sys.modules["api.services.auth"] = MagicMock()
sys.modules["api.services.auth.depends"] = _mock_auth_depends
sys.modules["api.enums"] = _mock_enums
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from api.routes.onboarding import router  # noqa: E402
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


def _mock_telephony_config():
    config = MagicMock()
    config.key = "TELEPHONY_CONFIGURATION"
    config.value = '{"provider": "vobiz"}'
    return config


@pytest.fixture
def app():
    a = _make_app()
    a.dependency_overrides[get_user] = _mock_user
    return a


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_status_all_complete(app):
    """All env vars set + telephony in DB → all true."""
    with patch("api.routes.onboarding.db_client") as mock_db, \
         patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test", "SARVAM_API_KEY": "sarvam-test"}):
        mock_db.get_configuration = AsyncMock(return_value=_mock_telephony_config())
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/onboarding/status")

    assert response.status_code == 200
    data = response.json()
    assert data["ai_services"] is True
    assert data["telephony"] is True
    assert data["is_complete"] is True


async def test_status_missing_ai_keys(app):
    """Missing env vars → ai_services false, is_complete false."""
    env_without_keys = {}
    # Remove keys if present
    with patch("api.routes.onboarding.db_client") as mock_db, \
         patch.dict("os.environ", {}, clear=True):
        mock_db.get_configuration = AsyncMock(return_value=_mock_telephony_config())
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/onboarding/status")

    assert response.status_code == 200
    data = response.json()
    assert data["ai_services"] is False
    assert data["telephony"] is True
    assert data["is_complete"] is False


async def test_status_missing_telephony(app):
    """No telephony config in DB → telephony false, is_complete false."""
    with patch("api.routes.onboarding.db_client") as mock_db, \
         patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test", "SARVAM_API_KEY": "sarvam-test"}):
        mock_db.get_configuration = AsyncMock(return_value=None)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/onboarding/status")

    assert response.status_code == 200
    data = response.json()
    assert data["ai_services"] is True
    assert data["telephony"] is False
    assert data["is_complete"] is False
