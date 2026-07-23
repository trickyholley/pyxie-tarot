import uuid
from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas.diary_entry import DiaryEntryCreate, DiaryEntryRead, DiaryEntryUpdate, EntryCard, PromptReply
from app.schemas.tarot import TarotCard


def _base_entry_kwargs(**overrides):
    kwargs = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "entry_date": "2026-07-01",
        "entry_text": "A quiet reading.",
        "spread_name": "Past, Present, Future",
        "num_cards": 3,
        "positions": [
            {"index": 3, "label": "Past"},
            {"index": 4, "label": "Present"},
            {"index": 5, "label": "Future"},
        ],
        "cards": [
            {"position_index": 3, "card": "the_fool", "reversed": False},
            {"position_index": 4, "card": "the_sun", "reversed": True},
            {"position_index": 5, "card": "the_world", "reversed": False},
        ],
        "prompts": [{"prompt": "What surprised you?", "reply": "The reversal did."}],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    kwargs.update(overrides)
    return kwargs


def test_valid_entry_card():
    card = EntryCard(position_index=4, card=TarotCard.THE_FOOL, reversed=True)
    assert card.reversed is True


def test_unknown_card_name_rejected():
    with pytest.raises(ValidationError):
        EntryCard(position_index=0, card="not_a_real_card")


def test_entry_card_position_index_out_of_grid_rejected():
    with pytest.raises(ValidationError):
        EntryCard(position_index=9, card=TarotCard.THE_FOOL)


def test_prompt_reply_defaults_to_empty():
    reply = PromptReply(prompt="What did you notice?")
    assert reply.reply == ""


def test_empty_prompt_rejected():
    with pytest.raises(ValidationError):
        PromptReply(prompt="", reply="Something")


def test_valid_diary_entry_read():
    entry = DiaryEntryRead(**_base_entry_kwargs())
    assert len(entry.cards) == 3
    assert entry.cards[1].reversed is True


def test_diary_entry_duplicate_position_indices_rejected():
    with pytest.raises(ValidationError, match="unique"):
        DiaryEntryRead(
            **_base_entry_kwargs(
                cards=[
                    {"position_index": 4, "card": "the_fool", "reversed": False},
                    {"position_index": 4, "card": "the_sun", "reversed": False},
                ]
            )
        )


def test_valid_diary_entry_create():
    entry = DiaryEntryCreate(
        spread_id=uuid.uuid4(),
        entry_text="A quiet reading.",
        cards=[{"position_index": 4, "card": "the_fool", "reversed": False}],
        replies=["It confirmed what I suspected."],
    )
    assert entry.entry_date is None
    assert len(entry.cards) == 1


def test_diary_entry_create_duplicate_position_indices_rejected():
    with pytest.raises(ValidationError, match="unique"):
        DiaryEntryCreate(
            spread_id=uuid.uuid4(),
            entry_text="A quiet reading.",
            cards=[
                {"position_index": 4, "card": "the_fool", "reversed": False},
                {"position_index": 4, "card": "the_sun", "reversed": False},
            ],
        )


def test_diary_entry_create_empty_text_rejected():
    with pytest.raises(ValidationError):
        DiaryEntryCreate(
            spread_id=uuid.uuid4(),
            entry_text="",
            cards=[{"position_index": 4, "card": "the_fool", "reversed": False}],
        )


def test_diary_entry_update_allows_omitting_fields():
    update = DiaryEntryUpdate()
    assert update.entry_text is None
    assert update.replies is None
