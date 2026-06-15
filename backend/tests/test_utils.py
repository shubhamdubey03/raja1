"""
Tests for utility functions — security and slug generation.
"""

import pytest
from app.utils.security import hash_password, verify_password, hash_otp, verify_otp
from app.utils.slug import generate_slug, generate_unique_slug
from app.utils import create_access_token, create_refresh_token, decode_token


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "securePassword123!"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrongPassword", hashed) is False

    def test_different_hashes_same_password(self):
        password = "testPassword"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2  # bcrypt uses random salt


class TestOTPHashing:
    def test_otp_hash_and_verify(self):
        otp = "123456"
        hashed = hash_otp(otp)
        assert verify_otp(otp, hashed) is True
        assert verify_otp("654321", hashed) is False


class TestSlugGeneration:
    def test_basic_slug(self):
        assert generate_slug("Hello World") == "hello-world"

    def test_special_characters(self):
        assert generate_slug("Product @ 50% Off!") == "product-50-off"

    def test_unique_slug_has_suffix(self):
        slug = generate_unique_slug("Test Product")
        assert slug.startswith("test-product-")
        assert len(slug) > len("test-product-")


class TestJWT:
    def test_create_and_decode_access_token(self):
        data = {"sub": "test-user-id", "role": "admin"}
        token = create_access_token(data)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "test-user-id"
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self):
        data = {"sub": "test-user-id", "role": "vendor"}
        token = create_refresh_token(data)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "test-user-id"
        assert payload["type"] == "refresh"

    def test_invalid_token_returns_none(self):
        assert decode_token("invalid-token") is None


class TestAppException:
    def test_app_exception_properties(self):
        from app.exceptions import AppException
        ex = AppException(status_code=400, detail="Invalid data submitted", error_code="INVALID_INPUT")
        assert ex.status_code == 400
        assert ex.detail == "Invalid data submitted"
        assert ex.error_code == "INVALID_INPUT"

