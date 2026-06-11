"""Password and OTP hashing utilities using bcrypt directly."""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
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
