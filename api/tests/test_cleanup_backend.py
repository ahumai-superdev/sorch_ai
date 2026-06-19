"""Tests verifying that dead backend code has been removed (US-001)."""
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = REPO_ROOT / "api"
MAIN_PY = API_ROOT / "routes" / "main.py"


def test_looptalk_route_deleted():
    assert not (API_ROOT / "routes" / "looptalk.py").exists()


def test_public_embed_route_deleted():
    assert not (API_ROOT / "routes" / "public_embed.py").exists()


def test_workflow_embed_route_deleted():
    assert not (API_ROOT / "routes" / "workflow_embed.py").exists()


def test_superuser_route_deleted():
    assert not (API_ROOT / "routes" / "superuser.py").exists()


def test_looptalk_service_dir_deleted():
    assert not (API_ROOT / "services" / "looptalk").exists()


def test_looptalk_db_client_deleted():
    assert not (API_ROOT / "db" / "looptalk_client.py").exists()


def test_gender_service_dir_deleted():
    assert not (API_ROOT / "services" / "gender").exists()


def test_evals_dir_deleted():
    assert not (REPO_ROOT / "evals").exists()


def _main_py_content() -> str:
    return MAIN_PY.read_text()


def test_main_py_no_looptalk_import():
    assert "looptalk" not in _main_py_content()


def test_main_py_no_public_embed_import():
    assert "public_embed" not in _main_py_content()


def test_main_py_no_workflow_embed_import():
    assert "workflow_embed" not in _main_py_content()


def test_main_py_no_superuser_import():
    assert "superuser" not in _main_py_content()
