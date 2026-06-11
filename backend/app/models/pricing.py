"""
Role-based and dealer-specific pricing models.

Pricing precedence: dealer_pricing > role_pricing > base_price
All prices in paise (integer).
"""

import uuid

from sqlalchemy import ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class VendorPricing(BaseModel):
    """Role-based vendor price for a product — overrides base_price for vendors."""

    __tablename__ = "vendor_pricing"
    __table_args__ = (
        Index("ix_vendor_pricing_product", "product_id", unique=True, postgresql_where="is_deleted = false"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # paise

    product = relationship("Product", back_populates="vendor_pricing")


class RetailerPricing(BaseModel):
    """Role-based retailer price for a product — overrides base_price for retailers."""

    __tablename__ = "retailer_pricing"
    __table_args__ = (
        Index("ix_retailer_pricing_product", "product_id", unique=True, postgresql_where="is_deleted = false"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # paise

    product = relationship("Product", back_populates="retailer_pricing")


class DealerPricing(BaseModel):
    """
    Dealer-specific price override for a specific vendor or retailer.

    Precedence: dealer_pricing > role_pricing > base_price
    """

    __tablename__ = "dealer_pricing"
    __table_args__ = (
        Index(
            "ix_dealer_pricing_product_user",
            "product_id",
            "user_id",
            unique=True,
            postgresql_where="is_deleted = false",
        ),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
