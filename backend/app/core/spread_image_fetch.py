# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio
import io
import ipaddress
from urllib.parse import urlparse

import httpx
from PIL import Image, UnidentifiedImageError

IMAGE_FETCH_TIMEOUT = 5.0
MAX_IMAGE_BYTES = 8 * 1024 * 1024


async def _is_public_host(hostname: str) -> bool:
    """Resolves `hostname` and rejects it if any address it resolves to is non-public - the only line
    of defense against a deck's `image_url` pointing at an internal/loopback/link-local address (SSRF).
    A residual DNS-rebinding gap remains (the host could resolve differently by the time `httpx` actually
    connects moments later); acceptable for now since `image_url` is admin-only input, not attacker-supplied.
    """
    try:
        addr_infos = await asyncio.get_running_loop().getaddrinfo(hostname, None)
    except OSError:
        return False

    return bool(addr_infos) and all(
        not (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
        for ip in (ipaddress.ip_address(addr_info[4][0]) for addr_info in addr_infos)
    )


async def fetch_card_image(url: str, client: httpx.AsyncClient) -> bytes | None:
    """Best-effort fetch of one card's art for PDF embedding - any failure (unsafe host, timeout, oversized,
    undecodable) returns `None` rather than raising, so a bad image degrades that card to a text-only
    placeholder instead of failing the whole export (mirrors the frontend's `useCardArt.ts` philosophy).
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None
    if not await _is_public_host(parsed.hostname):
        return None

    try:
        # httpx defaults to not following redirects - a redirect response is treated as "no image"
        # rather than chased, closing the classic redirect-to-internal-host SSRF vector.
        async with client.stream("GET", url, timeout=IMAGE_FETCH_TIMEOUT) as response:
            if response.status_code != httpx.codes.OK:
                return None
            content_length = response.headers.get("content-length")
            if content_length is not None and int(content_length) > MAX_IMAGE_BYTES:
                return None

            chunks = bytearray()
            async for chunk in response.aiter_bytes():
                chunks.extend(chunk)
                if len(chunks) > MAX_IMAGE_BYTES:
                    return None
    except (httpx.HTTPError, OSError):
        return None

    data = bytes(chunks)
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError):
        return None

    return data
