# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

from app.models.user import User
from app.schemas.user import Tier


def test_effective_tier_lapses_to_fool_once_expired():
    user = User(tier=Tier.STAR, tier_expires_at=datetime.now(UTC) - timedelta(days=1))

    assert user.effective_tier is Tier.FOOL


def test_effective_tier_honours_an_unexpired_grant():
    user = User(tier=Tier.STAR, tier_expires_at=datetime.now(UTC) + timedelta(days=1))

    assert user.effective_tier is Tier.STAR


def test_effective_tier_without_an_expiry_never_lapses():
    user = User(tier=Tier.WORLD, tier_expires_at=None)

    assert user.effective_tier is Tier.WORLD
