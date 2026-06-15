"""
Auth router — handles all authentication endpoints.

P2-01 through P2-10 endpoints.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user, require_super_admin, require_admin
from app.models.user import User, UserRole
from app.schemas.auth import (
    AdminCreateRequest,
    ChangePasswordRequest,
    LoginRequest,
    OTPSendRequest,
    OTPVerifyRequest,
    ProfileUpdateRequest,
    RefreshTokenRequest,
    RetailerRegisterRequest,
    TokenResponse,
    UserResponse,
    UserStatusUpdate,
    VendorCreateRequest,
    VendorUserResponse,
    RetailerUserResponse,
)
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService
from app.services.audit_service import AuditService

router = APIRouter(tags=["Authentication"])


# ── P2-03: Super Admin / Admin Login ─────────────────────────

@router.post("/admin/auth/login", response_model=TokenResponse)
async def admin_login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Admin/SuperAdmin login via email + password."""
    svc = AuthService(db)
    try:
        return await svc.admin_login(req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# ── P2-01: Token Refresh ────────────────────────────────────

@router.post("/auth/token/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using single-use refresh token."""
    svc = AuthService(db)
    try:
        return await svc.refresh_access_token(req.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


# ── P2-04: Admin Management (Super Admin only) ──────────────

@router.post("/admin/users", response_model=UserResponse, dependencies=[Depends(require_super_admin)])
async def create_admin(
    req: AdminCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Super Admin creates an Admin account."""
    svc = AuthService(db)
    audit = AuditService(db)
    try:
        user = await svc.create_admin(req.model_dump())
        await audit.log_action(current_user, "create_admin", "user", user.id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/admin/users", response_model=List[UserResponse], dependencies=[Depends(require_super_admin)])
async def list_admins(db: AsyncSession = Depends(get_db)):
    """List all Admin users."""
    result = await db.execute(
        select(User).where(User.role == UserRole.ADMIN, User.is_deleted == False)  # noqa: E712
    )
    return result.scalars().all()


@router.get("/admin/vendors", response_model=List[VendorUserResponse], dependencies=[Depends(require_admin)])
async def list_vendors(db: AsyncSession = Depends(get_db)):
    """List all Vendor users with their profiles."""
    result = await db.execute(
        select(User).where(User.role == UserRole.VENDOR, User.is_deleted == False)  # noqa: E712
    )
    return result.scalars().all()


@router.get("/admin/retailers", response_model=List[RetailerUserResponse], dependencies=[Depends(require_admin)])
async def list_retailers(db: AsyncSession = Depends(get_db)):
    """List all Retailer users with their profiles."""
    result = await db.execute(
        select(User).where(User.role == UserRole.RETAILER, User.is_deleted == False)  # noqa: E712
    )
    return result.scalars().all()


@router.patch("/admin/users/{user_id}/status", response_model=UserResponse)
async def update_admin_status(
    user_id: UUID,
    req: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Super Admin activates/deactivates Admin accounts."""
    svc = AuthService(db)
    audit = AuditService(db)
    try:
        user = await svc.update_user_status(user_id, req.status)
        await audit.log_action(current_user, "update_user_status", "user", user_id, {"status": req.status})
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── P2-05: Vendor Auth (Admin-Created) ──────────────────────

@router.post("/vendor/create", response_model=UserResponse)
async def create_vendor(
    req: VendorCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin creates a Vendor account; system sends OTP to vendor mobile."""
    svc = AuthService(db)
    otp_svc = OTPService(db)
    audit = AuditService(db)
    try:
        user = await svc.create_vendor(req.model_dump())
        await otp_svc.send_otp(req.mobile, "register")
        await audit.log_action(current_user, "create_vendor", "vendor", user.id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/vendor/auth/login")
async def vendor_login(req: OTPSendRequest, db: AsyncSession = Depends(get_db)):
    """Vendor requests OTP for login."""
    result = await db.execute(
        select(User).where(User.mobile == req.mobile, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mobile number not registered. Please request access.")
    if user.role != UserRole.VENDOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This number is registered as a Retailer, not a Vendor.")

    otp_svc = OTPService(db)
    try:
        return await otp_svc.send_otp(req.mobile, "login")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))


@router.post("/vendor/auth/otp/verify", response_model=TokenResponse)
async def vendor_otp_verify(req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Vendor verifies OTP and receives JWT tokens."""
    otp_svc = OTPService(db)
    auth_svc = AuthService(db)
    try:
        await otp_svc.verify_otp(req.mobile, req.otp, req.purpose)
        return await auth_svc.vendor_login(req.mobile)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# ── P2-06: Retailer Self-Registration ───────────────────────

@router.post("/retailer/auth/register", response_model=UserResponse)
async def retailer_register(req: RetailerRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Retailer self-registration — triggers OTP to mobile."""
    auth_svc = AuthService(db)
    otp_svc = OTPService(db)
    try:
        user = await auth_svc.register_retailer(req.model_dump())
        await otp_svc.send_otp(req.mobile, "register")
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/retailer/auth/otp/verify", response_model=TokenResponse)
async def retailer_otp_verify(req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Retailer verifies OTP — immediate account activation."""
    otp_svc = OTPService(db)
    auth_svc = AuthService(db)
    try:
        await otp_svc.verify_otp(req.mobile, req.otp, req.purpose)
        return await auth_svc.retailer_login(req.mobile)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# ── P2-07: OTP Service Endpoints ────────────────────────────

@router.post("/otp/send")
async def send_otp(req: OTPSendRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP to mobile number."""
    if req.purpose == "login":
        result = await db.execute(
            select(User).where(User.mobile == req.mobile, User.is_deleted == False)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mobile number not registered. Please register first.")
        if user.role != UserRole.RETAILER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This number is registered as a Vendor, not a Retailer.")

    otp_svc = OTPService(db)
    try:
        return await otp_svc.send_otp(req.mobile, req.purpose)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))


@router.post("/otp/verify")
async def verify_otp(req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP code."""
    otp_svc = OTPService(db)
    try:
        await otp_svc.verify_otp(req.mobile, req.otp, req.purpose)
        return {"verified": True}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── P2-08: Profile APIs ─────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    req: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile."""
    update_data = req.model_dump(exclude_unset=True)
    if "full_name" in update_data:
        current_user.full_name = update_data["full_name"]
    if "email" in update_data:
        current_user.email = update_data["email"]
    if "avatar_url" in update_data:
        current_user.avatar_url = update_data["avatar_url"]
    await db.flush()
    return current_user


@router.patch("/me/password")
async def change_password(
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password for current user."""
    svc = AuthService(db)
    try:
        await svc.change_password(current_user, req.old_password, req.new_password)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── P2-09: Admin Block / Unblock Users ──────────────────────

@router.patch("/admin/vendors/{vendor_id}/status", response_model=UserResponse)
async def update_vendor_status(
    vendor_id: UUID,
    req: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin blocks/unblocks a vendor."""
    svc = AuthService(db)
    audit = AuditService(db)
    try:
        user = await svc.update_user_status(vendor_id, req.status)
        await audit.log_action(current_user, "update_vendor_status", "vendor", vendor_id, {"status": req.status})
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/admin/retailers/{retailer_id}/status", response_model=UserResponse)
async def update_retailer_status(
    retailer_id: UUID,
    req: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin blocks/unblocks a retailer."""
    svc = AuthService(db)
    audit = AuditService(db)
    try:
        user = await svc.update_user_status(retailer_id, req.status)
        await audit.log_action(current_user, "update_retailer_status", "retailer", retailer_id, {"status": req.status})
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
