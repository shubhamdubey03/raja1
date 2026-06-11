"""
Order, Cart, and Payment router — Phase 3B/3C endpoints.
"""

import uuid as uuid_mod
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.product import Product
from app.models.ledger import LedgerEntry, LedgerType
from app.models.retailer import Retailer
from app.models.user import User, UserRole, UserStatus
from app.schemas.order import (
    CartAddRequest,
    CartItemUpdate,
    CartResponse,
    CartValidation,
    CreditLimitUpdate,
    ManualPaymentRequest,
    OrderCreateRequest,
    OrderResponse,
    OrderStatusUpdate,
    PaymentResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(tags=["Orders & Payments"])


# ── P3-08: Cart API ──────────────────────────────────────────

@router.post("/cart/add")
async def add_to_cart(
    req: CartAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add product to cart with price snapshot."""
    # Get or create cart
    result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id, Cart.is_deleted == False)  # noqa: E712
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.flush()

    # Get product and price
    prod_result = await db.execute(
        select(Product).where(Product.id == req.product_id, Product.is_deleted == False)  # noqa: E712
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock_qty < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Check existing item
    existing = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_id == req.product_id,
            CartItem.is_deleted == False,  # noqa: E712
        )
    )
    item = existing.scalar_one_or_none()
    if item:
        item.quantity += req.quantity
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=req.product_id,
            quantity=req.quantity,
            price_snapshot=product.base_price,
        )
        db.add(item)

    await db.flush()
    return {"message": "Item added to cart"}


@router.get("/cart", response_model=CartResponse)
async def get_cart(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current user's cart."""
    result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id, Cart.is_deleted == False)  # noqa: E712
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.flush()
    return cart


@router.patch("/cart/items/{item_id}")
async def update_cart_item(
    item_id: UUID, req: CartItemUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Update cart item quantity."""
    result = await db.execute(select(CartItem).where(CartItem.id == item_id, CartItem.is_deleted == False))  # noqa: E712
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = req.quantity
    await db.flush()
    return {"message": "Cart item updated"}


@router.delete("/cart/items/{item_id}")
async def remove_cart_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    """Remove item from cart (soft-delete)."""
    result = await db.execute(select(CartItem).where(CartItem.id == item_id, CartItem.is_deleted == False))  # noqa: E712
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.is_deleted = True
    item.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Item removed from cart"}


# ── P3-09: MOV Validation ───────────────────────────────────

@router.get("/cart/validate", response_model=CartValidation)
async def validate_cart(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Validate cart against minimum order value."""
    result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id, Cart.is_deleted == False)  # noqa: E712
    )
    cart = result.scalar_one_or_none()
    if not cart or not cart.items:
        return CartValidation(valid=False, reason="Cart is empty", shortfall_amount=0)

    total = sum(i.price_snapshot * i.quantity for i in cart.items if not i.is_deleted)
    mov = 50000  # 500 INR in paise — TODO: make configurable via admin settings
    if total < mov:
        return CartValidation(valid=False, reason="Minimum order value not met", shortfall_amount=mov - total)
    return CartValidation(valid=True)


