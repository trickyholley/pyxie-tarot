#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# CLAUDE: invoked by backend/app/dev_polar_tunnel.py (behind the Makefile's `polar` target), so
# the actual cloudflared invocation exists in exactly one place rather than being duplicated between a
# Makefile recipe and a Python subprocess argv list. `--network host` (Linux-only) lets the container
# reach 127.0.0.1:$1 directly, since our dev servers bind to loopback only.
#
# Also callable directly - `scripts/cloudflare-tunnel.sh 5173` - for a one-off tunnel to some other port.
# Prefer `make polar` for anything Polar: it repoints the sandbox webhook endpoint at the fresh
# URL, which this script alone does not do.
set -eu
exec docker run --rm --network host cloudflare/cloudflared:latest tunnel --url "http://localhost:$1"
