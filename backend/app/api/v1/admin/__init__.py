from fastapi import APIRouter, Depends

from app.core.security import require_admin


def admin_router(prefix: str, **kwargs) -> APIRouter:
    deps = kwargs.pop("dependencies", [])
    return APIRouter(
        prefix=f"/admin{prefix}",
        dependencies=[Depends(require_admin), *deps],
        **kwargs,
    )
