import pytest
from fastapi import HTTPException
from jose import jwt

from app.core.security import (
    ALGORITHM,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = get_password_hash("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_password_hash_is_not_plaintext():
    hashed = get_password_hash("my-password")
    assert hashed != "my-password"


def test_access_token_roundtrip():
    token = create_access_token(subject="user-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"


def test_access_token_includes_extra_claims():
    token = create_access_token(subject="user-123", claims={"role": "admin"})
    payload = decode_access_token(token)
    assert payload["role"] == "admin"


def test_decode_expired_token_raises_401():
    token = create_access_token(subject="user-123", expires_minutes=-1)
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(token)
    assert exc_info.value.status_code == 401


def test_decode_garbage_token_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("not-a-real-token")
    assert exc_info.value.status_code == 401


def test_decode_token_signed_with_wrong_key_raises_401():
    bad_token = jwt.encode({"sub": "user-123"}, "a-different-secret", algorithm=ALGORITHM)
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(bad_token)
    assert exc_info.value.status_code == 401
