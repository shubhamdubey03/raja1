"""
Order and OrderItem models.
All amounts in paise (integer).
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class Order(BaseModel):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_user_id", "user_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_order_number", "order_number", unique=True),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus, name="order_status_enum"), default=OrderStatus.PENDING, server_default="pending", nullable=False)
    subtotal: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gst_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discount_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    grand_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_code_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("discount_codes.id", ondelete="SET NULL"), nullable=True)
    voice_order: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    voice_clip_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    eway_bill_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    eway_bill_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    return_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    return_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", lazy="selectin")
    items = relationship("OrderItem", back_populates="order", lazy="selectin")
    payments = relationship("Payment", back_populates="order", lazy="noload")
    invoice = relationship("Invoice", back_populates="order", uselist=False, lazy="noload")


class OrderItem(BaseModel):
    __tablename__ = "order_items"
    __table_args__ = (Index("ix_order_items_order_id", "order_id"),)

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)
    gst_rate: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[int] = mapped_column(Integer, nullable=False)
    gst_amount: Mapped[int] = mapped_column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", lazy="selectin")

    @property
    def product_image_url(self) -> str | None:
        """First product image for display in order cards."""
        try:
            if not self.product:
                return None
            images = self.product.images
            return images[0].image_url if images else None
        except Exception:
            return None

    @property
    def return_policy(self) -> str | None:
        return self.product.return_policy if self.product else "No returns allowed"

    @property
    def return_window_days(self) -> int:
        return self.product.return_window_days if self.product else 7
