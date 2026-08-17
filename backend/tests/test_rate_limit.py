# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio

import pytest
from fastapi import HTTPException, Request

from app.core.rate_limit import check_rate_limit, client_ip


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
