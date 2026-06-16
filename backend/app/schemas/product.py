"""Product and Category Pydantic schemas."""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ── Product ──────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    return_policy: Optional[str] = "No returns allowed"
    return_window_days: int = 7
    unit: str = "piece"
    hsn_code: Optional[str] = None
    base_price: int = Field(..., gt=0, description="Price in paise")
    vendor_price: Optional[int] = None
    retailer_price: Optional[int] = None
    gst_rate: int = Field(default=18, description="GST rate: 0, 5, 12, 18, or 28")
    stock_qty: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    category_id: UUID
    sub_category_id: Optional[UUID] = None
    status: str = "active"
    image_urls: Optional[List[str]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    return_policy: Optional[str] = None
    return_window_days: Optional[int] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    base_price: Optional[int] = None
    vendor_price: Optional[int] = None
    retailer_price: Optional[int] = None
    gst_rate: Optional[int] = None
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    category_id: Optional[UUID] = None
    sub_category_id: Optional[UUID] = None
    status: Optional[str] = None
    image_urls: Optional[List[str]] = None


class ProductImageResponse(BaseModel):
    id: UUID
    image_url: str
    sort_order: int
    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    sku: str
    description: Optional[str]
    return_policy: Optional[str] = None
    return_window_days: int = 7
    unit: str
    hsn_code: Optional[str]
    base_price: int
    gst_rate: int
    stock_qty: int
    low_stock_threshold: int
    status: str
    category_id: UUID
    sub_category_id: Optional[UUID] = None
    images: List[ProductImageResponse] = []
    vendor_price: Optional[int] = None
    retailer_price: Optional[int] = None

    model_config = {"from_attributes": True}


class BulkPriceUpdate(BaseModel):
    product_id: UUID
    vendor_price: Optional[int] = None
    retailer_price: Optional[int] = None


class StockAdjustment(BaseModel):
    adjustment: int  # positive to add, negative to subtract
    reason: str
