# SPDX-License-Identifier: AGPL-3.0-or-later
"""CLAUDE: Dev-only: starts an ad-hoc Cloudflare tunnel to the local backend and points the Polar
sandbox org's `pyxie-tarot-dev-tunnel` webhook endpoint at the freshly-assigned URL automatically - see
the vault's "Supporter subscription plan (issue 79)" note for why this exists. Without it, every tunnel
restart (a new trycloudflare.com URL each time) needs a manual dashboard/curl update before Polar can
reach the endpoint again.

Refuses to run unless POLAR_API_BASE_URL is exactly the known sandbox URL - this rewrites a webhook
endpoint's URL programmatically, and that must never happen to a live org by accident.

Usage: `make tunnel-webhook` (from repo root), or `uv run python -m app.dev_polar_tunnel [port]`
directly from backend/. Defaults to port 8000.
"""

import contextlib
import re
import subprocess
import sys
from pathlib import Path

import httpx

from app.config import settings

_SANDBOX_API_BASE_URL = "https://sandbox-api.polar.sh"
_ENDPOINT_NAME = "pyxie-tarot-dev-tunnel"
_TUNNEL_URL_PATTERN = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
_TUNNEL_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "cloudflare-tunnel.sh"


def _find_endpoint(client: httpx.Client) -> dict:
    """CLAUDE: Finds the sandbox org's `_ENDPOINT_NAME` webhook endpoint, paging through all of them (the API
    caps a single page at 100). Raises loudly on zero or multiple matches - a silent no-op here would
    leave a developer believing the tunnel is wired up to Polar when it isn't.
    """
    matches: list[dict] = []
    page = 1
    while True:
        response = client.get("/v1/webhooks/endpoints", params={"limit": 100, "page": page})
        response.raise_for_status()
        body = response.json()
        matches.extend(item for item in body["items"] if item["name"] == _ENDPOINT_NAME)
        if page >= body["pagination"]["max_page"]:
            break
        page += 1

    if len(matches) != 1:
        raise RuntimeError(
            f"Expected exactly one '{_ENDPOINT_NAME}' webhook endpoint, found {len(matches)} - "
            "update it manually in the Polar dashboard."
        )
    return matches[0]


def _update_webhook_endpoint(tunnel_url: str) -> None:
    webhook_url = f"{tunnel_url}/api/v1/billing/webhook"
    headers = {"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"}
    with httpx.Client(base_url=settings.POLAR_API_BASE_URL, headers=headers, timeout=10) as client:
        endpoint = _find_endpoint(client)
        patch_response = client.patch(f"/v1/webhooks/endpoints/{endpoint['id']}", json={"url": webhook_url})
        patch_response.raise_for_status()
        print(f"\n✓ Polar sandbox webhook endpoint '{_ENDPOINT_NAME}' now points at {webhook_url}\n")


def main() -> None:
    if settings.POLAR_API_BASE_URL != _SANDBOX_API_BASE_URL:
        print(f"Refusing to run: POLAR_API_BASE_URL must be exactly {_SANDBOX_API_BASE_URL!r}.", file=sys.stderr)
        sys.exit(1)
    if not settings.POLAR_ACCESS_TOKEN:
        print("Refusing to run: POLAR_ACCESS_TOKEN is not set.", file=sys.stderr)
        sys.exit(1)

    port = sys.argv[1] if len(sys.argv) > 1 else "8000"
    process = subprocess.Popen(  # noqa: S603 - fixed argv, dev-only tooling
        [str(_TUNNEL_SCRIPT), port],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    try:
        for line in process.stdout:
            print(line, end="")
            match = _TUNNEL_URL_PATTERN.search(line)
            if match:
                _update_webhook_endpoint(match.group(0))
                break
        process.wait()
    finally:
        # CLAUDE: reached on a clean tunnel exit (process already finished, terminate()/wait() are
        # no-ops), on Ctrl-C, or on any exception from _update_webhook_endpoint (e.g. Polar API error) -
        # in every case the docker container must not outlive this script.
        process.terminate()
        process.wait()


if __name__ == "__main__":
    # main()'s `finally` already terminates the tunnel on Ctrl-C - just suppress the traceback here.
    with contextlib.suppress(KeyboardInterrupt):
        main()
