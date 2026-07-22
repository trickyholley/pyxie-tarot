"""seed default spreads

Revision ID: 50c35f23e344
Revises: ba2e3a00c036
Create Date: 2026-07-22 18:43:09.257001

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "50c35f23e344"
down_revision: Union[str, Sequence[str], None] = "ba2e3a00c036"
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

DEFAULT_SPREADS = [
    {
        "id": DEFAULT_SPREAD_IDS[0],
        "name": "Single Card",
        "description": "A single card for quick daily guidance.",
        "num_cards": 1,
        "positions": [{"index": 4, "label": "Today's Guidance"}],
        "prompts": [
            "What does this card mean to you right now?",
            "What action is it nudging you toward?",
            "Did it confirm something you already suspected?",
        ],
    },
    {
        "id": DEFAULT_SPREAD_IDS[1],
        "name": "Past, Present, Future",
        "description": "A classic three-card spread tracing how your past leads into today and where it's heading.",
        "num_cards": 3,
        "positions": [
            {"index": 3, "label": "Past"},
            {"index": 4, "label": "Present"},
            {"index": 5, "label": "Future"},
        ],
        "prompts": [
            "How does the past card explain your current situation?",
            "What surprised you about the present card?",
            "Does the future card feel fixed or changeable?",
            "What would need to shift to change that outcome?",
            "How do the three work together as a story?",
        ],
    },
    {
        "id": DEFAULT_SPREAD_IDS[2],
        "name": "Situation, Action, Outcome",
        "description": "A three-card spread focused on a specific decision: where you stand, what to do, and "
        "where it leads.",
        "num_cards": 3,
        "positions": [
            {"index": 1, "label": "Situation"},
            {"index": 4, "label": "Action"},
            {"index": 7, "label": "Outcome"},
        ],
        "prompts": [
            "How accurately does the situation card capture where you are?",
            "Are you willing to take the suggested action?",
            "What's stopping you?",
            "Does the outcome feel earned or dependent on the action?",
            "What's one small step you could take today?",
        ],
    },
    {
        "id": DEFAULT_SPREAD_IDS[3],
        "name": "Five Card Cross",
        "description": "A cross-shaped spread examining the present situation alongside its foundation, goal, past, "
        "and future.",
        "num_cards": 5,
        "positions": [
            {"index": 1, "label": "Goal"},
            {"index": 3, "label": "Past"},
            {"index": 4, "label": "Present"},
            {"index": 5, "label": "Future"},
            {"index": 7, "label": "Foundation"},
        ],
        "prompts": [
            "What ties the past and future cards together?",
            "How does the foundation card show up day-to-day?",
            "Is the goal card something you're actively working toward?",
            "What in the present feels most urgent?",
            "If you acted on only one card today, which and why?",
            "What did this spread reveal that you didn't expect?",
        ],
    },
    {
        "id": DEFAULT_SPREAD_IDS[4],
        "name": "Mind, Body, Spirit Grid",
        "description": "A full 3x3 grid crossing three time periods (past, present, future) with three areas of "
        "life (mind, body, spirit).",
        "num_cards": 9,
        "positions": [
            {"index": 0, "label": "Past - Mind"},
            {"index": 1, "label": "Past - Body"},
            {"index": 2, "label": "Past - Spirit"},
            {"index": 3, "label": "Present - Mind"},
            {"index": 4, "label": "Present - Body"},
            {"index": 5, "label": "Present - Spirit"},
            {"index": 6, "label": "Future - Mind"},
            {"index": 7, "label": "Future - Body"},
            {"index": 8, "label": "Future - Spirit"},
        ],
        "prompts": [
            "Which area feels most in need of attention right now?",
            "How does your past in one area affect your present in another?",
            "What pattern repeats across all three time periods?",
            "Which future card feels most within your control?",
            "Is one column more resolved than the others?",
            "What's the single biggest theme across all nine?",
            "Which card would you want to revisit later?",
            "Did any card contradict what you expected for that area?",
            "What's one small change you could make in the present row this week?",
            "How do mind, body, and spirit currently support or conflict with each other?",
        ],
    },
]


def upgrade() -> None:
    """Upgrade schema."""
    op.bulk_insert(spreads_table, DEFAULT_SPREADS)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(spreads_table.delete().where(spreads_table.c.id.in_(DEFAULT_SPREAD_IDS)))
