#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Ensure newly added .py/.ts(x)/.js(x) files carry an SPDX license header."""

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


def has_header(path: str) -> bool:
    with open(path, encoding="utf-8") as f:
        head = [next(f, "") for _ in range(HEADER_LINES_TO_CHECK)]
    return any(SPDX_LINE in line for line in head)


def main(argv: list[str]) -> int:
    new_files = added_files()
    missing = [path for path in argv if path in new_files and not has_header(path)]

    if not missing:
        return 0

    print(f"Missing license header ({SPDX_LINE}) in new file(s):")
    for path in missing:
        ext = "." + path.rsplit(".", 1)[-1]
        prefix = COMMENT_PREFIX.get(ext, "#")
        print(f"  {path}")
        print(f"    Add near the top: {prefix} {SPDX_LINE}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
