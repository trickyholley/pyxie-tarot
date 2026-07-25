from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.email import send_email_confirmation_email
from app.core.security import generate_token, hash_token
from app.models.email_confirmation_token import EmailConfirmationToken
from app.models.user import User


def send_confirmation_email(db: AsyncSession, user: User) -> None:
    token = generate_token()
    db.add(
        EmailConfirmationToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.EMAIL_CONFIRMATION_TOKEN_EXPIRES_MINUTES),
        )
    )
    send_email_confirmation_email(user.email, f"{settings.FRONTEND_APP_URL}/confirm-email?token={token}")
