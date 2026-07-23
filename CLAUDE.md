# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Pyxie Tarot — a tarot-reading diary app. Currently under construction: only auth (signup/login) and an admin user-management panel are implemented; tarot-reading features don't exist yet. Single-developer, WIP-friendly repo.

Monorepo with two independent parts:
- `backend/` — Python/FastAPI service (uv-managed)
- `frontend/` — pnpm workspace: two apps (`apps/app` on :5173, `apps/admin` on :5174) sharing packages `@pyxie/api-client`, `@pyxie/providers`, `@pyxie/ui`

## Commands

Root `Makefile` orchestrates both halves (`dev`, `install`, `db-restore`, `db-seed`, etc.) — see the `Makefile` and `backend/Makefile` for exact targets, and each `package.json` for frontend scripts. There is no root-level build/test command — go into `backend/` or `frontend/` directly, or use `make dev`/`make install`.

## Code style

- **Backend**: Ruff only (no black), configured entirely in `backend/pyproject.toml`. 120-char lines, double quotes, py312 target. Enabled rule sets include `ASYNC`/`PERF`/`SIM`/`UP`/`N` — pay attention to async-correctness and modernization lints, not just style.
- **Frontend**: Oxc toolchain — `oxlint` + `oxfmt`, **not ESLint/Prettier**. 120-char width, 2-space tabs, double quotes (`frontend/.oxfmtrc.json`, `frontend/.oxlintrc.json`).
- Both are enforced via `.pre-commit-config.yaml` (ruff --fix + ruff-format scoped to `backend/`, oxlint + oxfmt scoped to `frontend/(apps|packages)/`).

## File size

Prefer keeping code files to roughly 200–250 lines. Data/config files (migrations, seed data, generated files) are exempt. If a file grows past that, look for reasonable extraction points (shared UI chunks, subcomponents, helper modules) rather than letting it grow unbounded — but don't force a split that doesn't have a natural seam.

## Frontend component style

