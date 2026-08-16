# SPDX-License-Identifier: AGPL-3.0-or-later
import time

from fastapi import HTTPException, Request, status

# In-memory sliding-window counters, keyed by "{scope}:{key}" (see check_rate_limit). Fine for the
# app's single backend instance (infra/docker-compose.yml runs one `backend` container, no replicas) -
# switch to a Redis-backed store first if that ever changes, since counts wouldn't be shared across hosts.
_attempts: dict[str, list[float]] = {}
# Longest window any call site uses; entries idle past this are swept once _attempts grows large, so a
# scan across many distinct keys (e.g. an attacker rotating IPs) can't grow this dict unboundedly.
_SWEEP_MAX_AGE_SECONDS = 3600
_SWEEP_THRESHOLD = 5_000


def client_ip(request: Request) -> str:
    """Real client IP behind Caddy's reverse proxy (infra/Caddyfile) — the backend is only reachable
    through Caddy (docker-compose.yml doesn't publish its port), so the *last* X-Forwarded-For entry
    (Caddy's own append) is the trustworthy one; earlier entries could be spoofed by the client itself.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(scope: str, key: str, *, limit: int, window_seconds: int) -> None:
    """Raises 429 once `key` has made `limit` calls under `scope` within `window_seconds`; otherwise
    records this call. Call before doing any real work, so bots pay for the check up front.
    """
    bucket_key = f"{scope}:{key}"
    now = time.monotonic()
    cutoff = now - window_seconds
    attempts = [t for t in _attempts.get(bucket_key, []) if t >= cutoff]

    if len(attempts) >= limit:
        _attempts[bucket_key] = attempts
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Try again later.")

    attempts.append(now)
    _attempts[bucket_key] = attempts

    if len(_attempts) > _SWEEP_THRESHOLD:
        stale_cutoff = now - _SWEEP_MAX_AGE_SECONDS
        for stale_key in [k for k, ts in _attempts.items() if not ts or ts[-1] < stale_cutoff]:
            del _attempts[stale_key]
