from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_route_protection(app)
    yield


def verify_route_protection(app: FastAPI) -> None:
    """
    Enforce invariant: a route has require_admin if and only if
    its path starts with /api/v1/admin.

    Rule 1: /api/v1/admin/* → must have require_admin
    Rule 2: require_admin → must be under /api/v1/admin
    """
    admin_prefix = "/api/v1/admin"
    guard_name = "require_admin"

    for route in app.routes:
        if not hasattr(route, "path"):
            continue

        path = route.path
        is_admin_path = path.startswith(admin_prefix)

        # Collect dependency names from router/route-level dependencies
        dep_names = set()
        for dep in getattr(route, "dependencies", []):
            dependency = getattr(dep, "dependency", dep)
            dep_names.add(getattr(dependency, "__name__", str(dependency)))

        has_admin_guard = guard_name in dep_names

        # Rule 1: /admin path → must have require_admin
        if is_admin_path and not has_admin_guard:
            raise RuntimeError(
                f"SECURITY: Route {path} is under {admin_prefix} "
                f"but lacks {guard_name} dependency. "
                f"Use admin_router() to create admin routers."
            )

        # Rule 2: require_admin → must be under /admin
        if has_admin_guard and not is_admin_path:
            raise RuntimeError(
                f"SECURITY: Route {path} has {guard_name} dependency "
                f"but is not under {admin_prefix}. "
                f"Move it to an admin router or remove the guard."
            )


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
