import pytest
from pydantic import ValidationError

from app.schemas.auth import ClientType, LoginRequest
from app.schemas.user import UserCreate, UserUpdate


def test_valid_user_create():
    user = UserCreate(username="pyxie", email="pyxie@example.com", password="hunter2pass")
    assert user.username == "pyxie"


def test_user_create_short_username_rejected():
    with pytest.raises(ValidationError):
        UserCreate(username="ab", email="pyxie@example.com", password="hunter2pass")


def test_user_create_short_password_rejected():
    with pytest.raises(ValidationError):
        UserCreate(username="pyxie", email="pyxie@example.com", password="short")


def test_user_create_invalid_email_rejected():
    with pytest.raises(ValidationError):
        UserCreate(username="pyxie", email="not-an-email", password="hunter2pass")


def test_user_update_allows_omitting_fields():
    update = UserUpdate()
    assert update.username is None
    assert update.email is None


def test_login_request_defaults_to_app_client():
    login = LoginRequest(username="pyxie", password="hunter2pass")
    assert login.client == ClientType.APP


def test_login_request_accepts_admin_client():
    login = LoginRequest(username="pyxie", password="hunter2pass", client="admin")
    assert login.client == ClientType.ADMIN
