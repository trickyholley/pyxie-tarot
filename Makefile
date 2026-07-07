.PHONY: dev dev-backend dev-frontend install install-root install-backend install-frontend clean db-dump db-restore db-seed db-reset

DB_URL := $(shell grep -E '^DATABASE_URL=' backend/.env 2>/dev/null | cut -d'=' -f2- | sed 's/postgresql+[^:]*:/postgresql:/')

clean:
	@echo "Cleaning up..."
	@rm -rf node_modules
	@cd backend && make clean
	@cd frontend && rm -rf node_modules dist || true
	@pre-commit clean 2>/dev/null || true

db-dump:
	@test -n "$(DB_URL)" || (echo "✗ DATABASE_URL not found in backend/.env" && exit 1)
	@mkdir -p database
	@pg_dump --schema-only --no-owner --no-privileges "$(DB_URL)" > database/schema.sql
	@pg_dump --data-only --no-owner --no-privileges --column-inserts "$(DB_URL)" > database/seed.sql
	@echo "✓ Schema → database/schema.sql"
	@echo "✓ Seed   → database/seed.sql"

db-restore:
	@test -n "$(DB_URL)" || (echo "✗ DATABASE_URL not found in backend/.env" && exit 1)
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 \
		-c "DROP SCHEMA IF EXISTS public CASCADE;" \
		-c "CREATE SCHEMA public;" \
		-f database/schema.sql
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 \
		-f database/seed.sql
	@echo "✓ Database restored"

db-seed:
	@test -n "$(DB_URL)" || (echo "✗ DATABASE_URL not found in backend/.env" && exit 1)
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 \
		-c "TRUNCATE public.alembic_version, public.spreads, public.users CASCADE;" \
		-f database/seed.sql
	@echo "✓ Seed data reloaded"

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
	@echo "Starting frontend development server..."
	@cd frontend && npm run dev

install: install-root install-backend install-frontend

install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && make install

install-frontend:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

install-root:
	@echo "Installing root dependencies..."
	@npm install
	@pipx install pre-commit 2>/dev/null || pip install pre-commit
	@pre-commit install
