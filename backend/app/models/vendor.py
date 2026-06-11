"""
Vendor (Wholesaler) profile — created by Admin, linked to User.
"""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Vendor(BaseModel):
    """
    Vendor profile extending the base User record.

    Admin creates vendor accounts; vendor verifies via OTP.
    """

    __tablename__ = "vendors"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(15), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Relationships ────────────────────────────────────────
    user = relationship("User", back_populates="vendor_profile")