Build UI out of shadcn base components (`@pyxie/ui`'s `base-ui/*` wrappers around `@base-ui/react`) rather than raw HTML elements or new bespoke components. Keep styling minimal/functional — bare layout, no visual polish (spacing, colors, animation) — unless the user specifically asks for a particular look.

## Avoid over-defensive code

Write straightforward code and tests that cover each major path clearly. Don't add handling, validation, or try/except blocks for edge cases that can't actually occur given the surrounding code's contracts — only handle a case if it's a real, reachable scenario. This applies especially to tests: a handful of focused tests covering the main behaviors and the realistic failure modes is better than exhaustively enumerating every conceivable edge case.

This does not apply to deliberate security-boundary checks, like `verify_route_protection()` below — those are intentionally paranoid on purpose, and their edge cases (missing guard, misplaced guard, zero routes found) are real, reachable scenarios worth testing, not defensive bloat.

## Testing

- **Backend**: pytest, run via `cd backend && uv run pytest`. Tests live in `backend/tests/`; `conftest.py` sets `SECRET_KEY`/`DATABASE_URL` env vars so tests don't depend on a local `.env` or a live Postgres instance — keep DB-independent logic (security, route-protection invariants) testable without a DB connection where possible. When adding non-trivial backend logic, add tests alongside it.
- **Frontend**: Vitest + React Testing Library, run via `cd frontend && pnpm test` (or `pnpm test:watch`). Config is at `frontend/vitest.config.ts` (jsdom environment, `resolve.tsconfigPaths: true`) with shared setup in `frontend/vitest.setup.ts`. Test files live next to the code as `*.test.tsx`/`*.test.ts` under `apps/*/src` or `packages/*/src`.
- **There is no CI.** Nothing runs tests, `tsc`, or the build automatically — the only automated check is pre-commit hooks at commit time (formatting/lint, not tests). Run the relevant test suite, `pnpm build`, and lint locally before considering backend/frontend work done.
- **Verification depth for frontend UI work**: `tsc` passing is sufficient to consider a change done — don't manually launch a browser to visually verify UI changes (navigation, styling, click-throughs) unless explicitly asked. Also don't manually run/check lint (`oxlint`/`oxfmt`) — pre-commit handles it at commit time.

## Frontend path aliases

Each shared package (`packages/ui`, `packages/api-client`) uses its own namespaced self-import alias, not the generic shadcn-default `@/*`: `@ui/*` inside `packages/ui`, `@api-client/*` inside `packages/api-client` (see each package's `tsconfig.json`). Apps (`apps/app`, `apps/admin`) keep `@/*` for their own `src`, plus explicit `@ui/*`/`@api-client/*` entries pointing at the sibling packages.

Reason: plain `tsc` type-checks a consuming app as one flat program using *that app's* `paths` for everything it pulls in, including raw source from other workspace packages — so if two packages both used generic `@/*`, `tsc` would resolve it against the app's mapping and silently point at the wrong directory (Vite doesn't have this problem, which is why builds worked while `tsc` didn't). If you scaffold a new shared package, give it its own namespaced alias and wire it into both apps' `tsconfig.json`, following the existing two as a template. `packages/ui/components.json` (shadcn CLI config) already emits `@ui/*` imports.

## Auth & admin architecture — read before touching routes

- JWT auth (`python-jose`, HS256) with Argon2 password hashing, implemented in `backend/app/core/security.py`.
- A single `/auth/login` endpoint (`backend/app/api/v1/auth.py`) serves both frontend apps, distinguished by a `client: "app" | "admin"` field in the request body (`backend/app/schemas/auth.py`). `client == "admin"` additionally requires `role == ADMIN` or returns 403.
- **Hard invariant, enforced at startup**: every route under `/api/v1/admin` must depend on `require_admin`, and no route outside that prefix may. This is checked by `verify_route_protection()` in `backend/app/main.py`'s lifespan hook — if violated, the app raises `RuntimeError` and refuses to start. Always add new admin endpoints through the `admin_router()` factory in `backend/app/api/v1/admin/__init__.py`, never a bare `APIRouter()`.
- Frontend stores the JWT in `localStorage` (`frontend/packages/api-client/src/utils.ts`) with a Bearer header — no refresh-token flow; a failed `getMe()` just clears the token.

## Local dev servers

Before starting `make dev`, `uvicorn`, or `vite` yourself to test something, check whether the user already has
dev servers running (`ps aux | grep -E "uvicorn|vite"`, or just ask) — don't spin up duplicates that fight over
the same ports.

## Environment

- `backend/.env` (gitignored, copy from `backend/.env.example`): `DATABASE_URL`, `SECRET_KEY` (required, no default — app won't start without it).
- No Docker setup — Postgres must be running locally.

## Known WIP rough edges — fine to fix opportunistically

These are known, not intentional design — clean them up if you're touching nearby code, no need to ask first:
- CORS in `backend/app/main.py` is hardcoded to `http://localhost:5173` only (comment: "move to .env later") — the admin app on :5174 isn't included.
- `frontend/packages/providers` depends on `react-router@^8`, while both apps depend on `react-router-dom@^7` — a version split across the same dependency graph.
- `frontend/packages/providers/src/AuthProvider.tsx` imports `@pyxie/api-client/src/api/users.ts` directly instead of through the package's public barrel export.

## Database schema/seed

Alembic migrations (`backend/migrations/versions/`) are the source of truth for schema — there's no more `database/*.sql` dump. `alembic upgrade head` against an empty DB reproduces the live schema exactly. `backend/app/seed.py` (run via `make db-seed` or `uv run python -m app.seed`) upserts one dev admin account (`admin` / `devpassword123`) instead of loading a data dump — safe to rerun. `make db-restore` does a full local reset: drops and recreates the `public` schema, runs migrations, then seeds.

Note: the `spreads` table exists in the DB (and is covered by a migration) but has no SQLAlchemy model yet — tarot-reading features aren't built. `migrations/env.py`'s `target_metadata` only tracks `app.models.user`, so `alembic check`/autogenerate will keep flagging `spreads` as an untracked table until that feature gets a real model. That's expected, not a bug — don't "fix" it by dropping the table or adding an empty placeholder model.

## Commit style

Lowercase, terse, present/gerund tense, no conventional-commit prefixes (e.g. `connected authprovider`, `fixed startup admin router guard`). WIP commits are normal here.
