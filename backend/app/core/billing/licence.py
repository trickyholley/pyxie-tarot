# SPDX-License-Identifier: AGPL-3.0-or-later
"""Provider-agnostic licence and arcana progression transitions, shared by every billing webhook."""

from datetime import UTC, datetime

from app.models.user import User, whole_months_between
from app.schemas.tarot import MAX_ARCANA_STEP
from app.schemas.user import Licence, LicenceSource


def bank_current_stretch(user: User) -> None:
    """Closes the running stretch, folding its elapsed months into the banked total."""
    if user.arcana_anchor_at is None:
        return
    user.arcana_months_banked = min(
        MAX_ARCANA_STEP, user.arcana_months_banked + whole_months_between(user.arcana_anchor_at, user.stretch_end)
    )
    user.arcana_anchor_at = None


def settle_completed_journey(user: User) -> None:
    """Flips a subscription that's reached the World to a permanent licence."""
    if user.licence is not Licence.SUBSCRIPTION or user.arcana_step < MAX_ARCANA_STEP:
        return
    user.licence = Licence.PERPETUAL
    user.licence_expires_at = None
    user.licence_cancels_at_period_end = False
    user.arcana_months_banked = MAX_ARCANA_STEP
    user.arcana_anchor_at = None


def grant_perpetual(user: User, source: LicenceSource, purchase_id: str | None) -> None:
    """Grants a bought perpetual licence, closing out any lapsed stretch first."""
    if user.has_lapsed_stretch:
        bank_current_stretch(user)
    user.licence = Licence.PERPETUAL
    user.licence_source = source
    user.perpetual_purchase_id = purchase_id
    user.licence_expires_at = None
    user.licence_cancels_at_period_end = False
    _start_stretch_if_idle(user)


def renew_subscription(user: User, source: LicenceSource, expires_at: datetime) -> None:
    """Starts or extends a subscription to `expires_at`, settling it if that reaches the World."""
    if user.has_lapsed_stretch:
        bank_current_stretch(user)
    user.licence = Licence.SUBSCRIPTION
    user.licence_source = source
    user.licence_expires_at = expires_at
    user.licence_cancels_at_period_end = False
    _start_stretch_if_idle(user)
    settle_completed_journey(user)


def end_subscription(user: User) -> None:
    """The subscription has actually stopped billing - fixed-length completion or a cancellation taking
    effect. Banks the stretch walked so far and settles it if that reached the World."""
    bank_current_stretch(user)
    # Reaching the World here must not be revoked - settle_completed_journey grants it instead.
    if user.arcana_step < MAX_ARCANA_STEP:
        _clear_licence(user)
    settle_completed_journey(user)


def revoke_licence(user: User, refunded_purchase_at: datetime) -> None:
    """Revokes a refunded licence, taking back the step the purchase bought plus every step since."""
    bank_current_stretch(user)
    refunded_steps = 1 + whole_months_between(refunded_purchase_at, datetime.now(UTC))
    user.arcana_months_banked = max(0, user.arcana_months_banked - refunded_steps)
    _clear_licence(user)


def _start_stretch_if_idle(user: User) -> None:
    if user.arcana_anchor_at is None:
        user.arcana_months_banked = max(1, user.arcana_months_banked)
        user.arcana_anchor_at = datetime.now(UTC)


def _clear_licence(user: User) -> None:
    user.licence = Licence.NONE
    user.licence_source = None
    user.perpetual_purchase_id = None
    user.licence_expires_at = None
    user.licence_cancels_at_period_end = False
