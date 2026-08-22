#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Ensure newly added .py/.ts(x)/.js(x) files carry an SPDX license header, inserting one if absent."""

import subprocess
import sys

SPDX_LINE = "SPDX-License-Identifier: AGPL-3.0-or-later"
HEADER_LINES_TO_CHECK = 5

COMMENT_PREFIX = {
    ".py": "#",
    ".ts": "//",
    ".tsx": "//",
    ".js": "//",
    ".jsx": "//",
}


def added_files() -> set[str]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=A"],
        capture_output=True,
        text=True,
        check=True,
    )
    return set(result.stdout.splitlines())


def has_header(lines: list[str]) -> bool:
    return any(SPDX_LINE in line for line in lines[:HEADER_LINES_TO_CHECK])


def insert_header(path: str, prefix: str) -> None:
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    header = f"{prefix} {SPDX_LINE}\n"
    # A shebang must stay on line 1, so the header goes right after it instead of above it.
    insert_at = 1 if lines and lines[0].startswith("#!") else 0
    lines.insert(insert_at, header)

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def main(argv: list[str]) -> int:
    new_files = added_files()
    fixed = []

    for path in argv:
        if path not in new_files:
            continue
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
        if has_header(lines):
            continue
        ext = "." + path.rsplit(".", 1)[-1]
        insert_header(path, COMMENT_PREFIX.get(ext, "#"))
        fixed.append(path)

    if not fixed:
        return 0

    print(f"Added missing license header ({SPDX_LINE}) to new file(s) - re-stage and commit again:")
    for path in fixed:
        print(f"  {path}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
