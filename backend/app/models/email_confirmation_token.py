from app.models.expiring_token import ExpiringToken


class EmailConfirmationToken(ExpiringToken):
    __tablename__ = "email_confirmation_tokens"
