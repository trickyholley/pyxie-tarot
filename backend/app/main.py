# SPDX-License-Identifier: AGPL-3.0-or-later
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Response, status
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.database import get_db_session

logger = logging.getLogger("app.health")

ADMIN_PREFIX = "/api/v1/admin"
GUARD_NAME = "require_admin"
STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    verify_route_protection(api_v1_router, prefix="/api/v1")
    yield


def _collect_dep_names(route: APIRoute) -> set[str]:
    dep_names = set()

    for dep in getattr(route, "dependencies", []):
        dependency = getattr(dep, "dependency", dep)
        dep_names.add(getattr(dependency, "__name__", str(dependency)))

    dependant = getattr(route, "dependant", None)
    if dependant is not None:
        for sub_dep in getattr(dependant, "dependencies", []):
            call = getattr(sub_dep, "call", None)
            if call is not None:
                dep_names.add(getattr(call, "__name__", str(call)))

    return dep_names


def _get_included_info(route):
    original_router = getattr(route, "original_router", None)
    if original_router is None:
        return None

    ctx = getattr(route, "include_context", None)
    if ctx is None:
        return original_router, "", []

    prefix = getattr(ctx, "prefix", "") or ""
    dependencies = getattr(ctx, "dependencies", []) or []

    return original_router, prefix, dependencies


def verify_route_protection(router, prefix: str = "", extra_deps=None, _count=None) -> int:
    """Recursively asserts every route under `ADMIN_PREFIX` (and no route outside it) depends on `require_admin`.

    Run once at startup (see `lifespan`); raises `RuntimeError` on any violation, including inspecting 0 routes -
    the hard invariant CLAUDE.md documents. Returns the number of routes inspected, for that last check.
    """
    if extra_deps is None:
        extra_deps = []
    if _count is None:
        _count = [0]

    full_prefix = prefix + (router.prefix or "")

    router_dep_names = set()
    for dep in getattr(router, "dependencies", []):
        dependency = getattr(dep, "dependency", dep)
        router_dep_names.add(getattr(dependency, "__name__", str(dependency)))
    for dep in extra_deps:
        dependency = getattr(dep, "dependency", dep)
        router_dep_names.add(getattr(dependency, "__name__", str(dependency)))

    for route in router.routes:
        included = _get_included_info(route)
        if included is not None:
            original_router, inc_prefix, inc_deps = included
            verify_route_protection(
                original_router,
                prefix=full_prefix,
                extra_deps=inc_deps,
                _count=_count,
            )
            continue

        if not isinstance(route, APIRoute):
            continue

        _count[0] += 1

        path = full_prefix + route.path
        is_admin_path = path.startswith(ADMIN_PREFIX)
        dep_names = _collect_dep_names(route) | router_dep_names
        has_admin_guard = GUARD_NAME in dep_names

        if is_admin_path and not has_admin_guard:
            raise RuntimeError(
                f"SECURITY: Route {path} is under {ADMIN_PREFIX} "
                f"but lacks {GUARD_NAME} dependency. "
                f"Use admin_router() to create admin routers."
            )

        if has_admin_guard and not is_admin_path:
            raise RuntimeError(
                f"SECURITY: Route {path} has {GUARD_NAME} dependency "
                f"but is not under {ADMIN_PREFIX}. "
                f"Move it to an admin router or remove the guard."
            )

    if prefix == "/api/v1" and _count[0] == 0:
        raise RuntimeError(
            "SECURITY: verify_route_protection inspected 0 APIRoute objects. "
            "This likely means FastAPI's internal router structure has changed "
            "and routes are being silently skipped. The guard is NOT working — "
            "do not deploy until this is fixed."
        )

    return _count[0]


app = FastAPI(
    title="Pyxie Tarot API",
    description="A tarot reading API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,  # type: ignore
    allow_origins=[
        "http://localhost:5173",  # apps/app. Move to .env later
        "http://localhost:5174",  # apps/admin
        "https://pyxietarot.live",  # apps/app, prod - also what the Capacitor Android shell loads
        "https://admin.pyxietarot.live",  # apps/admin, prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to Pyxie Tarot API"}


@app.get("/health")
async def health(response: Response, db: AsyncSession = Depends(get_db_session)):
    """Liveness + DB-connectivity check, for the deploy smoke test and the scheduled synthetic check
    (issue #181) - unlike `/`, an actually-broken DB makes this fail instead of returning a false 200.
    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check failed: database unreachable")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "database": "unreachable"}

    return {"status": "ok", "database": "ok"}


app.include_router(api_v1_router, prefix="/api/v1")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
