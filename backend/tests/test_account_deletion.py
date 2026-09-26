# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

from app.core.account_deletion import purge_due_accounts
from app.models.user import ACCOUNT_DELETION_GRACE, User

DELETE_BODY = {"password": "hunter2pass"}


async def test_delete_account_schedules_instead_of_deleting(client, make_user, auth_headers):
    user = await make_user()
    headers = auth_headers(user)

    response = await client.request("DELETE", "/api/v1/users/me", json=DELETE_BODY, headers=headers)

    assert response.status_code == 204
    follow_up = await client.get("/api/v1/users/me", headers=headers)
    assert follow_up.status_code == 200
    scheduled_for = datetime.fromisoformat(follow_up.json()["deletion_scheduled_for"])
    assert abs(scheduled_for - (datetime.now(UTC) + ACCOUNT_DELETION_GRACE)) < timedelta(minutes=1)


async def test_delete_account_signs_out_other_devices(client, make_user, auth_headers):
    user = await make_user(username="leaving", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "leaving", "password": "hunter2pass"})
    refresh_token = login.json()["refresh_token"]

    await client.request("DELETE", "/api/v1/users/me", json=DELETE_BODY, headers=auth_headers(user))

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401


async def test_pending_account_can_only_read_itself_and_cancel(client, make_user, auth_headers, db_session):
    user = await make_user()
    user.deletion_requested_at = datetime.now(UTC)
    await db_session.commit()
    headers = auth_headers(user)

    assert (await client.get("/api/v1/diary-entries", headers=headers)).status_code == 403
    assert (await client.get("/api/v1/users/me", headers=headers)).status_code == 200


async def test_cancel_deletion_clears_schedule(client, make_user, auth_headers, db_session):
    user = await make_user()
    user.deletion_requested_at = datetime.now(UTC)
    await db_session.commit()

    response = await client.post("/api/v1/users/me/cancel-deletion", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["deletion_scheduled_for"] is None


async def test_purge_deletes_only_accounts_past_grace_period(make_user, db_session, monkeypatch):
    deleted_prefixes = []
    monkeypatch.setattr("app.core.account_deletion.delete_prefix", deleted_prefixes.append)
    now = datetime.now(UTC)
    due = await make_user()
    due.deletion_requested_at = now - ACCOUNT_DELETION_GRACE - timedelta(minutes=1)
    pending = await make_user()
    pending.deletion_requested_at = now - ACCOUNT_DELETION_GRACE + timedelta(minutes=1)
    untouched = await make_user()
    await db_session.commit()
    due_id, pending_id, untouched_id = due.id, pending.id, untouched.id

    await purge_due_accounts(db_session)

    assert await db_session.get(User, due_id) is None
    assert await db_session.get(User, pending_id) is not None
    assert await db_session.get(User, untouched_id) is not None
    assert f"diary/{due_id}/" in deleted_prefixes
