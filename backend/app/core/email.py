import logging

logger = logging.getLogger("app.email")


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    # No email provider wired up yet — log the link so it's usable in dev.
    logger.info("Password reset requested for %s: %s", to_email, reset_url)
