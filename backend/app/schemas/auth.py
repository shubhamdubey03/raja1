"""Auth-related Pydantic schemas."""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: Optional[str] = None
    mobile: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: UUID


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class OTPSendRequest(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=15)
    purpose: str = Field(default="login", pattern="^(login|register|change_mobile)$")


class OTPVerifyRequest(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)
    purpose: str = Field(default="login", pattern="^(login|register|change_mobile)$")


class VendorCreateRequest(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=15)
    full_name: str = Field(..., min_length=2, max_length=255)
    business_name: str = Field(..., min_length=2, max_length=255)
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    geo_location: Optional[dict] = None


class RetailerRegisterRequest(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=15)
    owner_name: str = Field(..., min_length=2, max_length=255)
    business_name: str = Field(..., min_length=2, max_length=255)
    business_type: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    geo_location: Optional[dict] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class AdminCreateRequest(BaseModel):
    email: str
    full_name: str
    mobile: str
    password: str = Field(..., min_length=8)


class UserStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|blocked)$")


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    mobile: str
    email: Optional[str]
    full_name: str
    avatar_url: Optional[str]
    role: str
    status: str
    is_verified: bool
    retailer_profile: Optional["RetailerProfileResponse"] = None
    vendor_profile: Optional["VendorProfileResponse"] = None

    model_config = {"from_attributes": True}


class VendorProfileResponse(BaseModel):
    id: UUID
    business_name: str
    gst_number: Optional[str]
    pan_number: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]

    model_config = {"from_attributes": True}


class VendorUserResponse(BaseModel):
    id: UUID
    mobile: str
    email: Optional[str]
    full_name: str
    avatar_url: Optional[str]
    role: str
    status: str
    is_verified: bool
    vendor_profile: Optional[VendorProfileResponse] = None

    model_config = {"from_attributes": True}


class RetailerProfileResponse(BaseModel):
    id: UUID
    business_name: str
    owner_name: str
    business_type: Optional[str]
    gst_number: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    credit_limit: int

    model_config = {"from_attributes": True}


class RetailerUserResponse(BaseModel):
    id: UUID
    mobile: str
    email: Optional[str]
    full_name: str
    avatar_url: Optional[str]
    role: str
    status: str
    is_verified: bool
    retailer_profile: Optional[RetailerProfileResponse] = None

    model_config = {"from_attributes": True}

