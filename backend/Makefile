.PHONY: dev clean install test lint

# Optional - only needed for AWS-backed local testing (e.g. issue #146's diary-photo upload against
# AWS_S3_DIARY_PHOTOS_BUCKET). Read from the invoking shell's own profile export isn't reliable - not
# every terminal/tool that can run `make dev` sources the shell rc file that would set it. Reads the
# *root* .env (not backend/.env, which app/config.py's Settings model strictly validates and would
# reject this key from).
AWS_PROFILE := $(shell grep -E '^AWS_PROFILE=' ../.env 2>/dev/null | cut -d'=' -f2-)

dev:
	@$(if $(AWS_PROFILE),AWS_PROFILE=$(AWS_PROFILE)) uv run uvicorn app.main:app --reload

test:
	@uv run pytest

lint:
	@uv run ruff check .
	@uv run ruff format --check .

clean:
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name '*.egg-info' -exec rm -rf {} + 2>/dev/null || true
	@rm -rf .pytest_cache dist build .venv

install:
	@uv sync
