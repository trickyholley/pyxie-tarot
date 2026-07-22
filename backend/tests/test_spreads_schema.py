import pytest
from pydantic import ValidationError

from app.schemas.spread import SpreadCreate, SpreadPosition, SpreadUpdate


def test_valid_spread_create():
    spread = SpreadCreate(
        name="Past, Present, Future",
        positions=[{"index": 3, "label": "Past"}, {"index": 4, "label": "Present"}, {"index": 5}],
        prompts=["What surprised you?"],
    )
    assert len(spread.positions) == 3
    assert spread.positions[2].label is None


def test_duplicate_position_indices_rejected():
    with pytest.raises(ValidationError, match="unique"):
        SpreadCreate(
            name="Broken Spread",
            positions=[{"index": 4, "label": "A"}, {"index": 4, "label": "B"}],
        )


def test_position_index_out_of_grid_rejected():
    with pytest.raises(ValidationError):
        SpreadPosition(index=9)


def test_more_than_nine_positions_rejected():
    with pytest.raises(ValidationError):
        SpreadCreate(
            name="Too Many Cards",
            positions=[{"index": i} for i in range(9)] + [{"index": 0, "label": "extra"}],
        )


def test_more_than_ten_prompts_rejected():
    with pytest.raises(ValidationError):
        SpreadCreate(
            name="Too Many Prompts",
            positions=[{"index": 4}],
            prompts=[f"Question {i}?" for i in range(11)],
        )


def test_update_allows_omitting_positions():
    update = SpreadUpdate(name="Renamed Spread")
    assert update.positions is None


def test_update_rejects_duplicate_position_indices():
    with pytest.raises(ValidationError, match="unique"):
        SpreadUpdate(positions=[{"index": 2}, {"index": 2}])
