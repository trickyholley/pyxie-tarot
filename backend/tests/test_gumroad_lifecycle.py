# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

import pytest

from app.schemas.tarot import MAX_ARCANA_STEP, TarotCard
from app.schemas.user import Licence, LicenceSource
from tests.gumroad_helpers import (
    WEBHOOK_URL,
    cancellation_body,
    membership_ended_body,
    user_row,
)

pytestmark = pytest.mark.usefixtures("configure_gumroad")


async def test_membership_ended_banks_progress_when_it_ends_early(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=LicenceSource.GUMROAD,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        gumroad_subscription_id="sub_abc123",
    )
    body = membership_ended_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_abc123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert row.licence_source is None
    assert row.licence_expires_at is None
    assert row.arcana_step == 6


@pytest.mark.parametrize(
    ("licence_source", "gumroad_subscription_id"),
    [(LicenceSource.GUMROAD, "sub_new456"), (LicenceSource.APP_STORE, "sub_old123")],
)
async def test_membership_ended_ignores_a_ping_for_a_superseded_subscription(
    client, make_user, db_session, licence_source, gumroad_subscription_id
):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=licence_source,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        arcana_anchor_at=datetime.now(UTC),
        gumroad_subscription_id=gumroad_subscription_id,
    )
    body = membership_ended_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_old123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.arcana_anchor_at is not None
    assert row.licence_source is licence_source


async def test_membership_ended_still_applies_without_a_subscription_id(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=LicenceSource.GUMROAD,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        gumroad_subscription_id="sub_abc123",
    )
    body = membership_ended_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE


async def test_membership_ended_that_completes_the_journey_still_grants_perpetual(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION, licence_source=LicenceSource.GUMROAD, arcana_months_banked=MAX_ARCANA_STEP
    )
    body = membership_ended_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    assert row.arcana is TarotCard.THE_WORLD


async def test_membership_ended_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_STEP)
    body = membership_ended_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.COMP


async def test_cancellation_flags_the_period_end_without_revoking_anything(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=LicenceSource.GUMROAD,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        gumroad_subscription_id="sub_abc123",
    )
    body = cancellation_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_abc123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_cancels_at_period_end is True
    assert row.arcana_step == 6


@pytest.mark.parametrize(
    ("licence_source", "gumroad_subscription_id"),
    [(LicenceSource.GUMROAD, "sub_new456"), (LicenceSource.APP_STORE, "sub_old123")],
)
async def test_cancellation_ignores_a_ping_for_a_superseded_subscription(
    client, make_user, db_session, licence_source, gumroad_subscription_id
):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=licence_source,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        gumroad_subscription_id=gumroad_subscription_id,
    )
    body = cancellation_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_old123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence_cancels_at_period_end is False


async def test_cancellation_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_STEP)
    body = cancellation_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.COMP
    assert row.licence_cancels_at_period_end is False
