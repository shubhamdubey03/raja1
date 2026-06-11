"""
Retailer profile — self-registration with credit limit support.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Retailer(BaseModel):
    """
    Retailer profile extending the base User record.

    - Self-registers via mobile OTP
    - credit_limit stored in paise (integer)
    """

    __tablename__ = "retailers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Credit ───────────────────────────────────────────────
    # Stored in paise (integer) to avoid floating point errors
    credit_limit: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────────
    user = relationship("User", back_populates="retailer_profile")
