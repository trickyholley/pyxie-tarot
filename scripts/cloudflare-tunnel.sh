#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# invoked by backend/app/dev_polar_tunnel.py (behind the Makefile's `polar` target)
# `--network host` (Linux-only) lets the container reach 127.0.0.1:$1 directly,
# since our dev servers bind to loopback only.
set -eu
exec docker run --rm --network host cloudflare/cloudflared:latest tunnel --url "http://localhost:$1"
