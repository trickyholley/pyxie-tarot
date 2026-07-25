import logging
from pathlib import Path

import resend

from app.config import settings

logger = logging.getLogger("app.email")

LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "email" / "logo.png"
LOGO_CONTENT_ID = "pyxie-logo"
LOGO_BYTES = list(LOGO_PATH.read_bytes())

resend.api_key = settings.RESEND_KEY


def _send_branded_email(to_email: str, subject: str, message: str, action_url: str, expires_minutes: int) -> None:
    if not settings.RESEND_KEY:
        # No email provider configured — log the link so it's usable in dev.
        logger.info("%s for %s: %s", subject, to_email, action_url)
        return

    resend.Emails.send(
        {
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "subject": subject,
            "html": (
                f'<img src="cid:{LOGO_CONTENT_ID}" alt="Pyxie Tarot" width="80" height="80" />'
                f"<p>{message} This link expires in {expires_minutes} minutes.</p>"
                f'<p><a href="{action_url}">{action_url}</a></p>'
            ),
            "attachments": [
                {
                    "filename": "logo.png",
                    "content": LOGO_BYTES,
                    "content_id": LOGO_CONTENT_ID,
                }
            ],
        }
    )


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    _send_branded_email(
        to_email,
        "Reset your Pyxie Tarot password",
        "Click the link below to reset your Pyxie Tarot password.",
        reset_url,
        settings.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
    )


def send_email_confirmation_email(to_email: str, confirm_url: str) -> None:
    _send_branded_email(
        to_email,
        "Confirm your Pyxie Tarot email",
        "Click the link below to confirm your Pyxie Tarot email address.",
        confirm_url,
        settings.EMAIL_CONFIRMATION_TOKEN_EXPIRES_MINUTES,
    )
