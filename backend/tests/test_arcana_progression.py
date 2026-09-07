# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

from app.models.user import User, whole_months_between
from app.schemas.tarot import MAX_ARCANA_LEVEL, TarotCard
from app.schemas.user import Licence


def months_ago(count: int) -> datetime:
    """A timestamp exactly `count` whole months before now.

    Clamps the day to 28 so the anchor always exists in its month and the comparison in
    `whole_months_between` can't be thrown off by a short target month.
    """
    now = datetime.now(UTC)
    year, month = divmod(now.year * 12 + now.month - 1 - count, 12)
    return now.replace(year=year, month=month + 1, day=min(now.day, 28))


def subscriber(*, banked: int, anchored_months_ago: int | None, expires_in_days: int | None = 30) -> User:
    return User(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=None if expires_in_days is None else datetime.now(UTC) + timedelta(days=expires_in_days),
        arcana_months_banked=banked,
        arcana_anchor_at=None if anchored_months_ago is None else months_ago(anchored_months_ago),
    )


def test_first_payment_lands_on_the_magician():
    """The journey starts the instant someone first pays, rather than a month later."""
    user = subscriber(banked=1, anchored_months_ago=0)

    assert user.arcana_level == 1
    assert user.arcana is TarotCard.THE_MAGICIAN


def test_each_elapsed_month_advances_one_arcana():
    user = subscriber(banked=1, anchored_months_ago=3)

    assert user.arcana_level == 4


def test_an_annual_subscription_still_climbs_one_a_month():
    """A year paid up front buys entitlement, not twelve arcana at once - the stretch is measured in
    elapsed months exactly as a monthly subscription's is."""
    user = subscriber(banked=1, anchored_months_ago=5, expires_in_days=210)

    assert user.arcana_level == 6


def test_a_pause_banks_progress_instead_of_losing_or_continuing_it():
    user = User(licence=Licence.NONE, arcana_months_banked=7, arcana_anchor_at=None)

    assert user.arcana_level == 7


def test_resubscribing_climbs_on_from_the_banked_total():
    user = subscriber(banked=7, anchored_months_ago=2)

    assert user.arcana_level == 9


def test_a_lapsed_subscription_freezes_at_the_guide_it_reached():
    """The stretch is measured only up to the expiry, so a missed cancellation webhook can't let
    someone keep climbing on a subscription they stopped paying for."""
    user = User(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=months_ago(2),
        arcana_months_banked=1,
        arcana_anchor_at=months_ago(5),
    )

    assert user.arcana_level == 4


def test_the_journey_stops_at_the_world():
    user = User(
        licence=Licence.PERPETUAL,
        arcana_months_banked=1,
        arcana_anchor_at=months_ago(500),
    )

    assert user.arcana_level == MAX_ARCANA_LEVEL
    assert user.arcana is TarotCard.THE_WORLD


def test_a_perpetual_licence_keeps_climbing_with_no_expiry_to_clamp_it():
    user = User(licence=Licence.PERPETUAL, arcana_months_banked=1, arcana_anchor_at=months_ago(4))

    assert user.arcana_level == 5


def test_the_free_default_is_the_fool():
    user = User(licence=Licence.NONE, arcana_months_banked=0, arcana_anchor_at=None)

    assert user.arcana_level == 0
    assert user.arcana is TarotCard.THE_FOOL


def test_an_expired_subscription_is_no_longer_active():
    user = subscriber(banked=0, anchored_months_ago=None, expires_in_days=-1)

    assert user.licence_is_active is False


def test_a_live_subscription_is_active():
    user = subscriber(banked=0, anchored_months_ago=None, expires_in_days=1)

    assert user.licence_is_active is True


def test_a_subscription_that_reached_the_world_stays_active_past_expiry():
    """CLAUDE: A subscriber who has already climbed to the World is active regardless of
    `licence_expires_at` - a fixed-length membership has no further renewal webhook to self-heal a
    missed `_settle_completed_journey` the way an open-ended subscription would, so this can't be
    allowed to depend on that one webhook landing."""
    user = User(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=months_ago(1),
        arcana_months_banked=MAX_ARCANA_LEVEL,
        arcana_anchor_at=None,
    )

    assert user.licence_is_active is True


def test_permanent_licences_never_lapse():
    for licence in (Licence.PERPETUAL, Licence.COMP):
        user = User(licence=licence, licence_expires_at=None)

        assert user.licence_is_active is True
        assert user.licence_is_permanent is True


def test_a_subscription_is_not_permanent():
    """`licence_is_permanent` is what keeps a billing event from revoking an earned or gifted
    licence, so it must not accidentally cover ordinary subscriptions."""
    user = User(licence=Licence.SUBSCRIPTION, licence_expires_at=datetime.now(UTC) + timedelta(days=1))

    assert user.licence_is_permanent is False


def test_no_licence_is_neither_active_nor_permanent():
    user = User(licence=Licence.NONE)

    assert user.licence_is_active is False
    assert user.licence_is_permanent is False


def test_perpetual_with_a_recorded_subscription_flags_a_possible_redundant_membership():
    user = User(licence=Licence.PERPETUAL, gumroad_subscription_id="sub_abc123")

    assert user.has_redundant_subscription is True


def test_perpetual_bought_straight_from_the_fool_has_nothing_to_flag():
    user = User(licence=Licence.PERPETUAL, gumroad_subscription_id=None)

    assert user.has_redundant_subscription is False


def test_a_subscription_never_flags_as_redundant():
    """Only a permanent licence can have a redundant membership behind it - an ordinary, still-earning
    subscription is the membership itself, not a leftover one."""
    user = User(licence=Licence.SUBSCRIPTION, gumroad_subscription_id="sub_abc123")

    assert user.has_redundant_subscription is False


def test_a_comp_with_a_recorded_subscription_flags_a_possible_redundant_membership():
    """A comp granted on top of a real Gumroad membership leaves that membership just as redundant
    as buying the licence outright would."""
    user = User(licence=Licence.COMP, gumroad_subscription_id="sub_abc123")

    assert user.has_redundant_subscription is True


def test_whole_months_between_needs_the_day_of_month_to_come_round():
    start = datetime(2026, 3, 15, tzinfo=UTC)

    assert whole_months_between(start, datetime(2026, 4, 14, tzinfo=UTC)) == 0
    assert whole_months_between(start, datetime(2026, 4, 15, tzinfo=UTC)) == 1
    assert whole_months_between(start, datetime(2027, 3, 15, tzinfo=UTC)) == 12


def test_whole_months_between_never_goes_negative():
    """Guards the anchor-in-the-future case (clock skew, or an expiry that has already passed being
    used as the end), which would otherwise subtract from the banked total."""
    assert whole_months_between(datetime(2026, 6, 1, tzinfo=UTC), datetime(2026, 1, 1, tzinfo=UTC)) == 0
