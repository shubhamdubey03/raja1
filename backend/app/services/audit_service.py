"""Audit log service — records every admin action with diff JSON."""

import uuid
from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


def make_json_serializable(obj: Any) -> Any:
    """Recursively convert UUID/datetime to JSON-safe types."""
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(i) for i in obj]
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


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
            diff_json=make_json_serializable(diff_json),
            description=description,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry