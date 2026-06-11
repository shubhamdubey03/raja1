"""Invoice model — GST-compliant auto-generated invoices."""

import uuid
from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class Invoice(BaseModel):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_invoices_order_id", "order_id"),
        Index("ix_invoices_number", "invoice_number", unique=True),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    buyer_gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    seller_gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False)
    cgst: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sgst: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    igst: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    grand_total: Mapped[int] = mapped_column(Integer, nullable=False)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_manual: Mapped[bool] = mapped_column(default=False, server_default="false")

    order = relationship("Order", back_populates="invoice")
