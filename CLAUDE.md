# CLAUDE.md

## Project overview

Pyxie Tarot — a tarot-reading diary app. WIP, single-developer. Implemented: auth (signup/login), admin panel (users,
spreads, decks — full CRUD; diary entries read + delete only), and `apps/app`'s reading flow (`create-entry/`: pick
spread, draw/flip cards, reflect via free-text and per-position prompts).

Monorepo:

- `backend/` — Python/FastAPI (uv-managed)
- `frontend/` — pnpm workspace: `apps/app` (:5173), `apps/admin` (:5174), sharing `@pyxie/api-client`,
  `@pyxie/providers`, `@pyxie/ui`

Infra/hosting decisions and reasoning (droplet, DNS, deploy plan) live in an Obsidian vault outside this repo — ask the
user for its location if relevant and not already known.

**No user-facing feature calls an LLM (Claude or otherwise).** Cost, and against the app's design principles. Claude is
for development only, never a customer interaction (e.g. generated insights on pulled cards).

## Human edits of CLAUDE.md

Unless secrets or other dangerous content is at risk of leaking, do not flag human edits of CLAUDE.md.

## Docs, comments, locales

Any docs, comments or locales Claude writes should be prefixed with `CLAUDE `. A CI/CD check should ensure any existing
strings with that prefix fail PR checks. Humans should do the actual writing, though they may use Claude's words as a
model.

## Commands

Root `Makefile` orchestrates both halves (`dev`, `install`, `test`, `db-restore`, `db-seed`, ...) — see it,
`backend/Makefile`, and each `package.json` for exact targets. `make test` = `test-backend` (`uv run pytest`) +
`test-frontend` (`pnpm test`). No root build command — use `pnpm build` inside `frontend/`.

## Code style

- **Backend**: Ruff only (no black), config in `backend/pyproject.toml`. 120-char lines, double quotes, py312. Rule sets
  include `ASYNC`/`PERF`/`SIM`/`UP`/`N` — mind async-correctness and modernization, not just style.
- **Frontend**: Oxc (`oxlint` + `oxfmt`), not ESLint/Prettier. 120-char width, 2-space tabs, double quotes
  (`frontend/.oxfmtrc.json`, `.oxlintrc.json`).
- Both enforced via `.pre-commit-config.yaml`.
- Prefer a template string over branching between near-duplicate string literals.
- Avoid single-letter/shorthand variable names (`p`, `prev`) even where surrounding context makes them technically
  clear — prefer the descriptive form (`prompt`/`position`, `prevPrompts`) so the name alone carries the meaning.
  Exception: `i` for a loop/array index is a standard convention and fine as-is.
- Keep files to ~200–250 lines; split at natural seams past that. Data/config files (migrations, seed data, generated
  files) are exempt.
- Keep comments to a minimum; only leave one for code that can't be reasoned without (i.e. magic numbers). Doc comments
  (JSDoc `/** */`, Python docstrings) are the exception — add them on exported functions/hooks/components/ non-obvious
  types where the signature alone doesn't convey behavior; skip self-explanatory code. One line if it fits — see
  `useMarquee.ts` or `security.py`'s `consume_token` for the target density. Document a non-obvious param/prop on
  whichever side carries its type (a `@param` tag, or a comment on the props `interface` field) — never both, and never
  when the name+type already say enough. Backend relies on type hints the same way; no
  `Args:`/`Returns:` sections in this codebase's docstrings.

## Frontend component style

