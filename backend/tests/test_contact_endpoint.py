# SPDX-License-Identifier: AGPL-3.0-or-later
from app.config import settings


async def test_contact_endpoint_success_sends_email(client, monkeypatch):
    sent = {}
    monkeypatch.setattr("app.core.email.settings.RESEND_KEY", "test-key")
    monkeypatch.setattr("app.core.email.resend.Emails.send", lambda params: sent.update(params))

    response = await client.post(
        "/api/v1/contact",
        json={"email": "visitor@example.com", "message": "Hello, I have feedback."},
    )

    assert response.status_code == 204
    assert sent["to"] == settings.CONTACT_EMAIL_TO
    assert "visitor@example.com" in sent["html"]
    assert "Hello, I have feedback." in sent["html"]


async def test_contact_endpoint_invalid_email_rejected(client):
    response = await client.post(
        "/api/v1/contact",
        json={"email": "not-an-email", "message": "Hello, I have feedback."},
    )

    assert response.status_code == 422
