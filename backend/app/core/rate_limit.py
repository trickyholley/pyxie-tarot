# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio
from collections.abc import Coroutine
from typing import Any

from fastapi import HTTPException, Request, status

from app.redis_client import redis_client

_CHECK_AND_INCREMENT_SCRIPT = """
local count = redis.call("INCR", KEYS[1])
if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
"""

_check_and_increment = redis_client.register_script(_CHECK_AND_INCREMENT_SCRIPT)


def client_ip(request: Request) -> str:
    """Real client IP behind Caddy's reverse proxy (infra/Caddyfile) — the backend is only reachable
    through Caddy (docker-compose.yml doesn't publish its port), so the *last* X-Forwarded-For entry
    (Caddy's own append) is the trustworthy one; earlier entries could be spoofed by the client itself.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


async def check_rate_limit(scope: str, key: str, *, limit: int, window_seconds: int) -> None:
    """Raises 429 once `key` has made `limit` calls under `scope` within `window_seconds`; otherwise
    records this call. Call before doing any real work, so bots pay for the check upfront.

    Fixed-window counter in Redis, INCR-then-EXPIRE run atomically via a Lua script (_CHECK_AND_INCREMENT_SCRIPT)
    rather than as separate round trips — closes the gap where a key's TTL could expire between a create-check
    and the following increment, which would otherwise leave a permanently un-expiring key behind.
    One round trip per call regardless of whether the key is new.
    Bursty right at a window boundary (a client can get up to ~2x limit calls straddling one)
    is an acceptable tradeoff for abuse prevention overprecise accounting.
    """
    bucket_key = f"{scope}:{key}"
    count = await _check_and_increment(keys=[bucket_key], args=[window_seconds])

    if count > limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Try again later.")


async def check_rate_limits(*checks: Coroutine[Any, Any, None]) -> None:
    """Runs independent check_rate_limit calls concurrently and raises the first 429 (if any) once all
    have run - each hits a different Redis key, so there's nothing to serialize for, and every check
    still gets recorded even when an earlier one in the list would already reject.
    """
    for result in await asyncio.gather(*checks, return_exceptions=True):
        if isinstance(result, Exception):
            raise result