Build UI from shadcn base components (`@pyxie/ui`'s `base-ui/*` wrappers), not raw HTML or bespoke components. Keep
styling bare/functional unless a specific look is requested.

## Loading state

`apps/app` API calls should be wrapped in `useLoading()`'s `withLoading()` (`@pyxie/providers`) so the logo's loading
animation reflects in-flight requests — see `create-entry/SpreadPicker.tsx` or `diary/EntryList.tsx`. Covers every
`apps/app` call except the auth forms (login/signup/password reset, shared with `apps/admin` via `@pyxie/ui`'s
`AuthForm`), which are unwired. Not all call sites are covered yet — extend opportunistically.

## Avoid over-defensive code

Handle only real, reachable cases given the surrounding code's contracts — no speculative validation/try-except, no
exhaustive edge-case tests. Exception: deliberate security-boundary checks (e.g. `verify_route_protection()`) are
intentionally paranoid — test their edge cases too.

## Testing

- **Backend**: `cd backend && uv run pytest`. `conftest.py` sets `SECRET_KEY`/`DATABASE_URL` so DB-independent tests
  need no local `.env`/Postgres.
    - Endpoint tests hit your real local Postgres dev DB via `backend/.env` (no separate test DB). Each test's
      `db_session` uses `join_transaction_mode="create_savepoint"`, so route handlers' `db.commit()` calls land on
      SAVEPOINTs rolled back at teardown — nothing persists. Tests skip if `.env`/Postgres is unavailable.
    - Use the `client` fixture + factories in `tests/factories.py` (`make_user`, `make_admin`, `make_spread`,
      `make_deck`, `make_diary_entry`, `auth_headers`). Scope list-endpoint assertions by a unique `search` term (dev DB
      has real seeded data), not exact-set equality.
    - Add tests alongside non-trivial backend logic.
- **Frontend**: `cd frontend && pnpm test` (Vitest + RTL, jsdom). Config: `frontend/vitest.config.ts`, setup in
  `vitest.setup.ts`. Each app/package has its own `tests/` dir (e.g. `apps/app/tests/`, `packages/ui/tests/`)
  mirroring its `src/` subfolder layout, as `*.test.tsx`/`*.test.ts` — not co-located with source.
- **E2E**: `frontend/e2e` (Playwright), a separate pnpm workspace package, not part of `pnpm test`/`make test` since it
  needs a real local Postgres (`make db-seed` run once first) and, the first time, the browsers installed
  (`cd frontend/e2e && pnpm exec playwright install firefox chromium`). Run via `make test-e2e`. Firefox is the default
  browser (runs every spec in `frontend/e2e/tests/`); Chromium only runs specs/tests tagged `@smoke` in their title, via
  `playwright.config.ts`'s `grep`. `playwright.config.ts`'s `webServer` boots the backend + both apps' dev servers
  itself (same as CI), so no manual `make dev` is required first. Auth for specs that need to start logged in goes
  through `tests/auth.setup.ts` (a project-dependency "setup" step, Playwright's standard pattern) — it logs in via the
  real API and seeds `localStorage`/`storageState`, rather than each spec doing a UI login. CI:
  `.github/workflows/e2e.yml`, not wired as a deploy gate yet.
- **CI** (`.github/workflows/*.yml`) runs lint/format/typecheck/build/tests on push and PRs to `main` — the real test
  gate. Pre-commit only runs lint/format/license-header checks. Run `pnpm build` and `tsc` locally before calling
  frontend work done.
- Don't re-run the full suite after every small edit — scope to what changed, run it once when wrapping up.
- For frontend UI work, `tsc` passing is enough; no need to browser-test or lint manually unless asked.

## Frontend path aliases

`packages/ui` and `packages/api-client` use namespaced aliases (`@ui/*`, `@api-client/*`) instead of generic `@/*`,
because `tsc` type-checks a consuming app as one flat program using that app's `paths` — two packages both using
`@/*` would resolve to the wrong directory under `tsc` (not under Vite). Apps keep `@/*` for their own `src` plus
explicit `@ui/*`/`@api-client/*` entries. New shared packages should follow suit and be wired into both apps'
`tsconfig.json`.

## Auth & admin architecture — read before touching routes

- JWT auth (`python-jose`, HS256) + Argon2 hashing in `backend/app/core/security.py`.
- One `/auth/login` endpoint (`backend/app/api/v1/auth.py`) serves both apps via a `client: "app" | "admin"` body field;
  `client == "admin"` requires `role == ADMIN` or 403.
- **Hard invariant, enforced at startup**: every `/api/v1/admin` route must depend on `require_admin`; no route outside
  it may. `verify_route_protection()` (`backend/app/main.py` lifespan) raises `RuntimeError` on violation. Add admin
  endpoints only via the `admin_router()` factory (`backend/app/api/v1/admin/__init__.py`), never a bare
  `APIRouter()`.
- Frontend stores the JWT in `localStorage` (`frontend/packages/api-client/src/utils.ts`), Bearer header, no refresh
  flow — a failed `getMe()` just clears the token.

## Dismissed security alerts — don't reintroduce

Alerts dismissed as inapplicable — revisit if the reasoning stops holding:

- **Dependabot, `ecdsa` / GHSA-wj6h-64fc-37mp**: auth is HS256-only, never does EC signing. Revisit before RS256/ES256.
- **CodeQL, `py/clear-text-logging-sensitive-data` in `backend/app/core/email.py`'s `send_branded_email`**: the dev/CI
  fallback (no `RESEND_KEY` configured) logs the full email body, including password-reset/email-confirmation tokens,
  intentionally — devs need that to exercise those flows locally without Resend. This path never runs where a provider
  is configured, i.e. never in prod. Revisit if the fallback's trigger condition changes.

## Dev environment

- Before starting `make dev`/`uvicorn`/`vite`, check for already-running dev servers (`ps aux | grep -E
  "uvicorn|vite"`, or ask) to avoid port conflicts.
- `backend/.env` (gitignored, copy from `.env.example`): `DATABASE_URL`, `SECRET_KEY` (required, no default).
- Root `.env` (gitignored, copy from `.env.example`): `ANDROID_STUDIO_PATH`, only needed for `make android`.
- No Docker — Postgres must run locally.

## Infra changes

Claude must not edit files under `infra/` (Terraform, `docker-compose.yml`, `fetch-secrets.sh`, etc.) — read, analyze,
and propose changes (diffs/snippets in chat) as usual, but the developer applies them by hand. Offloading infra edits to
Claude led to changes landing without the developer understanding them well enough — this rewires that back to hands-on.
Doesn't apply to `backend/`/`frontend/` app code, even when the change is infra-adjacent (e.g. reading `AWS_REGION` from
settings).

## Mobile (Capacitor/Android)

`frontend/apps/app/android/` is a Capacitor-wrapped native shell for the Play Store, added via `npx cap add android`
and committed (native customizations like manifest permissions live there — only build output/`local.properties`
are gitignored). `capacitor.config.ts` sets `appId: "live.pyxietarot.app"` (permanent once published).

- `server.url` points the shell at `https://pyxietarot.live` (the real prod origin, already in backend CORS) instead of
  bundling a local snapshot — ordinary frontend deploys reach Android users immediately, no new store release needed. A
  store release is only required for native-only changes: plugins, permissions, icon, target-SDK bumps.
  `webDir: "dist"` is still required by the Capacitor CLI and kept synced as a dormant fallback — remove
  `server.url` to fall back to it for offline/bundled testing.
- The existing `vite-plugin-pwa` service worker still applies (same origin, same SW), so the shell gets the same offline
  app-shell caching as the installed PWA - not "always online," but dynamic data (API calls) needs a live backend either
  way, in both models.
- For local hot-reload dev on a device/emulator, temporarily point `server.url` at your machine's LAN IP + `:5173`
  (Android emulators can't reach `localhost` on the host); revert before committing.
- `pnpm cap:sync` (build + `cap sync android`) then `pnpm cap:open` (opens Android Studio) — from
  `frontend/apps/app`.
- Camera/push-notification plugins aren't installed yet — issue 22 only wires the basic shell. Push notifications are
  planned before Play Store submission, partly to avoid Play's "pure webview wrapper" review friction.

## Known WIP rough edges — fine to fix opportunistically

- `frontend/packages/providers/src/AuthProvider.tsx` imports `@pyxie/api-client/src/api/users.ts` directly instead of
  the package's barrel export.

## Database schema/seed

Alembic (`backend/migrations/versions/`) is the sole source of truth for schema. Seeding is split by whether it's safe
to run against prod:

- `backend/app/dev_seed.py` (`make db-seed`) — **dev-only fixture data**: upserts a dev admin (`admin`/
  `pyxie-tarot`), 50 dev users, example custom spreads, and ~120 diary entries (`seed_diary.py`, scoped only to accounts
  `dev_seed.py` itself creates). Refuses to run unless `DATABASE_URL`'s host is `localhost`/`127.0.0.1`, or
  `ALLOW_SEED=true` is set — guards against accidentally seeding a non-dev DB (e.g. prod pointed to via `.env`), which
  would create 50+ accounts sharing the password above.
- `backend/app/seed_decks.py` (`make db-seed-deck`) — **prod-safe**: upserts only the system "Rider-Waite-Smith"
  deck (`user_id=None`), no dev fixtures, no guard needed. `dev_seed.py` calls this internally so local dev gets the
  deck too.
- System spreads (Celtic Cross, Horseshoe, etc., also `user_id=None`) are seeded via Alembic migrations, not a script —
  same "safe anywhere" reasoning.

Both seed paths are idempotent. `make db-restore` drops/recreates the `public` schema, migrates, then runs
`dev_seed`.

`migrations/env.py` imports every model module so `target_metadata`/autogenerate stays accurate — register new models
there too.

Deploy (`.github/workflows/backend.yml`) runs `alembic upgrade head` before swapping in the new backend container, so
the *old* code briefly serves requests against the *new* schema — write migrations additive/expand-contract-style (a
later migration drops/renames once nothing reads the old shape). CI's `Check migration safety` step
(`backend/migrations/check_migration_safety.py`) flags `drop_column`/`drop_table`/`rename_column`/type-changing
`alter_column` in a PR's new migration files; intentional cases opt out with `# migration-guard: allow` on the line.

## Diary entries

`DiaryEntry` has no live FK to `spreads` — `spread_name`, `positions`, `prompts`, `cards` are snapshotted at creation so
later spread edits don't alter history; don't add a `spread_id` back-reference. `PATCH` may edit
`entry_text`, `entry_date`, `replies` only, never the cards/spread snapshot — redo by delete + recreate. Admin diary API
is read + delete only (entries come from users, not admin authoring). `Spread.allow_reversed` (default `True`)
is enforced at creation — reversed cards require the spread to allow it. A user may have at most one entry per
`entry_date` (DB `UniqueConstraint`, checked explicitly in `create`/`update` for a clean 400) — `apps/app`'s diary
calendar view relies on this to navigate straight from a day to its one entry.

## Decks

`Deck`/`DeckCard` hold card art/meanings, separate from `TarotCard` (pure 78-slug identity). `Deck.user_id` nullable
(`None` = system deck, like `Spread`). Creating a `Deck` auto-generates all 78 `DeckCard` rows; deleting cascades.
`DeckCard`s can only be updated, never individually created/deleted. `image_url` is a plain URL field, no upload infra.
Read-only deck API (`GET /decks`, `/decks/{id}`, `/decks/{id}/cards`) serves `apps/app`'s reading flow — still no
per-user deck editing outside admin.

## Git workflow

If instructed to work on a GitHub issue, switch to main, pull and create a new branch before beginning work. If asked to
work on multiple issues at once, use only a single branch. Never commit or push changes; only humans should do so.

## Versioning & patch notes

`frontend/apps/app/package.json`'s `version` field (SemVer) is the app's public version. Bump it via
`make patch VERSION=patch|minor|major [MSG="..."] [ANDROID=patch|minor|major]`
(`frontend/scripts/write-patch-note.mjs`) as part of the commit that finishes a change worth announcing to users — don't
edit `package.json`/`changelogData.ts` by hand. `VERSION`/`ANDROID` are bump *types*, not explicit `X.Y.Z`
values — the script computes the next version off whichever track's current value. `MSG` prepends a matching entry to
`frontend/apps/app/src/lib/changelogData.ts` (a small hand-maintained array, newest entry first) — write it with users
in mind, not internals. `MSG` is required whenever `VERSION` isn't `patch` (mirrors CI's
`check-version-bump.mjs`, which only requires a changelog entry for a minor/major bump) and optional for a patch-only
bump, where it'd usually be skipped since patch bumps aren't meant to surface to users. `VERSION` can be omitted for an
Android-only native bump (`make patch ANDROID=patch|minor|major`, see "Mobile" below) — `MSG`
requires `VERSION` alongside it regardless, since a changelog entry is tied to the web version it shipped in, not the
native one.

- Claude should suggest a bump (major/minor/patch) and note wording when a change looks release-worthy, but the
  developer decides and confirms before it's committed — don't bump unasked.
- The Android shell's own `versionCode`/`versionName` (`frontend/apps/app/android/app/build.gradle`) are a **separate,
  independent SemVer track** from `package.json`'s version — not kept in sync. Bump them (via
  `make patch`'s `ANDROID=patch|minor|major` — auto-increments `versionCode`, and applies the bump type to
  `versionName`'s *current working-tree* value, not necessarily `main`'s — double check against `main` too) only when a
  native-only change (new Capacitor plugin/permission, widget, etc. — see this file's Mobile section) actually needs a
  store release; `server.url` already keeps the JS bundle current without one. See `backend/app/core/app_version.py`'s
  docstring and `NativeVersionGate.tsx`, which compare the installed shell's `versionName` against server-side
  `MINIMUM_NATIVE_VERSION`/`RECOMMENDED_NATIVE_VERSION`
  thresholds in this same independent space, and CI's `check-native-version-bump.mjs`, which enforces the bump on
  relevant PRs (a one-time intentional regression like this one can opt out with a `// version-guard: allow`
  comment in `build.gradle` — see that script; remove the comment once no longer needed).
