from __future__ import annotations

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    visible_to_vendor: bool = True
    visible_to_retailer: bool = True
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visible_to_vendor: Optional[bool] = None
    visible_to_retailer: Optional[bool] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    depth: int
    visible_to_vendor: bool
    visible_to_retailer: bool
    is_active: bool

    model_config = {"from_attributes": True}


class CategoryTreeResponse(CategoryResponse):
    subcategories: List["CategoryTreeResponse"] = Field(default_factory=list)

