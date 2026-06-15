"""Notification Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    body: str
    notification_type: str
    reference_id: Optional[UUID] = None
    is_read: bool
    delivery_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
