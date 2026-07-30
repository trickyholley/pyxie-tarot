# CLAUDE.md

Guidance for Claude Code in this repo.

## Project overview

Pyxie Tarot — a tarot-reading diary app. WIP, single-developer. Implemented: auth (signup/login), admin panel (users, spreads, decks — full CRUD; diary entries — read + delete only), and `apps/app`'s reading flow (`create-entry/`: pick spread, draw/flip cards, reflect via free-text and per-position prompts).

Monorepo:
- `backend/` — Python/FastAPI (uv-managed)
- `frontend/` — pnpm workspace: `apps/app` (:5173), `apps/admin` (:5174), sharing `@pyxie/api-client`, `@pyxie/providers`, `@pyxie/ui`

## Commands

Root `Makefile` orchestrates both halves (`dev`, `install`, `test`, `db-restore`, `db-seed`, ...) — see it, `backend/Makefile`, and each `package.json` for exact targets. `make test` = `test-backend` (`uv run pytest`) + `test-frontend` (`pnpm test`). No root build command — use `pnpm build` inside `frontend/`.

## Code style

- **Backend**: Ruff only (no black), config in `backend/pyproject.toml`. 120-char lines, double quotes, py312. Rule sets include `ASYNC`/`PERF`/`SIM`/`UP`/`N` — mind async-correctness and modernization, not just style.
- **Frontend**: Oxc (`oxlint` + `oxfmt`), not ESLint/Prettier. 120-char width, 2-space tabs, double quotes (`frontend/.oxfmtrc.json`, `.oxlintrc.json`).
- Both enforced via `.pre-commit-config.yaml`.
- Prefer a template string over branching between near-duplicate string literals.

## File size

Keep files to ~200–250 lines; split at natural seams when they grow past that. Data/config files (migrations, seed data, generated files) are exempt.

## Frontend component style

