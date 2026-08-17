.PHONY: dev dev-backend dev-frontend install install-root install-backend install-frontend test test-backend test-frontend test-e2e lint lint-backend lint-frontend clean db-restore db-seed db-seed-deck db-migrate db-upgrade db-downgrade db-history redis-flush android android-release patch

DB_URL := $(shell grep -E '^DATABASE_URL=' backend/.env 2>/dev/null | cut -d'=' -f2- | sed 's/postgresql+[^:]*:/postgresql:/')
REDIS_URL := $(shell grep -E '^REDIS_URL=' backend/.env 2>/dev/null | cut -d'=' -f2-)
REDIS_URL := $(if $(REDIS_URL),$(REDIS_URL),redis://localhost:6379/0)
ANDROID_STUDIO_PATH := $(shell grep -E '^ANDROID_STUDIO_PATH=' .env 2>/dev/null | cut -d'=' -f2-)
ANDROID_KEYSTORE_PROPERTIES := $(shell grep -E '^ANDROID_KEYSTORE_PROPERTIES=' .env 2>/dev/null | cut -d'=' -f2-)

clean:
	@echo "Cleaning up..."
	@cd frontend && pnpm -r exec rm -rf node_modules dist || true
	@cd frontend && rm -rf node_modules || true
	@cd backend && make clean
	@pre-commit clean 2>/dev/null || true

db-restore:
	@test -n "$(DB_URL)" || (echo "✗ DATABASE_URL not found in backend/.env" && exit 1)
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 \
		-c "DROP SCHEMA IF EXISTS public CASCADE;" \
		-c "CREATE SCHEMA public;"
	@$(MAKE) db-upgrade
	@cd backend && uv run python -m app.dev_seed
	@echo "✓ Database restored"

# Dev-only fixture data (fake users/passwords, example diary entries) — refuses to run
# against a non-localhost DATABASE_URL, see backend/app/dev_seed.py.
db-seed:
	@cd backend && uv run python -m app.dev_seed
	@echo "✓ Seed data reloaded"

# Prod-safe: seeds/updates only the system Rider-Waite-Smith deck, no dev fixtures.
db-seed-deck:
	@cd backend && uv run python -m app.seed_decks
	@echo "✓ System deck seeded"

db-migrate:
	@test -n "$(MSG)" || (echo "✗ Usage: make db-migrate MSG=\"description\"" && exit 1)
	@cd backend && uv run alembic revision --autogenerate -m "$(MSG)"

db-upgrade:
	@cd backend && uv run alembic upgrade head
	@echo "✓ Database upgraded to head"

db-downgrade:
	@cd backend && uv run alembic downgrade -1
	@echo "✓ Database downgraded one revision"

db-history:
	@cd backend && uv run alembic history

# Wipes rate-limit buckets (backend/app/core/rate_limit.py) and any other Redis-held state (e.g.
# refresh tokens) for REDIS_URL's db. Refuses a non-localhost host unless ALLOW_FLUSH=true, same
# guard shape as dev_seed.py's ALLOW_SEED - see CLAUDE.md's Prod seed incident precedent.
redis-flush:
	@case "$(REDIS_URL)" in \
		redis://localhost*|redis://127.0.0.1*) ;; \
		*) test -n "$(ALLOW_FLUSH)" || (echo "✗ REDIS_URL host isn't localhost/127.0.0.1 - set ALLOW_FLUSH=true to override" && exit 1) ;; \
	esac
	@redis-cli -u "$(REDIS_URL)" FLUSHDB
	@echo "✓ Redis flushed"

dev:
	@echo "Starting development environment..."
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend:
	@echo "Starting backend development server..."
	@cd backend && make dev

dev-frontend:
	@echo "Starting frontend development servers..."
	@cd frontend && pnpm -r --parallel run dev

install: install-root install-backend install-frontend

install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && make install

install-frontend:
	@echo "Installing frontend dependencies..."
	@cd frontend && pnpm install

install-root:
	@echo "Installing root dependencies..."
	@pipx install pre-commit 2>/dev/null || pip install pre-commit
	@pre-commit install

test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	@cd backend && make test

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && pnpm test

