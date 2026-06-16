"""Order, Cart, and Payment Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ── Cart ─────────────────────────────────────────────────────

class CartAddRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_sku: Optional[str] = None
    product_image_url: Optional[str] = None
    quantity: int
    price_snapshot: int
    gst_rate: int
    is_deleted: bool
    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    id: UUID
    items: List[CartItemResponse] = []
    model_config = {"from_attributes": True}


class CartValidation(BaseModel):
    valid: bool
    reason: Optional[str] = None
    shortfall_amount: int = 0


# ── Order ────────────────────────────────────────────────────

class ApplyCouponRequest(BaseModel):
    code: str


class OrderCreateRequest(BaseModel):
    delivery_address: Optional[str] = None
    discount_code: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|dispatched|delivered|cancelled)$")


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_image_url: Optional[str] = None
    quantity: int
    unit_price: int
    gst_rate: int
    line_total: int
    gst_amount: int
    return_policy: Optional[str] = None
    return_window_days: Optional[int] = None
    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    status: str
    subtotal: int
    gst_amount: int
    discount_amount: int
    grand_total: int
    delivery_address: Optional[str]
    created_at: datetime
    items: List[OrderItemResponse] = []
    return_image_url: Optional[str] = None
    return_reason: Optional[str] = None
    model_config = {"from_attributes": True}


class OrderReturnRequest(BaseModel):
    return_image_url: str = Field(..., description="Mandatory URL of captured return verification image")
    return_reason: Optional[str] = None


class PaymentInitiateRequest(BaseModel):
    order_id: UUID


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class ManualPaymentRequest(BaseModel):
    retailer_id: UUID
    amount: int = Field(..., gt=0, description="Amount in paise")
    method: str = Field(default="cash", pattern="^(cash|cheque|manual)$")
    notes: Optional[str] = None
    order_id: Optional[UUID] = None


class PaymentResponse(BaseModel):
    id: UUID
    order_id: UUID
    amount: int
    status: str
    method: str
    gateway_order_id: Optional[str]
    gateway_payment_id: Optional[str]
    model_config = {"from_attributes": True}


# ── Credit Limit ─────────────────────────────────────────────

class CreditLimitUpdate(BaseModel):
    credit_limit: int = Field(..., ge=0, description="Credit limit in paise")