Build UI from shadcn base components (`@pyxie/ui`'s `base-ui/*` wrappers), not raw HTML or bespoke components. Keep styling bare/functional unless a specific look is requested.

## Loading state

`apps/app` API calls should be wrapped in `useLoading()`'s `withLoading()` (`@pyxie/providers`) so the logo's loading animation reflects in-flight requests — see `create-entry/SpreadPicker.tsx` or `diary/EntryList.tsx`. This should cover every `apps/app` API call except the auth forms (login/signup/password reset/etc., shared with `apps/admin` via `@pyxie/ui`'s `AuthForm`), which are unwired — not all call sites are wired up yet, so keep extending coverage opportunistically.

## Avoid over-defensive code

Handle only real, reachable cases given the surrounding code's contracts — no speculative validation/try-except, no exhaustive edge-case tests. Exception: deliberate security-boundary checks (e.g. `verify_route_protection()`) are intentionally paranoid — test their edge cases too.

## Testing

- **Backend**: `cd backend && uv run pytest`. `conftest.py` sets `SECRET_KEY`/`DATABASE_URL` so DB-independent tests need no local `.env`/Postgres.
  - Endpoint tests hit your real local Postgres dev DB via `backend/.env` (no separate test DB). Each test's `db_session` uses `join_transaction_mode="create_savepoint"`, so route handlers' own `db.commit()` calls land on SAVEPOINTs rolled back at teardown — nothing persists. Tests skip automatically if `.env`/Postgres is unavailable.
  - Use the `client` fixture plus factories in `tests/factories.py` (`make_user`, `make_admin`, `make_spread`, `make_deck`, `make_diary_entry`, `auth_headers`). Since the dev DB has real seeded data, scope list-endpoint assertions by a unique `search` term rather than exact-set equality.
  - Add tests alongside any non-trivial backend logic.
- **Frontend**: `cd frontend && pnpm test` (Vitest + RTL, jsdom). Config: `frontend/vitest.config.ts`, setup in `vitest.setup.ts`. Tests live next to code as `*.test.tsx`/`*.test.ts`.
- **CI** (`.github/workflows/*.yml`) runs lint/format/typecheck/build/tests on push and PRs to `main` — that's the real test gate. Pre-commit only runs lint/format/license-header checks, not tests. Run `pnpm build` and `tsc` locally before calling frontend work done.
- Don't re-run the full suite after every small edit — scope to what changed while iterating, run the full suite once when wrapping up.
- For frontend UI work, `tsc` passing is enough; no need to manually browser-test or run lint (pre-commit covers lint at commit time) unless asked.

## Frontend path aliases

`packages/ui` and `packages/api-client` use their own namespaced aliases (`@ui/*`, `@api-client/*`) instead of generic `@/*`, because `tsc` type-checks a consuming app as one flat program using that app's `paths` — two packages both using `@/*` would resolve to the wrong directory under `tsc` (though not under Vite). Apps keep `@/*` for their own `src` plus explicit `@ui/*`/`@api-client/*` entries. New shared packages should follow the same pattern and be wired into both apps' `tsconfig.json`.

## Auth & admin architecture — read before touching routes

- JWT auth (`python-jose`, HS256) + Argon2 hashing in `backend/app/core/security.py`.
- One `/auth/login` endpoint (`backend/app/api/v1/auth.py`) serves both apps via a `client: "app" | "admin"` body field; `client == "admin"` requires `role == ADMIN` or 403.
- **Hard invariant, enforced at startup**: every `/api/v1/admin` route must depend on `require_admin`; no route outside it may. `verify_route_protection()` (`backend/app/main.py` lifespan) raises `RuntimeError` on violation. Add admin endpoints only via the `admin_router()` factory (`backend/app/api/v1/admin/__init__.py`), never a bare `APIRouter()`.
- Frontend stores the JWT in `localStorage` (`frontend/packages/api-client/src/utils.ts`), Bearer header, no refresh flow — a failed `getMe()` just clears the token.

## Dismissed security alerts — don't reintroduce

Two Dependabot alerts, dismissed as inapplicable — revisit if the reasoning stops holding:
- **`ecdsa` / GHSA-wj6h-64fc-37mp**: auth is HS256-only, never does EC signing. Revisit before RS256/ES256.
- **`react-router` / GHSA-qwww-vcr4-c8h2**: both apps use client-side `createBrowserRouter`, not RSC. Revisit (and bump to >=8.3.0 first) before adopting `unstable_*` RSC APIs.

## Local dev servers

Before starting `make dev`/`uvicorn`/`vite`, check for already-running dev servers (`ps aux | grep -E "uvicorn|vite"`, or ask) to avoid port conflicts.

## Environment

- `backend/.env` (gitignored, copy from `.env.example`): `DATABASE_URL`, `SECRET_KEY` (required, no default).
- No Docker — Postgres must run locally.

## Known WIP rough edges — fine to fix opportunistically

- `frontend/packages/providers` depends on `react-router@^8`; both apps depend on `react-router-dom@^7` — a version split.
- `frontend/packages/providers/src/AuthProvider.tsx` imports `@pyxie/api-client/src/api/users.ts` directly instead of the package's barrel export.

## Database schema/seed

Alembic (`backend/migrations/versions/`) is the sole source of truth for schema. `backend/app/seed.py` (`make db-seed`) upserts a dev admin (`admin`/`pyxie-tarot`), 50 dev users, example spreads, the "Rider-Waite-Smith" deck (`seed_decks.py`), and ~120 diary entries (`seed_diary.py`, including two dozen for the admin account) — all idempotent. `make db-restore` drops/recreates the `public` schema, migrates, then seeds.

`migrations/env.py` imports every model module so `target_metadata`/autogenerate stays accurate — register new models there too.

## Diary entries

`DiaryEntry` has no live FK to `spreads` — `spread_name`, `positions`, `prompts`, `cards` are snapshotted at creation so later spread edits don't alter history. Don't add a `spread_id` back-reference. `PATCH` may edit `entry_text`, `entry_date`, `replies` only, never the cards/spread snapshot — redo by delete + recreate. Admin diary API is read + delete only (entries come from users, not admin authoring). `Spread.allow_reversed` (default `True`) is enforced at creation — reversed cards require the spread to allow it. A user may have at most one entry per `entry_date` (DB `UniqueConstraint`, checked explicitly in `create`/`update` for a clean 400 instead of a raw integrity error) — `apps/app`'s diary calendar view relies on this to navigate straight from a day to its one entry.

## Decks

`Deck`/`DeckCard` hold card art/meanings, separate from `TarotCard` (pure 78-slug identity). `Deck.user_id` nullable (`None` = system deck, like `Spread`). Creating a `Deck` auto-generates all 78 `DeckCard` rows; deleting cascades. `DeckCard`s can only be updated, never individually created/deleted. `image_url` is a plain URL field, no upload infra. Read-only deck API (`GET /decks`, `/decks/{id}`, `/decks/{id}/cards`) serves `apps/app`'s reading flow — still no per-user deck editing outside admin.

## Commit style

Lowercase, terse, present/gerund tense, no conventional-commit prefixes (e.g. `connected authprovider`). WIP commits are normal.

## Git workflow

For a task like "work on issue N", create a new branch by default; don't commit or push unless explicitly asked — leave changes in the working tree for review.
