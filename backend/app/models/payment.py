"""Payment model — Razorpay integration with webhook support."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class PaymentStatus(str, enum.Enum):
    INITIATED = "initiated"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    ONLINE = "online"
    CASH = "cash"
    CHEQUE = "cheque"
    MANUAL = "manual"


class Payment(BaseModel):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_user_id", "user_id"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.INITIATED, server_default="initiated", nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="payment_method_enum"), default=PaymentMethod.ONLINE, nullable=False)
    gateway_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gateway_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    order = relationship("Order", back_populates="payments")
