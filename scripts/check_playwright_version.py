#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Ensure the E2E CI container image tag matches frontend/e2e's locked @playwright/test version.

Mirrors the "Verify Playwright version matches container image" step in .github/workflows/e2e.yml
- a mismatch there fails CI with a confusing "browser not found" error rather than an obvious
version diff, so this catches it at commit time instead.
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LOCKFILE = REPO_ROOT / "frontend" / "pnpm-lock.yaml"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "e2e.yml"

LOCKED_VERSION_RE = re.compile(r"^\s*'@playwright/test@([0-9.]+)':", re.MULTILINE)
IMAGE_TAG_RE = re.compile(r"image:\s*mcr\.microsoft\.com/playwright:v([0-9.]+)-noble")


def locked_version() -> str:
    match = LOCKED_VERSION_RE.search(LOCKFILE.read_text(encoding="utf-8"))
    if not match:
        print(f"Couldn't find a locked @playwright/test version in {LOCKFILE}")
        sys.exit(1)
    return match.group(1)


def image_tag_version() -> str:
    match = IMAGE_TAG_RE.search(WORKFLOW.read_text(encoding="utf-8"))
    if not match:
        print(f"Couldn't find the Playwright container image tag in {WORKFLOW}")
        sys.exit(1)
    return match.group(1)


def main() -> int:
    locked, image = locked_version(), image_tag_version()
    if locked != image:
        print(
            f"frontend/e2e's locked @playwright/test is {locked}, but {WORKFLOW.relative_to(REPO_ROOT)} "
            f"is pinned to mcr.microsoft.com/playwright:v{image}-noble - bump the image tag to match."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
