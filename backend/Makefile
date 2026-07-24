.PHONY: dev clean install test

dev:
	@uv run uvicorn app.main:app --reload

test:
	@uv run pytest

clean:
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name '*.egg-info' -exec rm -rf {} + 2>/dev/null || true
	@rm -rf .pytest_cache dist build .venv

install:
	@uv sync
