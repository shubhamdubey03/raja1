"""
User model — handles all roles: super_admin, admin, vendor, retailer.

JWT refresh tokens stored separately with hashed token value.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    VENDOR = "vendor"
    RETAILER = "retailer"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    PENDING = "pending"
    CREDIT_BLOCKED = "credit_blocked"
    DEACTIVATED = "deactivated"


class User(BaseModel):
    """
    Central user table for all roles.

    - Super Admin / Admin: email + password login
    - Vendor / Retailer: mobile + OTP login
    """

    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_mobile", "mobile", unique=True, postgresql_where="is_deleted = false"),
        Index("ix_users_email", "email", unique=True, postgresql_where="is_deleted = false AND email IS NOT NULL"),
        Index("ix_users_role", "role"),
    )

    # ── Identity ─────────────────────────────────────────────
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Profile ──────────────────────────────────────────────
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", create_constraint=True),
        nullable=False,
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status_enum", create_constraint=True),
        default=UserStatus.ACTIVE,
        server_default="active",
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # ── Geo-location (P2-10) ─────────────────────────────────
    # Stored as JSONB {lat, lng} for MVP; PostGIS upgrade later
    geo_location: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # ── Relationships ────────────────────────────────────────
    vendor_profile = relationship("Vendor", back_populates="user", uselist=False, lazy="selectin")
    retailer_profile = relationship("Retailer", back_populates="user", uselist=False, lazy="selectin")
    refresh_tokens = relationship("RefreshToken", back_populates="user", lazy="noload")


class RefreshToken(BaseModel):
    """
    Single-use refresh tokens — hashed value stored in DB.

    On use: old token invalidated, new token issued.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index("ix_refresh_tokens_user_id", "user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # ── Relationships ────────────────────────────────────────
    user = relationship("User", back_populates="refresh_tokens")