# Not part of `test` - needs a running local Postgres (seeded via `make db-seed`) and, the first
# time, the Playwright browsers (`cd frontend/e2e && pnpm exec playwright install firefox chromium`).
# Frees port 8000 first so playwright.config.ts's webServer always spawns its own backend (with
# RESEND_KEY forced blank there) instead of reusing a `make dev` backend that may have loaded a
# real key from backend/.env - a real key makes signup email e2e's throwaway addresses and 500.
test-e2e:
	@echo "Running E2E tests..."
	@fuser -k 8000/tcp >/dev/null 2>&1 || true
	@cd frontend && pnpm --filter @pyxie/e2e test

lint: lint-backend lint-frontend

lint-backend:
	@echo "Linting backend..."
	@cd backend && make lint

lint-frontend:
	@echo "Linting frontend..."
	@cd frontend && pnpm run lint
	@cd frontend && pnpm exec oxfmt --check

android:
	@echo "Syncing Android native shell..."
	@cd frontend/apps/app && pnpm cap:sync
	@test -n "$(ANDROID_STUDIO_PATH)" || (echo "✗ ANDROID_STUDIO_PATH not found in .env (see .env.example)" && exit 1)
	@cd frontend/apps/app && CAPACITOR_ANDROID_STUDIO_PATH=$(ANDROID_STUDIO_PATH) pnpm cap:open

# Builds a signed release .aab for Play Store submission. Needs ANDROID_KEYSTORE_PROPERTIES in .env
# pointing at a keystore.properties (storeFile/storePassword/keyAlias/keyPassword — see
# frontend/apps/app/android/app/build.gradle) with its .jks sitting alongside it under the same
# basename as storeFile's. Both get symlinked into place (gitignored) each run so they stay in sync
# if either file moves.
android-release:
	@test -n "$(ANDROID_KEYSTORE_PROPERTIES)" || (echo "✗ ANDROID_KEYSTORE_PROPERTIES not found in .env (see .env.example)" && exit 1)
	@test -f "$(ANDROID_KEYSTORE_PROPERTIES)" || (echo "✗ $(ANDROID_KEYSTORE_PROPERTIES) does not exist" && exit 1)
	@ln -sf "$(ANDROID_KEYSTORE_PROPERTIES)" frontend/apps/app/android/keystore.properties
	@STORE_FILE=$$(grep -E '^storeFile=' "$(ANDROID_KEYSTORE_PROPERTIES)" | cut -d'=' -f2-); \
	KEYSTORE_DIR=$$(dirname "$(ANDROID_KEYSTORE_PROPERTIES)"); \
	mkdir -p "frontend/apps/app/android/$$(dirname "$$STORE_FILE")"; \
	ln -sf "$$KEYSTORE_DIR/$$(basename "$$STORE_FILE")" "frontend/apps/app/android/$$STORE_FILE"
	@echo "Building web bundle and syncing Android shell..."
	@cd frontend/apps/app && pnpm cap:sync
	@echo "Building signed release bundle..."
	@cd frontend/apps/app/android && ./gradlew bundleRelease
	@echo "✓ Signed AAB at frontend/apps/app/android/app/build/outputs/bundle/release/app-release.aab"

# Bumps apps/app's version by VERSION=patch|minor|major (applied to the current version, not an
# explicit X.Y.Z); MSG="..." adds a matching changelogData.ts entry - required for minor/major, skip
# it for a patch-only bump (see "Versioning & patch notes" in CLAUDE.md). ANDROID=patch|minor|major
# also bumps the native shell's versionName/versionCode, on its own independent track. VERSION can be
# omitted for an Android-only bump (MSG requires VERSION - a changelog entry is tied to the web
# version it shipped in).
patch:
	@test -n "$(VERSION)$(ANDROID)" || (echo "✗ Usage: make patch [VERSION=patch|minor|major] [MSG=\"description\"] [ANDROID=patch|minor|major] (need at least one of VERSION/ANDROID)" && exit 1)
	@cd frontend && node scripts/write-patch-note.mjs$(if $(VERSION), --version="$(VERSION)")$(if $(MSG), --message="$(MSG)")$(if $(ANDROID), --android="$(ANDROID)")
