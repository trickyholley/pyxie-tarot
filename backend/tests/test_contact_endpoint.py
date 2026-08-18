# SPDX-License-Identifier: AGPL-3.0-or-later
from app.config import settings


async def test_contact_endpoint_success_sends_email(client, make_user, auth_headers, monkeypatch):
    sent = {}
    monkeypatch.setattr("app.core.email.settings.RESEND_KEY", "test-key")
    monkeypatch.setattr("app.core.email.resend.Emails.send", lambda params: sent.update(params))
    user = await make_user()

    response = await client.post(
        "/api/v1/contact",
        json={"message": "Hello, I have feedback."},
        headers=auth_headers(user),
    )

    assert response.status_code == 204
    assert sent["to"] == settings.CONTACT_EMAIL_TO
    assert user.email in sent["html"]
    assert "Hello, I have feedback." in sent["html"]
