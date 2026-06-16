"""Password and OTP hashing utilities using bcrypt directly."""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    encoded = password.encode("utf-8")
    if len(encoded) > 72:
        encoded = encoded[:72]
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        encoded = plain.encode("utf-8")
        if len(encoded) > 72:
            encoded = encoded[:72]
        return bcrypt.checkpw(encoded, hashed.encode("utf-8"))
    except Exception:
        return False


def hash_otp(otp: str) -> str:
    """Hash an OTP code with bcrypt — never store plaintext."""
    return bcrypt.hashpw(otp.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Verify a plaintext OTP against its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_otp.encode("utf-8"), hashed_otp.encode("utf-8"))
    except Exception:
        return False
