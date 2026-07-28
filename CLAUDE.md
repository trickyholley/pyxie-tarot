# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Pyxie Tarot — a tarot-reading diary app. Currently under construction: auth (signup/login) and an admin panel are implemented, covering users, spreads (full CRUD), diary entries (read + delete only), and decks (full CRUD); `apps/app` now has an end-user reading/diary-creation flow (`create-entry/`: pick a spread, draw and flip cards, then reflect with free-text and per-position prompts). Single-developer, WIP-friendly repo.

Monorepo with two independent parts:
- `backend/` — Python/FastAPI service (uv-managed)
- `frontend/` — pnpm workspace: two apps (`apps/app` on :5173, `apps/admin` on :5174) sharing packages `@pyxie/api-client`, `@pyxie/providers`, `@pyxie/ui`

## Commands

Root `Makefile` orchestrates both halves (`dev`, `install`, `test`, `db-restore`, `db-seed`, etc.) — see the `Makefile` and `backend/Makefile` for exact targets, and each `package.json` for frontend scripts. `make test` runs `test-backend` (`cd backend && make test`, i.e. `uv run pytest`) and `test-frontend` (`cd frontend && pnpm test`) together; there is no root-level build command — go into `frontend/` directly for `pnpm build`.

## Code style

- **Backend**: Ruff only (no black), configured entirely in `backend/pyproject.toml`. 120-char lines, double quotes, py312 target. Enabled rule sets include `ASYNC`/`PERF`/`SIM`/`UP`/`N` — pay attention to async-correctness and modernization lints, not just style.
- **Frontend**: Oxc toolchain — `oxlint` + `oxfmt`, **not ESLint/Prettier**. 120-char width, 2-space tabs, double quotes (`frontend/.oxfmtrc.json`, `frontend/.oxlintrc.json`).
- Both are enforced via `.pre-commit-config.yaml` (ruff --fix + ruff-format scoped to `backend/`, oxlint + oxfmt scoped to `frontend/(apps|packages)/`).
- Prefer a template string over branching between near-duplicate string literals (e.g. a ternary picking between two copies of the same sentence with one word different).

## File size

Prefer keeping code files to roughly 200–250 lines. Data/config files (migrations, seed data, generated files) are exempt. If a file grows past that, look for reasonable extraction points (shared UI chunks, subcomponents, helper modules) rather than letting it grow unbounded — but don't force a split that doesn't have a natural seam.

## Frontend component style

