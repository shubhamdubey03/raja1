"""Product and Category Pydantic schemas."""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ── Category ─────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    visible_to_vendor: bool = True
    visible_to_retailer: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    visible_to_vendor: Optional[bool] = None
    visible_to_retailer: Optional[bool] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    image_url: Optional[str]
    parent_id: Optional[UUID]
    visible_to_vendor: bool
    visible_to_retailer: bool
    is_active: bool

    model_config = {"from_attributes": True}


# ── Product ──────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    unit: str = "piece"
    hsn_code: Optional[str] = None
    base_price: int = Field(..., gt=0, description="Price in paise")
    vendor_price: Optional[int] = None
    retailer_price: Optional[int] = None
    gst_rate: int = Field(default=18, description="GST rate: 0, 5, 12, 18, or 28")
    stock_qty: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    category_id: UUID
    status: str = "active"
    image_urls: Optional[List[str]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    base_price: Optional[int] = None
    vendor_price: Optional[int] = None
    retailer_price: Optional[int] = None
    gst_rate: Optional[int] = None
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    category_id: Optional[UUID] = None
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
    unit: str
    hsn_code: Optional[str]
    base_price: int
    gst_rate: int
    stock_qty: int
    low_stock_threshold: int
    status: str
    category_id: UUID
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
