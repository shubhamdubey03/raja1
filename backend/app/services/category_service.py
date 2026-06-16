from __future__ import annotations

import uuid
from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.utils.slug import generate_slug, generate_unique_slug

MAX_DEPTH = 2


async def _prepare_slug(slug: Optional[str], name: str, parent_id: Optional[UUID], db: AsyncSession) -> str:
    base = generate_slug(slug if slug else name)
    query = select(Category).where(
        Category.slug == base,
        Category.parent_id == parent_id,
        Category.is_deleted == False,
    )
    existing = await db.execute(query)
    if existing.scalar_one_or_none():
        return generate_unique_slug(base)
    return base


async def create_category(data: CategoryCreate, db: AsyncSession) -> Category:
    parent = None
    if data.parent_id:
        result = await db.execute(
            select(Category).where(Category.id == data.parent_id, Category.is_deleted == False)
        )
        parent = result.scalar_one_or_none()
        if not parent:
            raise ValueError("Parent category not found")
        depth = parent.depth + 1
        if depth > MAX_DEPTH:
            raise ValueError("Category depth cannot exceed 2")
    else:
        depth = 0

    slug = await _prepare_slug(data.slug, data.name, data.parent_id, db)
    category = Category(
        name=data.name,
        slug=slug,
        description=data.description,
        image_url=data.image_url,
        parent_id=data.parent_id,
        visible_to_vendor=data.visible_to_vendor,
        visible_to_retailer=data.visible_to_retailer,
        is_active=data.is_active,
        depth=depth,
    )
    db.add(category)
    await db.flush()
    return category


async def get_category_tree(db: AsyncSession) -> List[Category]:
    query = (
        select(Category)
        .where(Category.depth == 0, Category.is_deleted == False)
        .options(
            selectinload(Category.subcategories).selectinload(Category.subcategories)
        )
        .order_by(Category.name)
    )
    result = await db.execute(query)
    return result.scalars().all()


async def get_leaf_categories(db: AsyncSession) -> List[Category]:
    query = (
        select(Category)
        .where(Category.depth == MAX_DEPTH, Category.is_deleted == False)
        .order_by(Category.name)
    )
    result = await db.execute(query)
    return result.scalars().all()


async def list_categories(
    db: AsyncSession,
    depth: Optional[int] = None,
    parent_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
) -> List[Category]:
    query = select(Category).where(Category.is_deleted == False)
    if depth is not None:
        query = query.where(Category.depth == depth)
    if parent_id is not None:
        query = query.where(Category.parent_id == parent_id)
    if is_active is not None:
        query = query.where(Category.is_active == is_active)
    query = query.order_by(Category.name)
    result = await db.execute(query)
    return result.scalars().all()


async def get_category_by_id(category_id: UUID, db: AsyncSession) -> Optional[Category]:
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.is_deleted == False)
    )
    return result.scalar_one_or_none()


async def validate_leaf_category(category_id: UUID, db: AsyncSession) -> Category:
    category = await get_category_by_id(category_id, db)
    if not category:
        raise ValueError("Category not found")
    return category


async def update_category(category: Category, data: CategoryUpdate, db: AsyncSession) -> Category:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    await db.flush()
    return category


async def _soft_delete_recursive(category: Category, db: AsyncSession) -> None:
    from datetime import datetime, timezone

    category.is_deleted = True
    category.deleted_at = datetime.now(timezone.utc)
    child_result = await db.execute(
        select(Category).where(Category.parent_id == category.id, Category.is_deleted == False)
    )
    children = child_result.scalars().all()
    for child in children:
        await _soft_delete_recursive(child, db)


async def soft_delete_category(category: Category, db: AsyncSession) -> Category:
    await _soft_delete_recursive(category, db)
    await db.flush()
    return category
