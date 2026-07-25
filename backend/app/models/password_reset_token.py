from app.models.expiring_token import ExpiringToken


class PasswordResetToken(ExpiringToken):
    __tablename__ = "password_reset_tokens"
