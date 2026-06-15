"""
Admin router — audit log, reports, notifications management.
Phase 4 endpoints.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import require_admin, require_super_admin
from app.models.audit import AuditLog
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.models.retailer import Retailer
from app.models.vendor import Vendor

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── P4-06: Audit Log ────────────────────────────────────────

@router.get("/audit-log", dependencies=[Depends(require_admin)])
async def get_audit_log(
    actor_id: Optional[UUID] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Searchable audit log with filters."""
    query = select(AuditLog).where(AuditLog.is_deleted == False)  # noqa: E712
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "role": e.role,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": str(e.entity_id) if e.entity_id else None,
            "diff_json": e.diff_json,
            "description": e.description,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]


# ── P4-07: Reports & Analytics ──────────────────────────────

@router.get("/reports/sales", dependencies=[Depends(require_admin)])
async def sales_report(
    range_type: str = Query("monthly", alias="range", pattern="^(daily|weekly|monthly|custom)$"),
    db: AsyncSession = Depends(get_db),
):
    """Sales report with aggregated data and trend data."""
    from datetime import datetime, timedelta, timezone
    
    now = datetime.now(timezone.utc)
    if range_type == "daily":
        start_date = now - timedelta(days=1)
    elif range_type == "weekly":
        start_date = now - timedelta(days=7)
    elif range_type == "monthly":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=30)

    total_orders = await db.execute(
        select(func.count(Order.id)).where(Order.is_deleted == False)  # noqa: E712
    )
    total_revenue = await db.execute(
        select(func.coalesce(func.sum(Order.grand_total), 0)).where(
            Order.is_deleted == False,  # noqa: E712
            Order.status != OrderStatus.CANCELLED,
        )
    )
    pending_orders = await db.execute(
        select(func.count(Order.id)).where(
            Order.is_deleted == False,  # noqa: E712
            Order.status == OrderStatus.PENDING,
        )
    )

    # Fetch orders in range to build trend chart
    trend_query = select(Order.created_at, Order.grand_total, Order.status).where(
        Order.is_deleted == False,
        Order.created_at >= start_date
    ).order_by(Order.created_at.asc())
    
    trend_result = await db.execute(trend_query)
    orders = trend_result.all()

    trend_data = []
    if range_type == "daily":
        # last 24 hours
        for i in range(23, -1, -1):
            dt = now - timedelta(hours=i)
            label = dt.strftime('%H:00')
            trend_data.append({
                "label": label,
                "revenue": 0.0,
                "orders": 0,
                "key": dt.strftime('%Y-%m-%d %H')
            })
        for created_at, grand_total, status in orders:
            key = created_at.strftime('%Y-%m-%d %H')
            for item in trend_data:
                if item["key"] == key:
                    if status != OrderStatus.CANCELLED:
                        item["revenue"] += grand_total
                    item["orders"] += 1
    else:
        # weekly or monthly
        days_count = 7 if range_type == "weekly" else 30
        for i in range(days_count - 1, -1, -1):
            dt = now - timedelta(days=i)
            label = dt.strftime('%b %d')
            trend_data.append({
                "label": label,
                "revenue": 0.0,
                "orders": 0,
                "key": dt.strftime('%Y-%m-%d')
            })
        for created_at, grand_total, status in orders:
            key = created_at.strftime('%Y-%m-%d')
            for item in trend_data:
                if item["key"] == key:
                    if status != OrderStatus.CANCELLED:
                        item["revenue"] += grand_total
                    item["orders"] += 1

    # Convert revenue to rupees in trend_data
    for item in trend_data:
        item["revenue"] = round(item["revenue"] / 100.0, 2)
        del item["key"]

    return {
        "total_orders": total_orders.scalar(),
        "total_revenue": total_revenue.scalar(),
        "pending_orders": pending_orders.scalar(),
        "range": range_type,
        "trend_data": trend_data,
    }


