# SPDX-License-Identifier: AGPL-3.0-or-later
from fastapi import APIRouter, Depends

from app.core.security import require_admin


def admin_router(prefix: str, **kwargs) -> APIRouter:
    """The only sanctioned way to create an admin router - wires `require_admin` so every route on it satisfies
    `verify_route_protection()`'s startup check (see `main.py`). Never build an admin router with a bare
    `APIRouter()`.
    """
    deps = kwargs.pop("dependencies", [])
    return APIRouter(
        prefix=f"/admin{prefix}",
        dependencies=[Depends(require_admin), *deps],
        **kwargs,
    )
