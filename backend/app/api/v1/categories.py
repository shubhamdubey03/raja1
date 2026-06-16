from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.category import Category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryTreeResponse,
    CategoryUpdate,
)
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.category_service import (
    create_category,
    get_category_by_id,
    get_category_tree,
    list_categories,
    soft_delete_category,
    update_category,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category_endpoint(
    req: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin creates a category with up to 3 levels."""
    try:
        category = await create_category(req, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    audit = AuditService(db)
    await audit.log_action(current_user, "create_category", "category", category.id)
    return category


@router.get("/tree", response_model=List[CategoryTreeResponse])
async def get_category_tree_endpoint(
    db: AsyncSession = Depends(get_db),
):
    """Get full nested category tree."""
    return await get_category_tree(db)


@router.get("", response_model=List[CategoryResponse])
async def list_categories_endpoint(
    depth: Optional[int] = Query(None, ge=0, le=2),
    parent_id: Optional[UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List categories with optional depth, parent_id, and is_active filters."""
    return await list_categories(db, depth=depth, parent_id=parent_id, is_active=is_active)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category_endpoint(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single category by ID."""
    category = await get_category_by_id(category_id, db)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category_endpoint(
    category_id: UUID,
    req: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update category metadata without changing parent or depth."""
    category = await get_category_by_id(category_id, db)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    await update_category(category, req, db)
    audit = AuditService(db)
    await audit.log_action(current_user, "update_category", "category", category.id, req.model_dump(exclude_unset=True))
    return category


@router.delete("/{category_id}")
async def delete_category_endpoint(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete a category and all its children recursively."""
    category = await get_category_by_id(category_id, db)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    await soft_delete_category(category, db)
    audit = AuditService(db)
    await audit.log_action(current_user, "delete_category", "category", category.id)
    return {"message": "Category deleted"}
