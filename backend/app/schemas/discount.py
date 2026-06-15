from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.discount import DiscountType, SchemeType


class DiscountCodeCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    discount_type: DiscountType
    value: int = Field(..., description="Value in paise or percent * 100")
    min_order_value: int = Field(default=0, ge=0)
    max_usage_count: int = Field(default=0, ge=0)
    valid_from: datetime
    valid_until: datetime
    scope_type: Optional[str] = None
    scope_id: Optional[UUID] = None
    applicable_to: str = "all"
    description: Optional[str] = None


class DiscountCodeUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    value: Optional[int] = None
    min_order_value: Optional[int] = None
    max_usage_count: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    scope_type: Optional[str] = None
    scope_id: Optional[UUID] = None
    applicable_to: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DiscountCodeResponse(BaseModel):
    id: UUID
    code: str
    discount_type: DiscountType
    value: int
    min_order_value: int
    max_usage_count: int
    current_usage: int
    valid_from: datetime
    valid_until: datetime
    scope_type: Optional[str]
    scope_id: Optional[UUID]
    applicable_to: str
    description: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


class DealerSchemeCreate(BaseModel):
    user_id: Optional[UUID] = None
    scheme_type: SchemeType
    product_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    min_qty: int = Field(default=0, ge=0)
    discount_pct: int = Field(default=0, ge=0)
    free_qty: int = Field(default=0, ge=0)
    valid_from: datetime
    valid_until: datetime
    description: Optional[str] = None


class DealerSchemeResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    scheme_type: SchemeType
    product_id: Optional[UUID]
    category_id: Optional[UUID]
    min_qty: int
    discount_pct: int
    free_qty: int
    valid_from: datetime
    valid_until: datetime
    description: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}
