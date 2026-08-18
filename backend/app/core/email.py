# SPDX-License-Identifier: AGPL-3.0-or-later
import html
import logging
from pathlib import Path

import resend

from app.config import settings

logger = logging.getLogger("app.email")

LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "email" / "logo.png"
LOGO_CONTENT_ID = "pyxie-logo"
LOGO_BYTES = list(LOGO_PATH.read_bytes())

# Hex equivalents of apps/app's default theme (globals.css's :root + theme.css's --background
# override) - oklch isn't reliable across email clients, so these are pre-converted to sRGB.
EMAIL_BACKGROUND_COLOR = "#f4ebf4"  # --accent, used as --background
EMAIL_CARD_COLOR = "#ffffff"  # --card
EMAIL_TEXT_COLOR = "#0a0a0a"  # --foreground / --card-foreground
EMAIL_BORDER_COLOR = "#e5e5e5"  # --border

resend.api_key = settings.RESEND_KEY


def send_branded_email(to_email: str, subject: str, body_html: str, reply_to: str | None = None) -> None:
    """Sends `body_html` inside a card (echoing the app's default theme) under the Pyxie Tarot logo
    via Resend, or logs it instead when RESEND_KEY is unset (dev/CI without a provider configured).
    """
    if not settings.RESEND_KEY:
        # Dev/CI-only fallback (this path never runs where a provider is configured, i.e. never in
        # prod) - logging the full body, including reset/confirm tokens, is intentional so devs can
        # exercise those flows without Resend. See CLAUDE.md's "Dismissed security alerts".
        logger.info("%s for %s: %s", subject, to_email, body_html)  # codeql[py/clear-text-logging-sensitive-data]
        return

    email_params = {
        "from": settings.EMAIL_FROM,
        "to": to_email,
        "subject": subject,
        "html": (
            f'<div style="background-color:{EMAIL_BACKGROUND_COLOR};padding:32px 16px;">'
            f'<div style="max-width:480px;margin:0 auto;background-color:{EMAIL_CARD_COLOR};'
            f'border-radius:16px;padding:24px;color:{EMAIL_TEXT_COLOR};font-family:Arial,sans-serif;">'
            f'<img src="cid:{LOGO_CONTENT_ID}" alt="Pyxie Tarot" width="64" height="64" '
            f'style="display:block;margin:0 auto 16px;" />'
            f'<h2 style="text-align:center;margin:0 0 16px;">Pyxie Tarot</h2>'
            f'<hr style="border:none;border-top:1px solid {EMAIL_BORDER_COLOR};margin:0 0 16px;" />'
            f"{body_html}"
            "</div></div>"
        ),
        "attachments": [
            {
                "filename": "logo.png",
                "content": LOGO_BYTES,
                "content_id": LOGO_CONTENT_ID,
            }
        ],
    }
    if reply_to:
        email_params["reply_to"] = reply_to

    resend.Emails.send(email_params)


def _action_link_html(message: str, action_url: str, expires_minutes: int) -> str:
    return (
        f"<p>{message} This link expires in {expires_minutes} minutes.</p>"
        f'<p><a href="{action_url}">{action_url}</a></p>'
    )


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    send_branded_email(
        to_email,
        "Reset your Pyxie Tarot password 🔐",
        _action_link_html(
            "Click the link below to reset your Pyxie Tarot password.",
            reset_url,
            settings.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
        ),
    )


def send_email_confirmation_email(to_email: str, confirm_url: str) -> None:
    send_branded_email(
        to_email,
        "Confirm your Pyxie Tarot email 💌",
        _action_link_html(
            "Click the link below to confirm your Pyxie Tarot email address.",
            confirm_url,
            settings.EMAIL_CONFIRMATION_TOKEN_EXPIRES_MINUTES,
        ),
    )


def send_contact_message_email(from_email: str, message: str) -> None:
    # from_email/message are user-supplied - escape before interpolating into HTML.
    body_html = (
        "<p>You received a new message from Pyxie's contact form!</p>"
        f"<p>From: {html.escape(from_email)}</p>"
        f"<p>{html.escape(message).replace('\n', '<br>')}</p>"
    )
    send_branded_email(settings.CONTACT_EMAIL_TO, "New message 💌", body_html, reply_to=from_email)
