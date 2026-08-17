# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio

import pytest
from fastapi import HTTPException, Request, status

from app.core.rate_limit import check_rate_limit, check_rate_limits, client_ip


def _request(headers: dict[str, str] | None = None, client_host: str | None = "1.2.3.4") -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": (client_host, 12345) if client_host else None,
    }
    return Request(scope)


def test_client_ip_uses_last_x_forwarded_for_entry():
    # Caddy appends the real client IP last; anything earlier could be spoofed by the client itself.
    request = _request(headers={"x-forwarded-for": "spoofed, 9.9.9.9"})

    assert client_ip(request) == "9.9.9.9"


def test_client_ip_falls_back_to_request_client_host():
    request = _request(client_host="5.6.7.8")

    assert client_ip(request) == "5.6.7.8"


async def test_check_rate_limit_allows_up_to_limit_then_rejects():
    for _ in range(5):
        await check_rate_limit("test-scope", "key-a", limit=5, window_seconds=60)

    with pytest.raises(HTTPException) as exc_info:
        await check_rate_limit("test-scope", "key-a", limit=5, window_seconds=60)

    assert exc_info.value.status_code == 429


async def test_check_rate_limit_scopes_are_independent():
    for _ in range(5):
        await check_rate_limit("scope-one", "same-key", limit=5, window_seconds=60)

    # A different scope with the same key has its own counter.
    await check_rate_limit("scope-two", "same-key", limit=5, window_seconds=60)


async def test_check_rate_limit_keys_are_independent():
    for _ in range(5):
        await check_rate_limit("test-scope", "key-b", limit=5, window_seconds=60)

    await check_rate_limit("test-scope", "key-c", limit=5, window_seconds=60)


async def test_check_rate_limit_resets_after_window_expires():
    # Real Redis TTL, not mockable via time.monotonic like the old in-memory version - a short real
    # window plus a real sleep is the only way to observe expiry.
    for _ in range(3):
        await check_rate_limit("expiring-scope", "key-d", limit=3, window_seconds=1)

    await asyncio.sleep(1.1)

    await check_rate_limit("expiring-scope", "key-d", limit=3, window_seconds=1)


async def test_check_rate_limits_still_records_every_check_when_one_rejects():
    # asyncio.gather runs every check concurrently rather than short-circuiting at the first
    # rejection, so a check later in the list still gets recorded even though the overall call raises.
    for _ in range(3):
        await check_rate_limit("gather-scope-a", "key-e", limit=3, window_seconds=60)

    with pytest.raises(HTTPException):
        await check_rate_limits(
            check_rate_limit("gather-scope-a", "key-e", limit=3, window_seconds=60),
            check_rate_limit("gather-scope-b", "key-e", limit=3, window_seconds=60),
        )

    # gather-scope-b's counter was incremented by the call above despite gather-scope-a rejecting -
    # two more calls now trip its own limit of 3.
    for _ in range(2):
        await check_rate_limit("gather-scope-b", "key-e", limit=3, window_seconds=60)
    with pytest.raises(HTTPException):
        await check_rate_limit("gather-scope-b", "key-e", limit=3, window_seconds=60)


async def test_check_rate_limits_raises_first_in_list_not_first_completed():
    # Results are walked in list order, not completion order, so a later check finishing first
    # doesn't preempt an earlier one's exception.
    async def fails_slow():
        await asyncio.sleep(0.05)
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="first")

    async def fails_fast():
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="second")

    with pytest.raises(HTTPException) as exc_info:
        await check_rate_limits(fails_slow(), fails_fast())

    assert exc_info.value.detail == "first"
