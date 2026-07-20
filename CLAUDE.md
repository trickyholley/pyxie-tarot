# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Pyxie Tarot — a tarot-reading diary app. Currently under construction: only auth (signup/login) and an admin user-management panel are implemented; tarot-reading features don't exist yet. Single-developer, WIP-friendly repo.

Monorepo with three independent parts:
- `backend/` — Python/FastAPI service (uv-managed)
- `frontend/` — pnpm workspace: two apps (`apps/app` on :5173, `apps/admin` on :5174) sharing packages `@pyxie/api-client`, `@pyxie/providers`, `@pyxie/ui`
- `database/` — checked-in `schema.sql`/`seed.sql` (pg_dump output) — **being phased out**, see below

## Commands

Root `Makefile` orchestrates both halves:
- `make dev` — runs backend (`uvicorn --reload` on :8000) and frontend (`pnpm -r --parallel run dev`) together
- `make install` — installs pre-commit hooks + `uv sync` (backend) + `pnpm install` (frontend)
- `make db-restore` — drops/recreates the `public` schema and applies `database/schema.sql` + `seed.sql`
- `make db-seed` — truncates `alembic_version, spreads, users` and reloads `database/seed.sql`

There is no root-level build/test command — go into `backend/` or `frontend/` directly, or use `make dev`/`make install`.

Backend: `cd backend && uv run uvicorn app.main:app --reload`, `cd backend && uv run pytest` (see Testing below).

Frontend: `pnpm build` (`tsc && vite build` per app), `pnpm test`, `pnpm lint` (oxlint), `pnpm format` (oxfmt).

## Code style

- **Backend**: Ruff only (no black), configured entirely in `backend/pyproject.toml`. 120-char lines, double quotes, py312 target. Enabled rule sets include `ASYNC`/`PERF`/`SIM`/`UP`/`N` — pay attention to async-correctness and modernization lints, not just style.
- **Frontend**: Oxc toolchain — `oxlint` + `oxfmt`, **not ESLint/Prettier**. 120-char width, 2-space tabs, double quotes (`frontend/.oxfmtrc.json`, `frontend/.oxlintrc.json`).
- Both are enforced via `.pre-commit-config.yaml` (ruff --fix + ruff-format scoped to `backend/`, oxlint + oxfmt scoped to `frontend/(apps|packages)/`).

## Avoid over-defensive code

Write straightforward code and tests that cover each major path clearly. Don't add handling, validation, or try/except blocks for edge cases that can't actually occur given the surrounding code's contracts — only handle a case if it's a real, reachable scenario. This applies especially to tests: a handful of focused tests covering the main behaviors and the realistic failure modes is better than exhaustively enumerating every conceivable edge case.

This does not apply to deliberate security-boundary checks, like `verify_route_protection()` below — those are intentionally paranoid on purpose, and their edge cases (missing guard, misplaced guard, zero routes found) are real, reachable scenarios worth testing, not defensive bloat.

## Testing

- **Backend**: pytest, run via `cd backend && uv run pytest`. Tests live in `backend/tests/`; `conftest.py` sets `SECRET_KEY`/`DATABASE_URL` env vars so tests don't depend on a local `.env` or a live Postgres instance — keep DB-independent logic (security, route-protection invariants) testable without a DB connection where possible. When adding non-trivial backend logic, add tests alongside it.
- **Frontend**: Vitest + React Testing Library, run via `cd frontend && pnpm test` (or `pnpm test:watch`). Config is at `frontend/vitest.config.ts` (jsdom environment, `resolve.tsconfigPaths: true`) with shared setup in `frontend/vitest.setup.ts`. Test files live next to the code as `*.test.tsx`/`*.test.ts` under `apps/*/src` or `packages/*/src`.
- **There is no CI.** Nothing runs tests, `tsc`, or the build automatically — the only automated check is pre-commit hooks at commit time (formatting/lint, not tests). Run the relevant test suite, `pnpm build`, and lint locally before considering backend/frontend work done.

## Frontend path aliases

Each shared package (`packages/ui`, `packages/api-client`) uses its own namespaced self-import alias, not the generic shadcn-default `@/*`: `@ui/*` inside `packages/ui`, `@api-client/*` inside `packages/api-client` (see each package's `tsconfig.json`). Apps (`apps/app`, `apps/admin`) keep `@/*` for their own `src`, plus explicit `@ui/*`/`@api-client/*` entries pointing at the sibling packages.

Reason: plain `tsc` type-checks a consuming app as one flat program using *that app's* `paths` for everything it pulls in, including raw source from other workspace packages — so if two packages both used generic `@/*`, `tsc` would resolve it against the app's mapping and silently point at the wrong directory (Vite doesn't have this problem, which is why builds worked while `tsc` didn't). If you scaffold a new shared package, give it its own namespaced alias and wire it into both apps' `tsconfig.json`, following the existing two as a template. `packages/ui/components.json` (shadcn CLI config) already emits `@ui/*` imports.

## Auth & admin architecture — read before touching routes

- JWT auth (`python-jose`, HS256) with Argon2 password hashing, implemented in `backend/app/core/security.py`.
- A single `/auth/login` endpoint (`backend/app/api/v1/auth.py`) serves both frontend apps, distinguished by a `client: "app" | "admin"` field in the request body (`backend/app/schemas/auth.py`). `client == "admin"` additionally requires `role == ADMIN` or returns 403.
- **Hard invariant, enforced at startup**: every route under `/api/v1/admin` must depend on `require_admin`, and no route outside that prefix may. This is checked by `verify_route_protection()` in `backend/app/main.py`'s lifespan hook — if violated, the app raises `RuntimeError` and refuses to start. Always add new admin endpoints through the `admin_router()` factory in `backend/app/api/v1/admin/__init__.py`, never a bare `APIRouter()`.
- Frontend stores the JWT in `localStorage` (`frontend/packages/api-client/src/utils.ts`) with a Bearer header — no refresh-token flow; a failed `getMe()` just clears the token.

## Environment

- `backend/.env` (gitignored, copy from `backend/.env.example`): `DATABASE_URL`, `SECRET_KEY` (required, no default — app won't start without it).
- No Docker setup — Postgres must be running locally.

## Known WIP rough edges — fine to fix opportunistically

These are known, not intentional design — clean them up if you're touching nearby code, no need to ask first:
- CORS in `backend/app/main.py` is hardcoded to `http://localhost:5173` only (comment: "move to .env later") — the admin app on :5174 isn't included.
- `frontend/packages/providers` depends on `react-router@^8`, while both apps depend on `react-router-dom@^7` — a version split across the same dependency graph.
- `frontend/packages/providers/src/AuthProvider.tsx` imports `@pyxie/api-client/src/api/users.ts` directly instead of through the package's public barrel export.

## Database schema/seed — direction of travel

`database/schema.sql` and `database/seed.sql` (pg_dump output, refreshed via `make db-dump`) are being phased out in favor of Alembic-driven seeding. Only one Alembic migration exists so far (`395f25063d98_create_users_table.py`) and the dumped schema is already ahead of it (e.g. `spreads` table has no migration). Don't treat `database/*.sql` as the source of truth going forward — prefer adding/backfilling Alembic migrations, and flag it if asked to change schema in a way that only touches the SQL dumps.

## Commit style

Lowercase, terse, present/gerund tense, no conventional-commit prefixes (e.g. `connected authprovider`, `fixed startup admin router guard`). WIP commits are normal here.
