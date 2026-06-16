"""Discount codes and dealer-specific scheme models."""

import enum
import uuid
from datetime import datetime


from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class DiscountType(str, enum.Enum):
    FLAT = "flat"
    PERCENTAGE = "percentage"


class SchemeType(str, enum.Enum):
    VOLUME = "volume"          # buy X qty get Y% off
    BUY_X_GET_Y = "buy_x_get_y"


class DiscountCode(BaseModel):
    __tablename__ = "discount_codes"
    __table_args__ = (
        Index("ix_discount_code", "code", unique=True, postgresql_where="is_deleted = false"),
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(Enum(DiscountType, name="discount_type_enum"), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)  # paise for flat, percentage * 100 for percentage
    min_order_value: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # paise
    max_usage_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # 0 = unlimited
    current_usage: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scope_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # product, category, or null for global
    scope_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    applicable_to: Mapped[str] = mapped_column(String(20), default="all", server_default="all")  # all, vendor, or retailer
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False)


class DealerScheme(BaseModel):
    __tablename__ = "dealer_schemes"
    __table_args__ = (Index("ix_dealer_schemes_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # null = all dealers
    scheme_type: Mapped[SchemeType] = mapped_column(Enum(SchemeType, name="scheme_type_enum"), nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    min_qty: Mapped[int] = mapped_column(Integer, default=0)       # volume: min qty to qualify
    discount_pct: Mapped[int] = mapped_column(Integer, default=0)   # percentage * 100
    free_qty: Mapped[int] = mapped_column(Integer, default=0)       # buy-x-get-y: free qty
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