# ── P3-10: Order Placement (Atomic) ─────────────────────────

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    req: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Place order — atomic: creates order, reserves stock, generates ledger entry."""
    # P3-13: Credit limit check for retailers
    if current_user.role == UserRole.RETAILER:
        ret_result = await db.execute(
            select(Retailer).where(Retailer.user_id == current_user.id)
        )
        retailer = ret_result.scalar_one_or_none()
        if retailer and retailer.credit_limit > 0:
            # Calculate outstanding balance
            balance_result = await db.execute(
                select(func.coalesce(
                    func.sum(func.case(
                        (LedgerEntry.entry_type == LedgerType.DEBIT, LedgerEntry.amount),
                        else_=-LedgerEntry.amount,
                    )), 0
                )).where(LedgerEntry.user_id == current_user.id, LedgerEntry.is_deleted == False)  # noqa: E712
            )
            outstanding = balance_result.scalar() or 0
            if outstanding >= retailer.credit_limit:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Credit limit exceeded. Please clear outstanding balance.",
                )

    # Get cart
    cart_result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id, Cart.is_deleted == False)  # noqa: E712
    )
    cart = cart_result.scalar_one_or_none()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    active_items = [i for i in cart.items if not i.is_deleted]
    if not active_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Generate order number
    order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid_mod.uuid4().hex[:8].upper()}"

    # Calculate totals and reserve stock
    subtotal = 0
    total_gst = 0
    order_items = []

    for cart_item in active_items:
        prod_result = await db.execute(
            select(Product).where(Product.id == cart_item.product_id).with_for_update()
        )
        product = prod_result.scalar_one_or_none()
        if not product or product.stock_qty < cart_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name if product else 'unknown product'}",
            )

        line_total = cart_item.price_snapshot * cart_item.quantity
        gst_amount = int(line_total * product.gst_rate / 100)

        # Reserve stock
        product.stock_qty -= cart_item.quantity

        order_items.append({
            "product_id": product.id,
            "product_name": product.name,
            "quantity": cart_item.quantity,
            "unit_price": cart_item.price_snapshot,
            "gst_rate": product.gst_rate,
            "line_total": line_total,
            "gst_amount": gst_amount,
        })
        subtotal += line_total
        total_gst += gst_amount

    grand_total = subtotal + total_gst

    # Create order
    order = Order(
        user_id=current_user.id,
        order_number=order_number,
        subtotal=subtotal,
        gst_amount=total_gst,
        grand_total=grand_total,
        delivery_address=req.delivery_address,
    )
    db.add(order)
    await db.flush()

    # Create order items
    for oi_data in order_items:
        oi = OrderItem(order_id=order.id, **oi_data)
        db.add(oi)

    # Create ledger debit entry
    ledger = LedgerEntry(
        user_id=current_user.id,
        entry_type=LedgerType.DEBIT,
        amount=grand_total,
        reference_type="order",
        reference_id=order.id,
        description=f"Order {order_number}",
    )
    db.add(ledger)

    # Clear cart items (soft-delete)
    for item in active_items:
        item.is_deleted = True
        item.deleted_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(order)
    return order


# ── P3-11: Order Status Management ──────────────────────────

@router.patch("/admin/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID, req: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin),
):
    """Admin updates order status."""
    result = await db.execute(select(Order).where(Order.id == order_id, Order.is_deleted == False))  # noqa: E712
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status.value

    # Cancellation releases reserved stock
    if req.status == "cancelled" and order.status != OrderStatus.CANCELLED:
        for item in order.items:
            prod = await db.execute(select(Product).where(Product.id == item.product_id).with_for_update())
            product = prod.scalar_one_or_none()
            if product:
                product.stock_qty += item.quantity

    order.status = OrderStatus(req.status)
    await db.flush()

    audit = AuditService(db)
    await audit.log_action(
        current_user, "update_order_status", "order", order_id,
        {"old_status": old_status, "new_status": req.status},
    )
    return order


# ── P3-12: Order History ─────────────────────────────────────

@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    order_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders — filtered by user role."""
    query = select(Order).where(Order.is_deleted == False)  # noqa: E712
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        query = query.where(Order.user_id == current_user.id)
    if order_status:
        query = query.where(Order.status == OrderStatus(order_status))
    query = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get order detail."""
    query = select(Order).where(Order.id == order_id, Order.is_deleted == False)  # noqa: E712
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        query = query.where(Order.user_id == current_user.id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── P3-13: Credit Limit ─────────────────────────────────────

@router.patch("/admin/retailers/{retailer_id}/credit-limit")
async def set_credit_limit(
    retailer_id: UUID, req: CreditLimitUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin),
):
    """Admin sets/edits retailer credit limit."""
    result = await db.execute(select(Retailer).where(Retailer.user_id == retailer_id))
    retailer = result.scalar_one_or_none()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")
    old_limit = retailer.credit_limit
    retailer.credit_limit = req.credit_limit
    await db.flush()
    audit = AuditService(db)
    await audit.log_action(
        current_user, "set_credit_limit", "retailer", retailer_id,
        {"old_limit": old_limit, "new_limit": req.credit_limit},
    )
    return {"retailer_id": str(retailer_id), "credit_limit": req.credit_limit}


# ── P3-15: Manual Payment Entry ──────────────────────────────

@router.post("/admin/payments/manual", response_model=PaymentResponse)
async def manual_payment(
    req: ManualPaymentRequest,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin),
):
    """Admin records an offline cash/cheque payment."""
    payment = Payment(
        order_id=req.order_id or uuid_mod.uuid4(),
        user_id=req.retailer_id,
        amount=req.amount,
        status=PaymentStatus.SUCCESS,
        method=PaymentMethod(req.method),
        notes=req.notes,
    )
    db.add(payment)

    # Credit entry in ledger
    ledger = LedgerEntry(
        user_id=req.retailer_id,
        entry_type=LedgerType.CREDIT,
        amount=req.amount,
        reference_type="payment",
        reference_id=payment.id,
        description=f"Manual {req.method} payment",
    )
    db.add(ledger)
    await db.flush()

    audit = AuditService(db)
    await audit.log_action(
        current_user, "manual_payment", "payment", payment.id,
        {"retailer_id": str(req.retailer_id), "amount": req.amount},
    )
    return payment


# ── P3-16: Ledger ────────────────────────────────────────────

@router.get("/ledger")
async def get_ledger(
    retailer_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get ledger entries — Retailer: own; Admin: any retailer_id."""
    target_user_id = current_user.id
    if current_user.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN) and retailer_id:
        target_user_id = retailer_id

    query = select(LedgerEntry).where(
        LedgerEntry.user_id == target_user_id,
        LedgerEntry.is_deleted == False,  # noqa: E712
    ).order_by(LedgerEntry.created_at.desc()).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    entries = result.scalars().all()

    # Calculate running balance
    bal_result = await db.execute(
        select(func.coalesce(
            func.sum(func.case(
                (LedgerEntry.entry_type == LedgerType.DEBIT, LedgerEntry.amount),
                else_=-LedgerEntry.amount,
            )), 0
        )).where(LedgerEntry.user_id == target_user_id, LedgerEntry.is_deleted == False)  # noqa: E712
    )
    outstanding = bal_result.scalar() or 0

    return {
        "outstanding_balance": outstanding,
        "entries": [
            {
                "id": str(e.id),
                "entry_type": e.entry_type.value,
                "amount": e.amount,
                "reference_type": e.reference_type,
                "reference_id": str(e.reference_id),
                "description": e.description,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
    }
