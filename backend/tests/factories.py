# SPDX-License-Identifier: AGPL-3.0-or-later
import datetime
import uuid

import pytest

from app.core.security import create_access_token, get_password_hash, hash_token
from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.models.diary_entry import DiaryEntry
from app.models.email_confirmation_token import EmailConfirmationToken
from app.models.password_reset_token import PasswordResetToken
from app.models.spread import Spread
from app.models.user import Role, User
from app.schemas.tarot import TarotCard

# `scale` intentionally omitted — exercises SpreadPosition's Pydantic default (1.0) on read, covering
# spreads/diary entries persisted before the scale field existed.
DEFAULT_POSITIONS = [{"index": 0, "label": "Center", "x": 0.5, "y": 0.5, "rotation": 0.0}]
DEFAULT_PROMPTS = ["What do you notice?"]


@pytest.fixture
def make_user(db_session):
    async def _make(*, username=None, email=None, password="hunter2pass", role=Role.USER, is_verified=True):
        suffix = uuid.uuid4().hex[:8]
        user = User(
            username=username or f"user_{suffix}",
            email=email or f"user_{suffix}@example.com",
            password=get_password_hash(password),
            role=role,
            is_verified=is_verified,
        )
        db_session.add(user)
        await db_session.flush()
        return user

    return _make


@pytest.fixture
def make_admin(make_user):
    async def _make(**overrides):
        overrides.setdefault("role", Role.ADMIN)
        return await make_user(**overrides)

    return _make


@pytest.fixture
def auth_headers():
    def _headers(user: User, client_scope: str = "app") -> dict:
        token = create_access_token(subject=str(user.id), claims={"scope": client_scope})
        return {"Authorization": f"Bearer {token}"}

    return _headers


async def _make_expiring_token(db_session, model, *, user_id, token, expires_at, used_at):
    token_row = model(
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=expires_at or (datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=30)),
        used_at=used_at,
    )
    db_session.add(token_row)
    await db_session.flush()
    return token_row


@pytest.fixture
def make_password_reset_token(db_session):
    async def _make(*, user_id, token="a-known-reset-token", expires_at=None, used_at=None):
        return await _make_expiring_token(
            db_session, PasswordResetToken, user_id=user_id, token=token, expires_at=expires_at, used_at=used_at
        )

    return _make


@pytest.fixture
def make_email_confirmation_token(db_session):
    async def _make(*, user_id, token="a-known-confirmation-token", expires_at=None, used_at=None):
        return await _make_expiring_token(
            db_session, EmailConfirmationToken, user_id=user_id, token=token, expires_at=expires_at, used_at=used_at
        )

    return _make


@pytest.fixture
def make_spread(db_session):
    async def _make(
        *,
        user_id=None,
        name="Test Spread",
        positions=None,
        prompts=None,
        allow_reversed=True,
    ):
        positions = positions if positions is not None else DEFAULT_POSITIONS
        prompts = prompts if prompts is not None else DEFAULT_PROMPTS
        spread = Spread(
            name=name,
            description=None,
            num_cards=len(positions),
            positions=positions,
            prompts=prompts,
            allow_reversed=allow_reversed,
            user_id=user_id,
        )
        db_session.add(spread)
        await db_session.flush()
        return spread

    return _make


@pytest.fixture
def make_deck(db_session):
    async def _make(*, user_id=None, name="Test Deck", with_cards=False):
        deck = Deck(name=name, description=None, user_id=user_id)
        db_session.add(deck)
        await db_session.flush()

        if with_cards:
            for card in TarotCard:
                db_session.add(DeckCard(deck_id=deck.id, card=card.value))
            await db_session.flush()

        return deck

    return _make


@pytest.fixture
def make_diary_entry(db_session):
    async def _make(
        *,
        user_id,
        entry_date=None,
        entry_text="A quiet reading.",
        spread_name="Test Spread",
        positions=None,
        cards=None,
        prompts=None,
        submitted=True,
    ):
        positions = positions if positions is not None else DEFAULT_POSITIONS
        cards = cards if cards is not None else [{"position_index": 0, "card": "the_fool", "reversed": False}]
        prompts = prompts if prompts is not None else [{"prompt": DEFAULT_PROMPTS[0], "reply": ""}]

        entry = DiaryEntry(
            user_id=user_id,
            entry_date=entry_date or datetime.date.today(),
            entry_text=entry_text,
            spread_name=spread_name,
            num_cards=len(positions),
            positions=positions,
            cards=cards,
            prompts=prompts,
            submitted=submitted,
        )
        db_session.add(entry)
        await db_session.flush()
        return entry

    return _make
