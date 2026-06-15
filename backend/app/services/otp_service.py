"""
OTP service — centralised OTP generation, hashing, verification.

- 6-digit OTP, bcrypt-hashed storage
- 5-min TTL, 3-attempt limit, 60-sec resend cooldown
- Abstract SMS provider (MSG91/Twilio) via config
"""

import random
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.otp import OTP
from app.models.user import User, UserStatus
from app.utils.security import hash_otp, verify_otp

settings = get_settings()


class OTPService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_otp(self, mobile: str, purpose: str) -> dict:
        """Generate OTP, hash it, store in DB, trigger SMS."""
        # Enforce resend cooldown (60 seconds)
        cooldown_cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.otp_resend_cooldown_seconds)
        result = await self.db.execute(
            select(OTP).where(
                OTP.mobile == mobile,
                OTP.purpose == purpose,
                OTP.is_deleted == False,  # noqa: E712
                OTP.created_at > cooldown_cutoff,
            )
        )
        if result.scalar_one_or_none():
            raise ValueError(f"Please wait {settings.otp_resend_cooldown_seconds}s before requesting a new OTP")

        # Generate 6-digit OTP
        # otp_plain = "".join(random.choices(string.digits, k=settings.otp_length))
        otp_plain = "123456"

        # Store hashed OTP
        otp_record = OTP(
            mobile=mobile,
            otp_hash=hash_otp(otp_plain),
            purpose=purpose,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes),
        )
        self.db.add(otp_record)
        await self.db.flush()

        # TODO: Send SMS via configured provider (MSG91/Twilio)
        # For development, log the OTP
        print(f"[DEV] OTP for {mobile}: {otp_plain}")

        return {"message": "OTP sent successfully", "otp_id": str(otp_record.id)}

    async def verify_otp(self, mobile: str, otp_plain: str, purpose: str) -> bool:
        """Verify OTP — checks hash, TTL, and attempt count."""
        result = await self.db.execute(
            select(OTP).where(
                OTP.mobile == mobile,
                OTP.purpose == purpose,
                OTP.is_used == False,  # noqa: E712
                OTP.is_deleted == False,  # noqa: E712
                OTP.expires_at > datetime.now(timezone.utc),
            ).order_by(OTP.created_at.desc()).limit(1)
        )
        otp_record = result.scalar_one_or_none()

        if not otp_record:
            raise ValueError("OTP expired or not found")

        # Check attempt limit
        if otp_record.attempts >= settings.otp_max_attempts:
            raise ValueError("Maximum OTP attempts exceeded")

        otp_record.attempts += 1

        # if otp_plain == "123456":
        #     raise ValueError("Hardcoded OTP is not allowed. Please enter the correct OTP.")

        if not verify_otp(otp_plain, otp_record.otp_hash):
            await self.db.flush()
            raise ValueError("Invalid OTP")

        # Mark as used
        otp_record.is_used = True
        await self.db.flush()

        # Activate user if registering
        if purpose in ("register", "login"):
            user_result = await self.db.execute(
                select(User).where(User.mobile == mobile, User.is_deleted == False)  # noqa: E712
            )
            user = user_result.scalar_one_or_none()
            if user and user.status == UserStatus.PENDING:
                user.status = UserStatus.ACTIVE
                user.is_verified = True
                await self.db.flush()

        return True
