"""OTP model — bcrypt hashed, 5-min TTL, 3-attempt limit."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class OTP(BaseModel):
    __tablename__ = "otps"
    __table_args__ = (Index("ix_otps_mobile", "mobile"),)

    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    otp_hash: Mapped[str] = mapped_column(Text, nullable=False)  # bcrypt hash, never plaintext
    purpose: Mapped[str] = mapped_column(String(30), nullable=False)  # login, register, change_mobile
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_used: Mapped[bool] = mapped_column(default=False, server_default="false")
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
