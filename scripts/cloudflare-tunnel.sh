#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# CLAUDE: shared by the Makefile's `tunnel`/`tunnel-webhook` targets and backend/app/dev_polar_tunnel.py,
# so the actual cloudflared invocation exists in exactly one place instead of being duplicated across a
# Makefile recipe and a Python subprocess argv list. `--network host` (Linux-only) lets the container
# reach 127.0.0.1:$1 directly, since our dev servers bind to loopback only.
set -eu
exec docker run --rm --network host cloudflare/cloudflared:latest tunnel --url "http://localhost:$1"
