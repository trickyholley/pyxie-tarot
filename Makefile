.PHONY: dev dev-backend dev-frontend install install-root install-backend install-frontend clean db-restore db-seed db-migrate db-upgrade db-downgrade db-history

DB_URL := $(shell grep -E '^DATABASE_URL=' backend/.env 2>/dev/null | cut -d'=' -f2- | sed 's/postgresql+[^:]*:/postgresql:/')

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
	@cd backend && uv run python -m app.seed
	@echo "✓ Database restored"

db-seed:
	@cd backend && uv run python -m app.seed
	@echo "✓ Seed data reloaded"

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
