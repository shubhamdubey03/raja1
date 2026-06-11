"""Notification and DeviceToken models for FCM push notifications."""

import uuid
from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)  # order, payment, alert, etc.
    reference_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    delivery_status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")


class DeviceToken(BaseModel):
    __tablename__ = "device_tokens"
    __table_args__ = (Index("ix_device_tokens_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # android, ios
