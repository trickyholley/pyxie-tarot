import pytest
from pydantic import ValidationError

from app.schemas.deck import DeckCreate, DeckUpdate
from app.schemas.deck_card import DeckCardUpdate


def test_valid_deck_create():
    deck = DeckCreate(name="Custom Deck", description="A hand-crafted deck.")
    assert deck.name == "Custom Deck"


def test_deck_create_requires_name():
    with pytest.raises(ValidationError):
        DeckCreate(name="")


def test_deck_update_allows_omitting_fields():
    update = DeckUpdate()
    assert update.name is None
    assert update.description is None


def test_deck_card_update_allows_partial_fields():
    update = DeckCardUpdate(upright_meaning="A fresh start.")
    assert update.upright_meaning == "A fresh start."
    assert update.reversed_meaning is None
    assert update.image_url is None
