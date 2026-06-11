"""
Cart model — user-session persistent in DB.

Price snapshot taken on add (not recalculated dynamically).
"""

import uuid

from sqlalchemy import ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Cart(BaseModel):
    """Per-user shopping cart persisted in database."""

    __tablename__ = "carts"
    __table_args__ = (
        Index("ix_carts_user_id", "user_id", unique=True, postgresql_where="is_deleted = false"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    items = relationship("CartItem", back_populates="cart", lazy="selectin")


class CartItem(BaseModel):
    """
    Individual cart line item.

    price_snapshot: locked at time of add (paise).
    """

    __tablename__ = "cart_items"
    __table_args__ = (
        Index("ix_cart_items_cart_product", "cart_id", "product_id", unique=True, postgresql_where="is_deleted = false"),
    )

    cart_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("carts.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    price_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)  # paise at time of add

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product", lazy="selectin")
