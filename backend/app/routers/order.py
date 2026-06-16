"""
Order, Cart, and Payment router — Phase 3B/3C endpoints.
"""

import uuid as uuid_mod
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.product import Product
from app.models.ledger import LedgerEntry, LedgerType
from app.models.retailer import Retailer
from app.models.user import User, UserRole, UserStatus
from app.models.discount import DiscountCode
from app.schemas.order import (
    ApplyCouponRequest,
    CartAddRequest,
    CartItemUpdate,
    CartResponse,
    CartValidation,
    CreditLimitUpdate,
    ManualPaymentRequest,
    OrderCreateRequest,
    OrderResponse,
    OrderReturnRequest,
    OrderStatusUpdate,
    PaymentResponse,
    PaymentInitiateRequest,
    PaymentVerifyRequest,
)
from app.services.audit_service import AuditService

router = APIRouter(tags=["Orders & Payments"])


# ── Vendor Dashboard Stats ───────────────────────────────────

@router.get("/vendor/dashboard")
async def vendor_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vendor home screen KPIs — all computed from real data."""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    # Total orders today
    today_orders = (await db.execute(
        select(func.count(Order.id)).where(
            Order.is_deleted == False,  # noqa: E712
            Order.created_at >= today_start,
        )
    )).scalar() or 0

    # All orders (for unique retailer count)
    all_orders_result = await db.execute(
        select(Order).where(Order.is_deleted == False)  # noqa: E712
    )
    all_orders = all_orders_result.scalars().all()

    # Unique retailers who have placed orders
    active_retailers = len(set(o.user_id for o in all_orders))

    # Pending payment amount (sum of grand_total for pending orders) in paise
    pending_amount = (await db.execute(
        select(func.coalesce(func.sum(Order.grand_total), 0)).where(
            Order.is_deleted == False,  # noqa: E712
            Order.status == OrderStatus.PENDING,
        )
    )).scalar() or 0

    # Low stock products count
    low_stock_count = (await db.execute(
        select(func.count(Product.id)).where(
            Product.is_deleted == False,  # noqa: E712
            Product.stock_qty <= Product.low_stock_threshold,
            Product.stock_qty > 0,
        )
    )).scalar() or 0

    # Out of stock count
    out_of_stock_count = (await db.execute(
        select(func.count(Product.id)).where(
            Product.is_deleted == False,  # noqa: E712
            Product.stock_qty == 0,
        )
    )).scalar() or 0

    # Orders this week vs last week (for trend)
    orders_this_week = (await db.execute(
        select(func.count(Order.id)).where(
            Order.is_deleted == False,  # noqa: E712
            Order.created_at >= week_start,
        )
    )).scalar() or 0

    # Weekly sales trend (last 7 days, day-by-day)
    seven_days_ago = today_start - timedelta(days=6)
    trend_orders_result = await db.execute(
        select(Order.grand_total, Order.created_at)
        .where(
            Order.is_deleted == False,  # noqa: E712
            Order.created_at >= seven_days_ago,
            Order.status != OrderStatus.CANCELLED
        )
    )
    trend_orders = trend_orders_result.all()

    sales_by_date = {}
    for grand_total, created_at in trend_orders:
        # Normalize to local date if needed, otherwise UTC date is fine
        date_str = created_at.date().isoformat()
        sales_by_date[date_str] = sales_by_date.get(date_str, 0) + grand_total

    weekly_trend = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        date_str = day_date.isoformat()
        day_sales = sales_by_date.get(date_str, 0)
        day_label = day_date.strftime("%a")
        weekly_trend.append({
            "label": day_label,
            "sales_paise": day_sales,
            "sales_rupees": day_sales / 100.0
        })

    # Recent 5 orders for the home screen feed
    recent_orders_result = await db.execute(
        select(Order).where(Order.is_deleted == False)  # noqa: E712
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    recent_orders = recent_orders_result.scalars().all()

    return {
        "today_orders": today_orders,
        "pending_amount_paise": pending_amount,
        "active_retailers": active_retailers,
        "low_stock_skus": low_stock_count,
        "out_of_stock_skus": out_of_stock_count,
        "orders_this_week": orders_this_week,
        "weekly_sales_trend": weekly_trend,
        "recent_orders": [
            {
                "id": str(o.id),
                "order_number": o.order_number,
                "status": o.status.value,
                "grand_total": o.grand_total,
                "delivery_address": o.delivery_address,
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ],
    }




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

    # Resolve role-based price
    resolved_price = product.base_price
    if current_user.role == UserRole.VENDOR:
        from app.models.pricing import VendorPricing
        vp_res = await db.execute(
            select(VendorPricing.price).where(
                VendorPricing.product_id == req.product_id,
                VendorPricing.is_deleted == False
            )
        )
        vp = vp_res.scalar_one_or_none()
        if vp is not None:
            resolved_price = vp
    elif current_user.role == UserRole.RETAILER:
        from app.models.pricing import RetailerPricing
        rp_res = await db.execute(
            select(RetailerPricing.price).where(
                RetailerPricing.product_id == req.product_id,
                RetailerPricing.is_deleted == False
            )
        )
        rp = rp_res.scalar_one_or_none()
        if rp is not None:
            resolved_price = rp

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
        item.price_snapshot = resolved_price
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=req.product_id,
            quantity=req.quantity,
            price_snapshot=resolved_price,
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
        # Re-query to populate preloaded relationships (items)
        result = await db.execute(
            select(Cart).where(Cart.id == cart.id)
        )
        cart = result.scalar_one()
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


async def apply_coupon_helper(db: AsyncSession, code: str, current_user: User, active_items: list) -> tuple[int, DiscountCode]:
    """Validate coupon code and return (computed_discount_amount, coupon_object)."""
    # 1. Fetch coupon code
    stmt = select(DiscountCode).where(
        func.lower(DiscountCode.code) == func.lower(code),
        DiscountCode.is_deleted == False
    )
    coupon = (await db.execute(stmt)).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code")

    # 2. Check active status
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is not active")

    # 3. Check expiration
    now = datetime.now(timezone.utc)
    if coupon.valid_from > now:
        raise HTTPException(status_code=400, detail="Coupon is not yet valid")
    if coupon.valid_until < now:
        raise HTTPException(status_code=400, detail="Coupon has expired")

    # 4. Check usage limit
    if coupon.max_usage_count > 0 and coupon.current_usage >= coupon.max_usage_count:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    # 5. Check role applicability
    if coupon.applicable_to == "vendor" and current_user.role != UserRole.VENDOR:
        raise HTTPException(status_code=400, detail="Coupon only applicable to wholesalers/vendors")
    if coupon.applicable_to == "retailer" and current_user.role != UserRole.RETAILER:
        raise HTTPException(status_code=400, detail="Coupon only applicable to retailers")

    # 6. Check scope and calculate subtotal
    subtotal = sum(i.price_snapshot * i.quantity for i in active_items)
    
    # Check minimum order value
    if subtotal < coupon.min_order_value:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order value of INR {coupon.min_order_value / 100:.2f} not met"
        )

    # Scoped items calculation
    items_in_scope = []
    for item in active_items:
        if not coupon.scope_type:
            items_in_scope.append(item)
        elif coupon.scope_type == "product" and item.product_id == coupon.scope_id:
            items_in_scope.append(item)
        elif coupon.scope_type == "category":
            prod = await db.get(Product, item.product_id)
            if prod and prod.category_id == coupon.scope_id:
                items_in_scope.append(item)

    if not items_in_scope:
        raise HTTPException(status_code=400, detail="Coupon code not applicable to items in cart")

    scoped_subtotal = sum(i.price_snapshot * i.quantity for i in items_in_scope)

    # Calculate discount amount
    if coupon.discount_type == "percentage":
        discount_amount = (scoped_subtotal * coupon.value) // 10000
    else:
        discount_amount = min(coupon.value, scoped_subtotal)

    return discount_amount, coupon


@router.post("/cart/apply-coupon")
async def apply_coupon(
    req: ApplyCouponRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate and apply a coupon to the current cart."""
    # Get cart
    cart_result = await db.execute(
        select(Cart).where(Cart.user_id == current_user.id, Cart.is_deleted == False)
    )
    cart = cart_result.scalar_one_or_none()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    active_items = [i for i in cart.items if not i.is_deleted]
    if not active_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    discount_amount, _ = await apply_coupon_helper(db, req.code, current_user, active_items)
    return {"discount_amount": discount_amount}



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
                    func.sum(case(
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

    # Apply discount coupon if present
    discount_amount = 0
    discount_code_id = None
    if req.discount_code:
        discount_amount, coupon = await apply_coupon_helper(db, req.discount_code, current_user, active_items)
        coupon.current_usage += 1
        discount_code_id = coupon.id

    grand_total = max(0, subtotal + total_gst - discount_amount)

    # Create order
    order = Order(
        user_id=current_user.id,
        order_number=order_number,
        subtotal=subtotal,
        gst_amount=total_gst,
        discount_amount=discount_amount,
        discount_code_id=discount_code_id,
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

    # Notify all admins & superadmins
    try:
        from app.services.notification_service import NotificationService
        notif_svc = NotificationService(db)
        admin_users_res = await db.execute(
            select(User.id).where(
                User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                User.is_deleted == False
            )
        )
        admin_ids = admin_users_res.scalars().all()
        for admin_id in admin_ids:
            await notif_svc.create_notification(
                user_id=admin_id,
                title="New Order Placed",
                body=f"Order #{order.order_number} has been placed by {current_user.full_name}.",
                notification_type="order",
                reference_id=order.id
            )
    except Exception as e:
        import structlog
        structlog.get_logger().error("failed_to_send_admin_order_notification", error=str(e), order_id=str(order.id))

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

    # Send status update notification to the user
    try:
        from app.services.notification_service import NotificationService
        notif_svc = NotificationService(db)
        title = "Order Status Updated"
        body = f"Your order #{order.order_number} status has been updated to {req.status}."
        
        if req.status == "confirmed":
            title = "Order Confirmed"
            body = f"Your order #{order.order_number} has been confirmed."
        elif req.status == "dispatched":
            title = "Order Dispatched"
            body = f"Your order #{order.order_number} has been dispatched."
        elif req.status == "delivered":
            title = "Order Delivered"
            body = f"Your order #{order.order_number} has been delivered."
        elif req.status == "cancelled":
            title = "Order Cancelled"
            body = f"Your order #{order.order_number} has been cancelled."
            
        await notif_svc.create_notification(
            user_id=order.user_id,
            title=title,
            body=body,
            notification_type="order",
            reference_id=order.id
        )
    except Exception as e:
        # Avoid blocking order update if notification fails
        import structlog
        structlog.get_logger().error("failed_to_send_order_status_notification", error=str(e), order_id=str(order_id))

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
        select(
            func.coalesce(
                func.sum(
                    case(
                        (LedgerEntry.entry_type == LedgerType.DEBIT, LedgerEntry.amount),
                        else_=-LedgerEntry.amount,
                    )
                ),
                0,
            )
        ).where(
            LedgerEntry.user_id == target_user_id,
            LedgerEntry.is_deleted == False,
        )
    )
    outstanding = bal_result.scalar() or 0
    # Fetch credit limit if user is a retailer
    credit_limit = 0
    if current_user.role == UserRole.RETAILER:
        ret_result = await db.execute(select(Retailer).where(Retailer.user_id == target_user_id))
        retailer = ret_result.scalar_one_or_none()
        if retailer:
            credit_limit = retailer.credit_limit

    available_balance = max(0, credit_limit - outstanding)

    return {
        "outstanding_balance": outstanding,
        "credit_limit": credit_limit,
        "available_balance": available_balance,
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


# ── P3-14: Payment Gateway Integration (Razorpay) ──────────

import razorpay

@router.post("/payments/initiate", response_model=PaymentResponse)
async def initiate_payment(
    req: PaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Initiate a Razorpay payment for an order."""
    # 1. Fetch order
    order_result = await db.execute(
        select(Order).where(Order.id == req.order_id, Order.is_deleted == False)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 2. Check authorization
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this order")

    # 3. Check if order is already paid
    existing_pay = await db.execute(
        select(Payment).where(Payment.order_id == order.id, Payment.status == PaymentStatus.SUCCESS)
    )
    if existing_pay.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Order is already paid")

    # 4. Initialize Razorpay Client
    settings = get_settings()
    key_id = settings.rzp_key
    key_secret = settings.rzp_secret
    
    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        # Create Order on Razorpay
        razorpay_order = client.order.create({
            "amount": order.grand_total,  # in paise
            "currency": "INR",
            "receipt": str(order.id)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create gateway order: {str(e)}")

    # 5. Create Payment record
    payment = Payment(
        order_id=order.id,
        user_id=current_user.id,
        amount=order.grand_total,
        status=PaymentStatus.INITIATED,
        method=PaymentMethod.ONLINE,
        gateway_order_id=razorpay_order["id"]
    )
    db.add(payment)
    await db.flush()
    await db.refresh(payment)
    return payment


@router.post("/payments/verify")
async def verify_payment(
    req: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify Razorpay payment signature and update status."""
    settings = get_settings()
    key_id = settings.rzp_key
    key_secret = settings.rzp_secret

    # 1. Verify signature
    client = razorpay.Client(auth=(key_id, key_secret))
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Signature verification failed")

    # 2. Update Payment record
    pay_result = await db.execute(
        select(Payment).where(
            Payment.gateway_order_id == req.razorpay_order_id,
            Payment.is_deleted == False
        )
    )
    payment = pay_result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    payment.status = PaymentStatus.SUCCESS
    payment.gateway_payment_id = req.razorpay_payment_id
    payment.gateway_signature = req.razorpay_signature

    # 3. Update Order status to confirmed
    order_result = await db.execute(
        select(Order).where(Order.id == payment.order_id)
    )
    order = order_result.scalar_one_or_none()
    if order:
        order.status = OrderStatus.CONFIRMED

        # Add Ledger Credit Entry (since we debit on order placement, this records payment credit)
        ledger = LedgerEntry(
            user_id=payment.user_id,
            entry_type=LedgerType.CREDIT,
            amount=payment.amount,
            reference_type="payment",
            reference_id=payment.id,
            description=f"Razorpay online payment - Order {order.order_number}"
        )
        db.add(ledger)

    await db.flush()
    return {"success": True, "message": "Payment verified and order confirmed"}


@router.post("/payments/webhook")
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Webhook handler for async gateway confirmation."""
    settings = get_settings()
    webhook_secret = settings.razorpay_webhook_secret.strip('"').strip("'")
    
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing webhook signature")

    client = razorpay.Client(auth=(
        settings.rzp_key,
        settings.rzp_secret
    ))
    
    try:
        client.utility.verify_webhook_signature(
            body.decode("utf-8"),
            signature,
            webhook_secret
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    data = json.loads(body)
    event = data.get("event")

    if event == "payment.captured":
        payload = data.get("payload", {})
        payment_entity = payload.get("payment", {}).get("entity", {})
        razorpay_order_id = payment_entity.get("order_id")
        razorpay_payment_id = payment_entity.get("id")
        razorpay_signature = signature

        # Update payment & order
        pay_result = await db.execute(
            select(Payment).where(Payment.gateway_order_id == razorpay_order_id)
        )
        payment = pay_result.scalar_one_or_none()
        if payment and payment.status != PaymentStatus.SUCCESS:
            payment.status = PaymentStatus.SUCCESS
            payment.gateway_payment_id = razorpay_payment_id
            payment.gateway_signature = razorpay_signature

            order_result = await db.execute(
                select(Order).where(Order.id == payment.order_id)
            )
            order = order_result.scalar_one_or_none()
            if order:
                order.status = OrderStatus.CONFIRMED

                ledger = LedgerEntry(
                    user_id=payment.user_id,
                    entry_type=LedgerType.CREDIT,
                    amount=payment.amount,
                    reference_type="payment",
                    reference_id=payment.id,
                    description=f"Razorpay online payment (webhook) - Order {order.order_number}"
                )
                db.add(ledger)

            await db.flush()

    return {"status": "ok"}


@router.post("/orders/{order_id}/return", response_model=OrderResponse)
async def return_order(
    order_id: UUID,
    req: OrderReturnRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retailer or admin returns a delivered order."""
    query = select(Order).where(Order.id == order_id, Order.is_deleted == False)
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        query = query.where(Order.user_id == current_user.id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=400,
            detail="Only delivered orders can be returned"
        )

    # Validate return window days for each product
    now = datetime.now(timezone.utc)
    time_elapsed = now - order.updated_at
    days_elapsed = time_elapsed.total_seconds() / (24 * 3600)

    for item in order.items:
        prod = item.product
        if prod:
            # Check product return window days (managed by admin panel)
            if days_elapsed > prod.return_window_days:
                raise HTTPException(
                    status_code=400,
                    detail=f"Return window of {prod.return_window_days} days for product '{prod.name}' has expired. It was delivered {int(days_elapsed)} days ago."
                )

    old_status = order.status.value
    order.status = OrderStatus.RETURNED
    order.return_image_url = req.return_image_url
    order.return_reason = req.return_reason

    # Release/Return stock
    for item in order.items:
        prod_q = await db.execute(select(Product).where(Product.id == item.product_id).with_for_update())
        product = prod_q.scalar_one_or_none()
        if product:
            product.stock_qty += item.quantity

    # Create ledger credit entry to refund the amount
    ledger = LedgerEntry(
        user_id=order.user_id,
        entry_type=LedgerType.CREDIT,
        amount=order.grand_total,
        reference_type="order_return",
        reference_id=order.id,
        description=f"Refund for returned Order #{order.order_number}",
    )
    db.add(ledger)

    await db.flush()

    # Log action
    audit = AuditService(db)
    await audit.log_action(
        current_user, "return_order", "order", order.id,
        {"old_status": old_status, "new_status": "returned", "return_image_url": req.return_image_url, "return_reason": req.return_reason}
    )

    # Notify superadmins & admins
    try:
        from app.services.notification_service import NotificationService
        notif_svc = NotificationService(db)
        admin_users_res = await db.execute(
            select(User.id).where(
                User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                User.is_deleted == False
            )
        )
        admin_ids = admin_users_res.scalars().all()
        for admin_id in admin_ids:
            await notif_svc.create_notification(
                user_id=admin_id,
                title="Order Returned",
                body=f"Order #{order.order_number} has been returned by {current_user.full_name}.",
                notification_type="order",
                reference_id=order.id
            )
    except Exception as e:
        import structlog
        structlog.get_logger().error("failed_to_send_return_order_notification", error=str(e), order_id=str(order.id))

    await db.refresh(order)
    return order

