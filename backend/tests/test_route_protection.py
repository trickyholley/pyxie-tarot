import pytest
from fastapi import APIRouter, Depends

from app.api.v1.admin import admin_router
from app.api.v1.router import api_v1_router
from app.core.security import require_admin
from app.main import verify_route_protection


def test_real_api_v1_router_passes():
    """Regression test for the check that runs at app startup."""
    count = verify_route_protection(api_v1_router, prefix="/api/v1")
    assert count > 0


def test_admin_route_without_guard_raises():
    router = APIRouter()
    bare_admin = APIRouter(prefix="/admin/leak")

    @bare_admin.get("/")
    def leak():
        return {}

    router.include_router(bare_admin)

    with pytest.raises(RuntimeError, match="lacks require_admin"):
        verify_route_protection(router, prefix="/api/v1")


def test_guard_outside_admin_prefix_raises():
    router = APIRouter()
    misplaced = APIRouter(prefix="/users", dependencies=[Depends(require_admin)])

    @misplaced.get("/")
    def profile():
        return {}

    router.include_router(misplaced)

    with pytest.raises(RuntimeError, match="is not under"):
        verify_route_protection(router, prefix="/api/v1")


def test_admin_router_factory_produces_valid_router():
    router = APIRouter()
    users = admin_router("/users")

    @users.get("/")
    def list_users():
        return []

    router.include_router(users)

    count = verify_route_protection(router, prefix="/api/v1")
    assert count == 1
