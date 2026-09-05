#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Ensure no draft `CLAUDE `-prefixed doc/comment/locale string reaches code (CLAUDE.md's "Docs,
comments, locales" section) - only markdown docs like CLAUDE.md itself are meant to carry that
marker permanently."""

import sys

MARKER = "CLAUDE: "


def main(argv: list[str]) -> int:
    hits: list[tuple[str, int, str]] = []
    for path in argv:
        try:
            with open(path, encoding="utf-8") as f:
                lines = f.readlines()
        except (FileNotFoundError, UnicodeDecodeError):
            continue
        for lineno, line in enumerate(lines, start=1):
            if MARKER in line:
                hits.append((path, lineno, line.strip()))

    if not hits:
        return 0

    print(f"Found unfinished '{MARKER}'-prefixed string(s) - a human still needs to write the real copy:")
    for path, lineno, line in hits:
        print(f"  {path}:{lineno}: {line}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