Build UI out of shadcn base components (`@pyxie/ui`'s `base-ui/*` wrappers around `@base-ui/react`) rather than raw HTML elements or new bespoke components. Keep styling minimal/functional — bare layout, no visual polish (spacing, colors, animation) — unless the user specifically asks for a particular look.

## Avoid over-defensive code

Write straightforward code and tests that cover each major path clearly. Don't add handling, validation, or try/except blocks for edge cases that can't actually occur given the surrounding code's contracts — only handle a case if it's a real, reachable scenario. This applies especially to tests: a handful of focused tests covering the main behaviors and the realistic failure modes is better than exhaustively enumerating every conceivable edge case.

This does not apply to deliberate security-boundary checks, like `verify_route_protection()` below — those are intentionally paranoid on purpose, and their edge cases (missing guard, misplaced guard, zero routes found) are real, reachable scenarios worth testing, not defensive bloat.

## Testing

- **Backend**: pytest, run via `cd backend && uv run pytest`. Tests live in `backend/tests/`; `conftest.py` sets `SECRET_KEY`/`DATABASE_URL` env vars so DB-independent tests (schemas, security, route-protection invariants) never need a local `.env` or a live Postgres instance.
  - Endpoint tests are DB-backed and run against your real local Postgres dev DB (there's no separate test database) — they read the real `DATABASE_URL` straight out of `backend/.env`, bypassing the fake value above. Each test's `db_session` fixture binds to a connection with `join_transaction_mode="create_savepoint"`, so the route handlers' own `db.commit()` calls land on SAVEPOINTs, and the whole outer transaction is rolled back at teardown — nothing a test writes is ever visible outside it or left behind in your dev/seed data. If `backend/.env` is missing or Postgres isn't reachable, DB-backed tests skip automatically rather than failing.
  - Use the `client` fixture (an `httpx.AsyncClient` wired to the FastAPI app via the `get_db_session` override) plus the factory fixtures in `tests/factories.py` (`make_user`, `make_admin`, `make_spread`, `make_deck`, `make_diary_entry`, `auth_headers`) to build endpoint tests. Because the dev DB already has real seeded data, list-endpoint assertions should check for containment/counts scoped by a unique `search` term rather than asserting exact-set equality against the full response.
  - When adding non-trivial backend logic, add tests alongside it.
- **Frontend**: Vitest + React Testing Library, run via `cd frontend && pnpm test` (or `pnpm test:watch`). Config is at `frontend/vitest.config.ts` (jsdom environment, `resolve.tsconfigPaths: true`) with shared setup in `frontend/vitest.setup.ts`. Test files live next to the code as `*.test.tsx`/`*.test.ts` under `apps/*/src` or `packages/*/src`.
- **There is no CI.** Nothing runs tests, `tsc`, or the build automatically outside of git — pre-commit hooks at commit time run formatting/lint plus the full `pytest`/`vitest` suites (scoped to whichever half, backend or frontend, has staged changes). Run `pnpm build` and `tsc` locally before considering frontend work done, since those aren't covered by the hooks.
- **Don't run the full test suite after every small edit.** Pre-commit already gates the full suite at commit time, so re-running it mid-session is redundant busywork. If you can cheaply scope a check to just what changed (e.g. `uv run pytest tests/test_foo.py`, `pnpm vitest run path/to/Component.test.tsx`), that's a fine sanity check while iterating — but don't reach for a full `pnpm test`/`uv run pytest` run as a matter of course; save that for wrapping up a chunk of work.
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
- `frontend/packages/providers` depends on `react-router@^8`, while both apps depend on `react-router-dom@^7` — a version split across the same dependency graph.
- `frontend/packages/providers/src/AuthProvider.tsx` imports `@pyxie/api-client/src/api/users.ts` directly instead of through the package's public barrel export.

## Database schema/seed

Alembic migrations (`backend/migrations/versions/`) are the source of truth for schema — there's no more `database/*.sql` dump. `alembic upgrade head` against an empty DB reproduces the live schema exactly. `backend/app/seed.py` (run via `make db-seed` or `uv run python -m app.seed`) upserts one dev admin account (`admin` / `pyxie-tarot`), 50 regular dev users, a handful of example custom spreads, the default "Rider-Waite-Smith" deck (via `backend/app/seed_decks.py`), and ~100 example diary entries (via `backend/app/seed_diary.py`) — all idempotent, safe to rerun. `make db-restore` does a full local reset: drops and recreates the `public` schema, runs migrations, then seeds.

`migrations/env.py` imports every model module (`app.models.user`, `app.models.spread`, `app.models.diary_entry`, `app.models.deck`, `app.models.deck_card`, `app.models.password_reset_token`, `app.models.email_confirmation_token`) so `target_metadata` tracks all of them — `alembic check`/autogenerate should stay clean against those tables. If you add a new model, register its import there too.

## Diary entries

`DiaryEntry` deliberately does **not** hold a live FK to `spreads` — `spread_name`, `positions`, `prompts`, and `cards` are snapshotted onto the entry at creation time so editing/deleting a spread later doesn't alter historical entries. Don't "fix" this by adding a `spread_id` back-reference. `PATCH` can edit `entry_text`, `entry_date`, and `replies`, but never the cards/spread snapshot — a drawn reading is immutable; to redo it, delete and create a new entry. The admin panel (`backend/app/api/v1/admin/diary_entries.py`) is read + delete only, since real entries come from users, not admin authoring.

`Spread.allow_reversed` (default `True`) is enforced at diary-entry creation: cards can only be submitted `reversed` if the entry's spread allows it.

## Decks

`Deck`/`DeckCard` hold card art and meanings, kept separate from `TarotCard` (pure 78-slug card identity, no meaning/art of its own). `Deck.user_id` is nullable — same ownership pattern as `Spread` (`None` = system deck, set = user's custom deck). Creating a `Deck` auto-generates all 78 `DeckCard` rows (empty meanings); deleting a deck cascades to its cards. `DeckCard`s can only be updated, never individually created/deleted, since the 78-card set is fixed at creation time. `image_url` is a plain URL field — no file-upload/storage infra yet. A non-admin, read-only deck API (`GET /decks`, `GET /decks/{id}`, `GET /decks/{id}/cards`) exists for `apps/app`'s reading flow to fetch art and meanings; there's still no per-user deck creation/editing outside the admin panel.

## Commit style

Lowercase, terse, present/gerund tense, no conventional-commit prefixes (e.g. `connected authprovider`, `fixed startup admin router guard`). WIP commits are normal here.

## Git workflow

When asked to work on a task (e.g. "work on issue N"), create a new branch for it by default — but do not commit or push unless explicitly asked to, even after the work is complete. Leave changes staged/unstaged in the working tree for review.