@router.get("/reports/sales/pdf", dependencies=[Depends(require_admin)])
async def sales_report_pdf(
    range: str = Query("monthly", pattern="^(daily|weekly|monthly|custom)$"),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download sales report PDF."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select, func
    from fastapi.responses import StreamingResponse
    import io
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    now = datetime.now(timezone.utc)
    if range == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range == "weekly":
        start_date = now - timedelta(days=7)
    elif range == "monthly":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=30)

    total_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.is_deleted == False, Order.created_at >= start_date)
    )).scalar() or 0

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.grand_total), 0)).where(
            Order.is_deleted == False,
            Order.status != OrderStatus.CANCELLED,
            Order.created_at >= start_date
        )
    )).scalar() or 0

    pending_orders = (await db.execute(
        select(func.count(Order.id)).where(
            Order.is_deleted == False,
            Order.status == OrderStatus.PENDING,
            Order.created_at >= start_date
        )
    )).scalar() or 0

    orders_query = select(Order).where(
        Order.is_deleted == False,
        Order.created_at >= start_date
    ).order_by(Order.created_at.desc()).limit(50)
    result = await db.execute(orders_query)
    orders_list = result.scalars().all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=15
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=20
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=15,
        spaceAfter=10
    )
    normal_style = styles['Normal']
    bold_style = ParagraphStyle('BoldText', parent=normal_style, fontName='Helvetica-Bold')

    story.append(Paragraph("Supply Setu - Sales Performance Report", title_style))
    story.append(Paragraph(f"Generated on: {now.strftime('%Y-%m-%d %H:%M:%S UTC')} | Range: {range.capitalize()}", subtitle_style))
    story.append(Spacer(1, 10))

    summary_data = [
        [
            Paragraph("<b>Total Orders</b>", normal_style),
            Paragraph("<b>Total Revenue</b>", normal_style),
            Paragraph("<b>Pending Orders</b>", normal_style)
        ],
        [
            Paragraph(str(total_orders), bold_style),
            Paragraph(f"INR {(total_revenue / 100):.2f}", bold_style),
            Paragraph(str(pending_orders), bold_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[180, 180, 180])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f3f4f6")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e5e7eb")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 25))

    story.append(Paragraph("Recent Orders List (Up to 50)", section_heading))
    
    header_col_style = ParagraphStyle('HeaderCol', parent=normal_style, fontName='Helvetica-Bold', textColor=colors.whitesmoke)
    order_rows = [[
        Paragraph("Order No", header_col_style),
        Paragraph("User", header_col_style),
        Paragraph("Status", header_col_style),
        Paragraph("Total", header_col_style),
        Paragraph("Date", header_col_style)
    ]]

    for ord in orders_list:
        user_name = ord.user.owner_name or ord.user.business_name or ord.user.mobile if ord.user else "N/A"
        order_rows.append([
            Paragraph(ord.order_number, normal_style),
            Paragraph(user_name, normal_style),
            Paragraph(ord.status.value.upper(), normal_style),
            Paragraph(f"INR {(ord.grand_total / 100):.2f}", normal_style),
            Paragraph(ord.created_at.strftime('%Y-%m-%d'), normal_style)
        ])

    orders_table = Table(order_rows, colWidths=[110, 130, 100, 100, 100])
    orders_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f9fafb")]),
    ]))

    story.append(orders_table)

    doc.build(story)
    buffer.seek(0)

    filename = f"sales_report_{range}_{now.strftime('%Y%d%m_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/dashboard", dependencies=[Depends(require_admin)])
async def dashboard_kpis(db: AsyncSession = Depends(get_db)):
    """Dashboard KPI cards."""
    total_orders = (await db.execute(select(func.count(Order.id)).where(Order.is_deleted == False))).scalar()  # noqa: E712
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.grand_total), 0)).where(Order.is_deleted == False, Order.status != OrderStatus.CANCELLED)  # noqa: E712
    )).scalar()
    active_vendors = (await db.execute(select(func.count(Vendor.id)).where(Vendor.is_deleted == False))).scalar()  # noqa: E712
    active_retailers = (await db.execute(select(func.count(Retailer.id)).where(Retailer.is_deleted == False))).scalar()  # noqa: E712

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "active_vendors": active_vendors,
        "active_retailers": active_retailers,
    }


# ── P4-01: Send Notification (Admin) ────────────────────────

@router.post("/notifications/send", dependencies=[Depends(require_admin)])
async def send_notification(
    title: str,
    body: str,
    user_id: Optional[UUID] = None,
    target_role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Admin sends push notification to specific user or role group."""
    if user_id:
        notif = Notification(
            user_id=user_id, title=title, body=body,
            notification_type="admin", delivery_status="pending",
        )
        db.add(notif)
    elif target_role:
        users_result = await db.execute(
            select(User.id).where(User.role == UserRole(target_role), User.is_deleted == False)  # noqa: E712
        )
        user_ids = users_result.scalars().all()
        for uid in user_ids:
            notif = Notification(
                user_id=uid, title=title, body=body,
                notification_type="admin", delivery_status="pending",
            )
            db.add(notif)

    await db.flush()
    # TODO: Integrate FCM push delivery
    return {"message": "Notification queued"}


# ── E-Way Bill Stub (P3-22) ─────────────────────────────────

@router.patch("/orders/{order_id}/eway-bill", dependencies=[Depends(require_admin)])
async def set_eway_bill(
    order_id: UUID, eway_bill_no: str,
    db: AsyncSession = Depends(get_db),
):
    """Admin manually enters e-way bill number."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.eway_bill_no = eway_bill_no
    await db.flush()
    return {"order_id": str(order_id), "eway_bill_no": eway_bill_no}
