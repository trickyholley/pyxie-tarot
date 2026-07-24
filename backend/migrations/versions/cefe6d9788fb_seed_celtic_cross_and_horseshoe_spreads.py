"""seed celtic cross and horseshoe spreads

Revision ID: cefe6d9788fb
Revises: de6b9c59c68a
Create Date: 2026-07-23 19:49:29.759946

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "cefe6d9788fb"
down_revision: Union[str, Sequence[str], None] = "de6b9c59c68a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

spreads_table = sa.table(
    "spreads",
    sa.column("id", sa.UUID()),
    sa.column("name", sa.Text()),
    sa.column("description", sa.Text()),
    sa.column("num_cards", sa.Integer()),
    sa.column("positions", postgresql.JSONB()),
    sa.column("prompts", postgresql.JSONB()),
)

DEFAULT_SPREAD_IDS = [
    "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a01",
    "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a02",
    "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a03",
    "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a04",
    "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a05",
]

NEW_SPREAD_IDS = [
    "1f0f6a66-ffc8-43b7-af01-87cbe0d2f09d",
    "bead2a76-5ed5-4321-b143-9ed892d3174c",
]

NEW_SPREADS = [
    {
        "id": NEW_SPREAD_IDS[0],
        "name": "Celtic Cross",
        "description": "The classic ten-card spread for a deep, wide-angle reading of a situation.",
        "num_cards": 10,
        "positions": [
            {"index": 0, "label": "Present/Situation", "x": 0.35, "y": 0.55, "rotation": 0.0},
            {"index": 1, "label": "Challenge", "x": 0.35, "y": 0.55, "rotation": 90.0},
            {"index": 2, "label": "Foundation", "x": 0.35, "y": 0.78, "rotation": 0.0},
            {"index": 3, "label": "Recent Past", "x": 0.15, "y": 0.55, "rotation": 0.0},
            {"index": 4, "label": "Crown/Best Outcome", "x": 0.35, "y": 0.30, "rotation": 0.0},
            {"index": 5, "label": "Near Future", "x": 0.55, "y": 0.55, "rotation": 0.0},
            {"index": 6, "label": "Self/Stance", "x": 0.80, "y": 0.85, "rotation": 0.0},
            {"index": 7, "label": "Environment", "x": 0.80, "y": 0.63, "rotation": 0.0},
            {"index": 8, "label": "Hopes and Fears", "x": 0.80, "y": 0.41, "rotation": 0.0},
            {"index": 9, "label": "Final Outcome", "x": 0.80, "y": 0.19, "rotation": 0.0},
        ],
        "prompts": [
            "How does the crossing challenge card change your read of the present card?",
            "Does the recent past card still feel active, or has it faded?",
            "Is the crown card an outcome you're actively working toward?",
            "What does the foundation card reveal about how you got here?",
            "How does your stance (self) card compare to how you'd like to show up?",
            "What in the environment feels outside your control right now?",
            "Do the hopes and fears cards point in the same direction, or opposite ones?",
            "Does the final outcome feel earned given everything else in the spread?",
        ],
    },
    {
        "id": NEW_SPREAD_IDS[1],
        "name": "Horseshoe",
        "description": "A seven-card arc spread tracing a situation from its past causes through to its likely outcome.",
        "num_cards": 7,
        "positions": [
            {"index": 0, "label": "Past", "x": 0.1, "y": 0.6, "rotation": 0.0},
            {"index": 1, "label": "Present", "x": 0.2333, "y": 0.425, "rotation": 0.0},
            {"index": 2, "label": "Hidden Influences", "x": 0.3667, "y": 0.2969, "rotation": 0.0},
            {"index": 3, "label": "Obstacles", "x": 0.5, "y": 0.25, "rotation": 0.0},
            {"index": 4, "label": "External Influences", "x": 0.6333, "y": 0.2969, "rotation": 0.0},
            {"index": 5, "label": "Advice", "x": 0.7667, "y": 0.425, "rotation": 0.0},
            {"index": 6, "label": "Likely Outcome", "x": 0.9, "y": 0.6, "rotation": 0.0},
        ],
        "prompts": [
            "How do the hidden influences change your understanding of the present card?",
            "Which obstacle feels most within your power to address?",
            "Is the external influences card something you can act on, or just something to accept?",
            "Are you willing to take the advice card's suggestion?",
            "Does the likely outcome feel fixed, or does the advice card offer a way to shift it?",
        ],
    },
]


def _grid_backfill(positions: list[dict]) -> list[dict]:
    return [
        {
            **position,
            "x": 0.2 + (position["index"] % 3) * 0.3,
            "y": 0.2 + (position["index"] // 3) * 0.3,
            "rotation": 0.0,
        }
        for position in positions
    ]


def _strip_coordinates(positions: list[dict]) -> list[dict]:
    return [{"index": position["index"], "label": position["label"]} for position in positions]


def upgrade() -> None:
    """Upgrade schema."""
    op.bulk_insert(spreads_table, NEW_SPREADS)

    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, positions FROM spreads WHERE id IN :ids").bindparams(sa.bindparam("ids", expanding=True)),
        {"ids": DEFAULT_SPREAD_IDS},
    ).fetchall()
    update_stmt = sa.text("UPDATE spreads SET positions = :positions WHERE id = :id").bindparams(
        sa.bindparam("positions", type_=postgresql.JSONB)
    )
    for row_id, positions in rows:
        conn.execute(update_stmt, {"positions": _grid_backfill(positions), "id": row_id})


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, positions FROM spreads WHERE id IN :ids").bindparams(sa.bindparam("ids", expanding=True)),
        {"ids": DEFAULT_SPREAD_IDS},
    ).fetchall()
    update_stmt = sa.text("UPDATE spreads SET positions = :positions WHERE id = :id").bindparams(
        sa.bindparam("positions", type_=postgresql.JSONB)
    )
    for row_id, positions in rows:
        conn.execute(update_stmt, {"positions": _strip_coordinates(positions), "id": row_id})

    op.execute(spreads_table.delete().where(spreads_table.c.id.in_(NEW_SPREAD_IDS)))
