from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_admin
from app.models.discount import DiscountCode, DealerScheme
from app.models.user import User
from app.schemas.discount import (
    DiscountCodeCreate,
    DiscountCodeResponse,
    DiscountCodeUpdate,
    DealerSchemeCreate,
    DealerSchemeResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["Discounts & Schemes"])


@router.post("/discounts", response_model=DiscountCodeResponse)
async def create_discount(
    req: DiscountCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new discount code."""
    audit = AuditService(db)
    
    # Check if code already exists
    stmt = select(DiscountCode).where(
        DiscountCode.code == req.code, DiscountCode.is_deleted == False
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discount code '{req.code}' already exists",
        )

    code_obj = DiscountCode(
        code=req.code,
        discount_type=req.discount_type,
        value=req.value,
        min_order_value=req.min_order_value,
        max_usage_count=req.max_usage_count,
        valid_from=req.valid_from,
        valid_until=req.valid_until,
        scope_type=req.scope_type,
        scope_id=req.scope_id,
        description=req.description,
    )
    db.add(code_obj)
    await db.flush()
    await audit.log_action(current_user, "create_discount", "discount_code", code_obj.id)
    return code_obj


@router.get("/discounts", response_model=List[DiscountCodeResponse])
async def list_discounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all discount codes."""
    stmt = select(DiscountCode).where(DiscountCode.is_deleted == False).order_by(DiscountCode.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/discounts/{discount_id}", response_model=DiscountCodeResponse)
async def update_discount(
    discount_id: UUID,
    req: DiscountCodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update an existing discount code."""
    audit = AuditService(db)
    stmt = select(DiscountCode).where(
        DiscountCode.id == discount_id, DiscountCode.is_deleted == False
    )
    code_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not code_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discount code not found",
        )

    update_data = req.model_dump(exclude_unset=True)
    if "code" in update_data:
        # Check uniqueness
        dup_stmt = select(DiscountCode).where(
            DiscountCode.code == update_data["code"],
            DiscountCode.id != discount_id,
            DiscountCode.is_deleted == False,
        )
        dup = (await db.execute(dup_stmt)).scalar_one_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount code '{update_data['code']}' is already in use",
            )

    for k, v in update_data.items():
        setattr(code_obj, k, v)

    await db.flush()
    await audit.log_action(current_user, "update_discount", "discount_code", discount_id, update_data)
    return code_obj


@router.delete("/discounts/{discount_id}")
async def delete_discount(
    discount_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete a discount code."""
    audit = AuditService(db)
    stmt = select(DiscountCode).where(
        DiscountCode.id == discount_id, DiscountCode.is_deleted == False
    )
    code_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not code_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discount code not found",
        )

    code_obj.is_deleted = True
    code_obj.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await audit.log_action(current_user, "delete_discount", "discount_code", discount_id)
    return {"message": "Discount code deleted successfully"}


@router.post("/dealer-schemes", response_model=DealerSchemeResponse)
async def create_dealer_scheme(
    req: DealerSchemeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new dealer scheme."""
    audit = AuditService(db)
    scheme = DealerScheme(
        user_id=req.user_id,
        scheme_type=req.scheme_type,
        product_id=req.product_id,
        category_id=req.category_id,
        min_qty=req.min_qty,
        discount_pct=req.discount_pct,
        free_qty=req.free_qty,
        valid_from=req.valid_from,
        valid_until=req.valid_until,
        description=req.description,
    )
    db.add(scheme)
    await db.flush()
    await audit.log_action(current_user, "create_dealer_scheme", "dealer_scheme", scheme.id)
    return scheme


@router.get("/dealer-schemes", response_model=List[DealerSchemeResponse])
async def list_dealer_schemes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all dealer schemes."""
    stmt = select(DealerScheme).where(DealerScheme.is_deleted == False).order_by(DealerScheme.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/dealer-schemes/{scheme_id}")
async def delete_dealer_scheme(
    scheme_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete a dealer scheme."""
    audit = AuditService(db)
    stmt = select(DealerScheme).where(
        DealerScheme.id == scheme_id, DealerScheme.is_deleted == False
    )
    scheme = (await db.execute(stmt)).scalar_one_or_none()
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dealer scheme not found",
        )

    scheme.is_deleted = True
    scheme.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await audit.log_action(current_user, "delete_dealer_scheme", "dealer_scheme", scheme_id)
    return {"message": "Dealer scheme deleted successfully"}
