import pytest
from pydantic import ValidationError

from app.schemas.spread import SpreadCreate, SpreadPosition, SpreadUpdate


def test_valid_spread_create():
    spread = SpreadCreate(
        name="Past, Present, Future",
        positions=[
            {"index": 3, "label": "Past", "x": 0.2, "y": 0.5},
            {"index": 4, "label": "Present", "x": 0.5, "y": 0.5},
            {"index": 5, "label": "Future", "x": 0.8, "y": 0.5},
        ],
        prompts=["What surprised you?"],
    )
    assert len(spread.positions) == 3
    assert spread.allow_reversed is True


def test_spread_create_allow_reversed_can_be_disabled():
    spread = SpreadCreate(
        name="Upright Only",
        positions=[{"index": 4, "label": "Center", "x": 0.5, "y": 0.5}],
        allow_reversed=False,
    )
    assert spread.allow_reversed is False


def test_duplicate_position_indices_rejected():
    with pytest.raises(ValidationError, match="unique"):
        SpreadCreate(
            name="Broken Spread",
            positions=[
                {"index": 4, "label": "A", "x": 0.5, "y": 0.5},
                {"index": 4, "label": "B", "x": 0.6, "y": 0.6},
            ],
        )


def test_position_index_out_of_grid_rejected():
    with pytest.raises(ValidationError):
        SpreadPosition(index=13, label="Out of range", x=0.5, y=0.5)


def test_position_label_required():
    with pytest.raises(ValidationError):
        SpreadPosition(index=0, label="", x=0.5, y=0.5)


def test_position_rotation_out_of_range_rejected():
    with pytest.raises(ValidationError):
        SpreadPosition(index=0, label="Crossed", x=0.5, y=0.5, rotation=200.0)


def test_position_rotation_defaults_to_zero():
    position = SpreadPosition(index=0, label="Center", x=0.5, y=0.5)
    assert position.rotation == 0.0


def test_position_rotation_can_be_set():
    position = SpreadPosition(index=1, label="Challenge", x=0.35, y=0.55, rotation=90.0)
    assert position.rotation == 90.0


def test_more_than_thirteen_positions_rejected():
    with pytest.raises(ValidationError):
        SpreadCreate(
            name="Too Many Cards",
            positions=[{"index": i, "label": str(i), "x": 0.5, "y": 0.5} for i in range(13)]
            + [{"index": 0, "label": "extra", "x": 0.5, "y": 0.5}],
        )


def test_more_than_ten_prompts_rejected():
    with pytest.raises(ValidationError):
        SpreadCreate(
            name="Too Many Prompts",
            positions=[{"index": 4, "label": "Center", "x": 0.5, "y": 0.5}],
            prompts=[f"Question {i}?" for i in range(11)],
        )


def test_empty_prompt_rejected():
    with pytest.raises(ValidationError):
        SpreadCreate(
            name="Blank Prompt",
            positions=[{"index": 4, "label": "Center", "x": 0.5, "y": 0.5}],
            prompts=[""],
        )


def test_update_allows_omitting_positions():
    update = SpreadUpdate(name="Renamed Spread")
    assert update.positions is None


def test_update_rejects_duplicate_position_indices():
    with pytest.raises(ValidationError, match="unique"):
        SpreadUpdate(
            positions=[
                {"index": 2, "label": "A", "x": 0.5, "y": 0.5},
                {"index": 2, "label": "B", "x": 0.6, "y": 0.6},
            ]
        )
