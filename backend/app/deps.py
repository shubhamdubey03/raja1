"""
FastAPI dependencies — auth, RBAC, database session.

RBAC enforced at service layer per security requirements.
"""

from typing import List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.utils import decode_token

settings = get_settings()
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated user. Raises 401/403."""
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == UUID(user_id), User.is_deleted == False))  # noqa: E712
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status == UserStatus.BLOCKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is blocked")
    if user.status == UserStatus.DEACTIVATED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    if user.status == UserStatus.CREDIT_BLOCKED:
        # Credit-blocked users can still authenticate but specific actions are restricted
        pass

    return user


def require_roles(allowed_roles: List[UserRole]):
    """Factory — returns a dependency that enforces role-based access."""

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return role_checker


# ── Convenience role guards ──────────────────────────────────
require_super_admin = require_roles([UserRole.SUPER_ADMIN])
require_admin = require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])
require_vendor = require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VENDOR])
require_retailer = require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RETAILER])
require_any_authenticated = require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VENDOR, UserRole.RETAILER])
