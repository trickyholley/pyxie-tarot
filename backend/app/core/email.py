import logging
from pathlib import Path

import resend

from app.config import settings

logger = logging.getLogger("app.email")

LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "email" / "logo.png"
LOGO_CONTENT_ID = "pyxie-logo"
LOGO_BYTES = list(LOGO_PATH.read_bytes())

resend.api_key = settings.RESEND_KEY


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    if not settings.RESEND_KEY:
        # No email provider configured — log the link so it's usable in dev.
        logger.info("Password reset requested for %s: %s", to_email, reset_url)
        return

    resend.Emails.send(
        {
            "from": settings.EMAIL_FROM,
            "to": to_email,
            "subject": "Reset your Pyxie Tarot password",
            "html": (
                f'<img src="cid:{LOGO_CONTENT_ID}" alt="Pyxie Tarot" width="80" height="80" />'
                f"<p>Click the link below to reset your Pyxie Tarot password. "
                f"This link expires in {settings.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES} minutes.</p>"
                f'<p><a href="{reset_url}">{reset_url}</a></p>'
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
