"""CI guard against migrations that could break the currently-running app.

The deploy workflow runs `alembic upgrade head` against the freshly-built
image *before* swapping the container over (see .github/workflows/backend.yml),
so there's a window where the old code is still serving requests against the
new schema. That's safe for additive changes but not for anything the old
code still relies on - dropping/renaming a column, or changing its type.

This only looks at `upgrade()` (what the deploy actually runs) in migration
files added by the current PR - existing migrations already shipped safely.
A genuinely intentional breaking change (e.g. the contract half of an
already-expanded column) can opt out with `# migration-guard: allow` on the
same line.
"""

import re
import sys

UNCONDITIONAL_RISKY_CALLS = ("op.drop_column(", "op.drop_table(", "op.rename_column(")
ESCAPE_HATCH = "# migration-guard: allow"


def find_upgrade_body(lines: list[str]) -> list[tuple[int, str]]:
    """Return (line_number, text) pairs for the body of upgrade(), 1-indexed."""
    start = next((i for i, line in enumerate(lines) if re.match(r"def upgrade\(", line.strip())), None)
    if start is None:
        return []
    end = next(
        (i for i, line in enumerate(lines) if i > start and re.match(r"def \w+\(", line.strip())),
        len(lines),
    )
    return [(i + 1, lines[i]) for i in range(start + 1, end)]


def check_file(path: str) -> list[str]:
    with open(path) as f:
        lines = f.read().splitlines()

    violations = []
    for line_no, line in find_upgrade_body(lines):
        if ESCAPE_HATCH in line:
            continue
        # alter_column only flagged for actual type changes - server_default/
        # nullable tweaks etc. aren't what old code breaks on.
        is_risky = any(call in line for call in UNCONDITIONAL_RISKY_CALLS) or (
            "op.alter_column(" in line and "type_=" in line
        )
        if is_risky:
            violations.append(f"{path}:{line_no}: {line.strip()}")
    return violations


def main(paths: list[str]) -> int:
    all_violations = [v for path in paths for v in check_file(path)]
    if not all_violations:
        return 0

    print("Potentially breaking schema change(s) in upgrade() - the old code is still")
    print("serving requests when this runs, before the new container swaps in:\n")
    for v in all_violations:
        print(f"  {v}")
    print(
        "\nIf this is genuinely safe (e.g. the contract half of an already-expanded "
        f"column), add `{ESCAPE_HATCH}` on the line."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
