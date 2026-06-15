"""Notification Service — handles in-app notification persistence and FCM push delivery."""

import os
import uuid
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.notification import Notification, DeviceToken

logger = structlog.get_logger()
settings = get_settings()


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        user_id: uuid.UUID,
        title: str,
        body: str,
        notification_type: str,
        reference_id: uuid.UUID | None = None
    ) -> Notification:
        """Create and persist an in-app notification in DB."""
        notification = Notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type=notification_type,
            reference_id=reference_id,
            delivery_status="pending",
        )
        self.db.add(notification)
        await self.db.flush()

        # Trigger FCM push delivery
        try:
            tokens_sent = await self.send_fcm_push(user_id, title, body)
            if tokens_sent > 0:
                notification.delivery_status = "sent"
        except Exception as e:
            logger.warn("fcm_send_failed", error=str(e))
            notification.delivery_status = "failed"

        await self.db.flush()
        return notification

    async def send_fcm_push(self, user_id: uuid.UUID, title: str, body: str) -> int:
        """Send FCM push message to all active device tokens of a user. Returns number of sent tokens."""
        # Find device tokens
        result = await self.db.execute(
            select(DeviceToken).where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_deleted == False
            )
        )
        tokens = result.scalars().all()
        if not tokens:
            return 0

        # Try to initialize Firebase App and send push
        import firebase_admin
        from firebase_admin import credentials, messaging

        # If credentials file does not exist, log it and return (no crash)
        if not settings.fcm_credentials_path or not os.path.exists(settings.fcm_credentials_path):
            logger.info("fcm_credentials_not_found", path=settings.fcm_credentials_path)
            return 0

        # Initialize firebase admin if not already initialized
        try:
            firebase_admin.get_app()
        except ValueError:
            try:
                cred = credentials.Certificate(settings.fcm_credentials_path)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                logger.error("fcm_initialization_failed", error=str(e))
                return 0

        sent_count = 0
        for token_obj in tokens:
            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body,
                    ),
                    token=token_obj.token,
                )
                messaging.send(message)
                sent_count += 1
            except Exception as e:
                logger.warn("fcm_single_token_send_failed", token=token_obj.token, error=str(e))

        return sent_count
