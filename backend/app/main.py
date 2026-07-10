from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router

ADMIN_PREFIX = "/api/v1/admin"
GUARD_NAME = "require_admin"


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    """If route is a _IncludedRouter, return (original_router, prefix, dependencies).
    Otherwise return None."""
    # _IncludedRouter exposes .original_router and .include_context
    original_router = getattr(route, "original_router", None)
    if original_router is None:
        return None

    include_context = getattr(route, "include_context", {})
    # include_context is a dict with keys like 'prefix', 'dependencies', etc.
    prefix = include_context.get("prefix", "") if isinstance(include_context, dict) else ""
    dependencies = include_context.get("dependencies", []) if isinstance(include_context, dict) else []

    return original_router, prefix, dependencies


def verify_route_protection(router, prefix: str = "", extra_deps=None, _count=None) -> int:
    """
    Enforce invariant: a route has require_admin if and only if
    its path starts with /api/v1/admin.

    Returns the number of APIRoute leaves inspected.
    Raises RuntimeError if no APIRoute objects were found at all
    (indicates a structural FastAPI change that would silently
    bypass the guard).
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
        # --- Handle _IncludedRouter (FastAPI 0.137+) ---
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

        # --- Handle nested APIRouter (pre-0.137 style) ---
        if hasattr(route, "routes") and not isinstance(route, APIRoute):
            verify_route_protection(route, prefix=full_prefix, _count=_count)
            continue

        # --- Handle actual APIRoute ---
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

    # Only the top-level call checks the count
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
        "http://localhost:5173",  # Move to .env later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to Pyxie Tarot API"}


app.include_router(api_v1_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
