#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# ad-hoc public HTTPS tunnel to a local dev server, e.g. for testing an inbound webhook
# `--network host` (Linux-only) lets the container reach 127.0.0.1:$1 directly,
# since our dev servers bind to loopback only.
set -eu
exec docker run --rm --network host cloudflare/cloudflared:latest tunnel --url "http://localhost:$1"
