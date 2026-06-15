"""Notification router — user notifications listing, read-marking, and device token registration."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification, DeviceToken
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class DeviceTokenRegisterRequest(BaseModel):
    token: str = Field(..., description="FCM device token")
    platform: str = Field(..., pattern="^(android|ios)$", description="Device platform")


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve in-app notifications for the authenticated user, ordered by creation date desc."""
    query = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False
    ).order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    notifications = result.scalars().all()
    return notifications


@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
            Notification.is_deleted == False
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.flush()
    return {"success": True, "message": "Notification marked as read"}


@router.post("/tokens")
async def register_device_token(
    req: DeviceTokenRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or update an FCM device token for push notifications."""
    # Check if token already exists for the user
    stmt = select(DeviceToken).where(
        DeviceToken.user_id == current_user.id,
        DeviceToken.token == req.token,
        DeviceToken.is_deleted == False
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        existing.platform = req.platform
        await db.flush()
        return {"success": True, "message": "Device token updated"}

    new_token = DeviceToken(
        user_id=current_user.id,
        token=req.token,
        platform=req.platform
    )
    db.add(new_token)
    await db.flush()
    return {"success": True, "message": "Device token registered"}
