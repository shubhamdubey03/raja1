"""Audit log service — records every admin action with diff JSON."""

from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        actor: User,
        action: str,
        entity_type: str,
        entity_id: Optional[UUID] = None,
        diff_json: Optional[dict] = None,
        description: Optional[str] = None,
    ) -> AuditLog:
        """Append an audit log entry — enforced at service layer."""
        entry = AuditLog(
            actor_id=actor.id,
            role=actor.role.value,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            diff_json=diff_json,
            description=description,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry
