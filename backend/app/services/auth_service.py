"""
Auth service — business logic for authentication, JWT, and user management.

All auth flows centralised here; routers are thin wrappers.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import RefreshToken, User, UserRole, UserStatus
from app.models.vendor import Vendor
from app.models.retailer import Retailer
from app.utils import create_access_token, create_refresh_token, decode_token
from app.utils.security import hash_password, verify_password

settings = get_settings()


class AuthService:
    """Handles authentication, token management, and user CRUD."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Token Generation ─────────────────────────────────────

    async def generate_tokens(self, user: User) -> dict:
        """Generate access + refresh token pair for a user."""
        token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Store hashed refresh token in DB (single-use)
        rt = RefreshToken(
            user_id=user.id,
            token_hash=hash_password(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
        self.db.add(rt)
        await self.db.flush()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user.role.value,
            "user_id": user.id,
        }

    # ── Admin/SuperAdmin Login ───────────────────────────────

    async def admin_login(self, email: str, password: str) -> dict:
        """Authenticate admin/super_admin by email + password."""
        result = await self.db.execute(
            select(User).where(
                User.email == email,
                User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
                User.is_deleted == False,  # noqa: E712
            )
        )
        user = result.scalar_one_or_none()

        if not user or not user.password_hash:
            raise ValueError("Invalid credentials")
        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        if user.status == UserStatus.BLOCKED:
            raise PermissionError("Account is blocked")

        return await self.generate_tokens(user)

    # ── Vendor Login (by mobile after OTP) ───────────────────

    async def vendor_login(self, mobile: str) -> dict:
        """Authenticate vendor after OTP verification."""
        result = await self.db.execute(
            select(User).where(
                User.mobile == mobile,
                User.role == UserRole.VENDOR,
                User.is_deleted == False,  # noqa: E712
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Vendor account not found")
        if user.status == UserStatus.BLOCKED:
            raise PermissionError("Account is blocked")
        if user.status == UserStatus.PENDING:
            raise ValueError("Account pending verification")

        return await self.generate_tokens(user)

    # ── Retailer Login (by mobile after OTP) ─────────────────

    async def retailer_login(self, mobile: str) -> dict:
        """Authenticate retailer after OTP verification."""
        result = await self.db.execute(
            select(User).where(
                User.mobile == mobile,
                User.role == UserRole.RETAILER,
                User.is_deleted == False,  # noqa: E712
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Retailer account not found")
        if user.status in (UserStatus.BLOCKED, UserStatus.CREDIT_BLOCKED):
            raise PermissionError("Account is blocked")

        return await self.generate_tokens(user)

    # ── Refresh Token ────────────────────────────────────────

    async def refresh_access_token(self, refresh_token_str: str) -> dict:
        """Validate refresh token, revoke old one, issue new pair."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = UUID(payload["sub"])

        # Find valid (non-revoked) refresh tokens for this user
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,  # noqa: E712
                RefreshToken.is_deleted == False,  # noqa: E712
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        tokens = result.scalars().all()

        # Verify against stored hashes
        matched_token = None
        for rt in tokens:
            if verify_password(refresh_token_str, rt.token_hash):
                matched_token = rt
                break

        if not matched_token:
            raise ValueError("Refresh token not found or already used")

        # Revoke old token (single-use)
        matched_token.is_revoked = True
        await self.db.flush()

        # Fetch user and generate new pair
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        return await self.generate_tokens(user)

    # ── Admin Creates Vendor ─────────────────────────────────

    async def create_vendor(self, data: dict) -> User:
        """Admin creates a vendor account with a password."""
        # Check duplicate mobile
        existing = await self.db.execute(
            select(User).where(User.mobile == data["mobile"], User.is_deleted == False)  # noqa: E712
        )
        if existing.scalar_one_or_none():
            raise ValueError("Mobile number already registered")

        user = User(
            mobile=data["mobile"],
            full_name=data["full_name"],
            role=UserRole.VENDOR,
            status=UserStatus.ACTIVE,
            is_verified=True,
            password_hash=hash_password(data["password"]),
            geo_location=data.get("geo_location"),
        )
        self.db.add(user)
        await self.db.flush()

        vendor = Vendor(
            user_id=user.id,
            business_name=data["business_name"],
            gst_number=data.get("gst_number"),
            pan_number=data.get("pan_number"),
            address=data.get("address"),
            city=data.get("city"),
            state=data.get("state"),
            pincode=data.get("pincode"),
        )
        self.db.add(vendor)
        await self.db.flush()
        return user

    async def vendor_password_login(self, mobile: str, password: str) -> dict:
        """Authenticate vendor by mobile number + password."""
        result = await self.db.execute(
            select(User).where(
                User.mobile == mobile,
                User.role == UserRole.VENDOR,
                User.is_deleted == False,  # noqa: E712
            )
        )
        user = result.scalar_one_or_none()

        if not user or not user.password_hash:
            raise ValueError("Invalid credentials")
        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        if user.status == UserStatus.BLOCKED:
            raise PermissionError("Account is blocked")

        return await self.generate_tokens(user)

    # ── Retailer Self-Registration ───────────────────────────

    async def register_retailer(self, data: dict) -> User:
        """Retailer self-registers — account activated immediately after OTP."""
        existing = await self.db.execute(
            select(User).where(User.mobile == data["mobile"], User.is_deleted == False)  # noqa: E712
        )
        if existing.scalar_one_or_none():
            raise ValueError("Mobile number already registered")

        user = User(
            mobile=data["mobile"],
            full_name=data["owner_name"],
            role=UserRole.RETAILER,
            status=UserStatus.PENDING,
            is_verified=False,
            geo_location=data.get("geo_location"),
        )
        self.db.add(user)
        await self.db.flush()

        retailer = Retailer(
            user_id=user.id,
            business_name=data["business_name"],
            owner_name=data["owner_name"],
            business_type=data.get("business_type"),
            gst_number=data.get("gst_number"),
            address=data.get("address"),
            city=data.get("city"),
            state=data.get("state"),
            pincode=data.get("pincode"),
        )
        self.db.add(retailer)
        await self.db.flush()
        return user

    # ── Admin CRUD ───────────────────────────────────────────

    async def create_admin(self, data: dict) -> User:
        """Super Admin creates an Admin account."""
        existing = await self.db.execute(
            select(User).where(User.email == data["email"], User.is_deleted == False)  # noqa: E712
        )
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        user = User(
            email=data["email"],
            mobile=data["mobile"],
            full_name=data["full_name"],
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_verified=True,
            password_hash=hash_password(data["password"]),
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def update_user_status(self, user_id: UUID, new_status: str) -> User:
        """Block or unblock a user."""
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)  # noqa: E712
        )
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        user.status = UserStatus(new_status)
        await self.db.flush()
        return user

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Fetch a user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def change_password(self, user: User, old_password: str, new_password: str) -> None:
        """Change user password with old password verification."""
        if not user.password_hash or not verify_password(old_password, user.password_hash):
            raise ValueError("Incorrect old password")
        user.password_hash = hash_password(new_password)
        await self.db.flush()
