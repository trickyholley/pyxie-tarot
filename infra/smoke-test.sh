#!/bin/bash
# Functional smoke test against a live backend - checks the app actually works, not just that
# uvicorn is up (a bare `curl /` would pass even with a dead DB or broken auth, see the
# Resend/R2 wiring gaps in AWS migration plan.md). Run after every deploy (backend.yml) and on
# a schedule independent of deploys (smoke-test.yml), since not every incident is deploy-
# triggered - see issue #181.
set -euo pipefail

BASE_URL="${1:-https://api.pyxietarot.live}"

health_status=$(curl -s -o /tmp/health-body.json -w "%{http_code}" "${BASE_URL}/health") || {
  echo "::error::/health did not respond at all (backend likely down)"
  exit 1
}
if [ "$health_status" != "200" ] || ! grep -q '"status":"ok"' /tmp/health-body.json; then
  echo "::error::/health returned $health_status: $(cat /tmp/health-body.json)"
  exit 1
fi

# A bad-credentials login still has to round-trip a real query through the full auth stack
# (router -> DB session -> asyncpg -> RDS) to correctly return 401 rather than 500/timeout -
# a stronger check than /health's bare SELECT 1.
login_status=$(curl -s -o /tmp/login-body.json -w "%{http_code}" \
  -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"smoke-test-nonexistent-user","password":"wrong"}')
if [ "$login_status" != "401" ]; then
  echo "::error::/api/v1/auth/login (bad creds) returned $login_status, expected 401: $(cat /tmp/login-body.json)"
  exit 1
fi

echo "Smoke test passed: /health and /api/v1/auth/login both healthy."
