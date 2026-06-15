"""
Product model with full-text search support (tsvector).
"""

import enum
import uuid

from sqlalchemy import (
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ProductStatus(str, enum.Enum):
    ACTIVE = "active"
    HIDDEN = "hidden"


class GSTRate(int, enum.Enum):
    GST_0 = 0
    GST_5 = 5
    GST_12 = 12
    GST_18 = 18
    GST_28 = 28


class Product(BaseModel):
    """
    Product catalog item.

    - base_price in paise (integer)
    - GST rate enum: 0/5/12/18/28%
    - Full-text search via search_vector (tsvector)
    """

    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_sku", "sku", unique=True, postgresql_where="is_deleted = false"),
        Index("ix_products_search", "search_vector", postgresql_using="gin"),
    )

    # ── Basic Info ───────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String(50), default="piece", nullable=False)
    hsn_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Pricing (all in paise — integer) ─────────────────────
    base_price: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── GST ──────────────────────────────────────────────────
    gst_rate: Mapped[int] = mapped_column(
        Integer,
        default=18,
        server_default="18",
        nullable=False,
    )

    # ── Inventory ────────────────────────────────────────────
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=10, server_default="10", nullable=False)

    # ── Status ───────────────────────────────────────────────
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status_enum"),
        default=ProductStatus.ACTIVE,
        server_default="active",
        nullable=False,
    )

    # ── Category FK ──────────────────────────────────────────
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ── Full-text Search ─────────────────────────────────────
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

    # ── Relationships ────────────────────────────────────────
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", lazy="selectin", order_by="ProductImage.sort_order")
    vendor_pricing = relationship("VendorPricing", back_populates="product", lazy="selectin", uselist=False)
    retailer_pricing = relationship("RetailerPricing", back_populates="product", lazy="selectin", uselist=False)

    @property
    def vendor_price(self) -> int | None:
        return self.vendor_pricing.price if self.vendor_pricing else None

    @property
    def retailer_price(self) -> int | None:
        return self.retailer_pricing.price if self.retailer_pricing else None


class ProductImage(BaseModel):
    """Product image — multiple images per product, ordered by sort_order."""

    __tablename__ = "product_images"
    __table_args__ = (
        Index("ix_product_images_product_id", "product_id"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # ── Relationships ────────────────────────────────────────
    product = relationship("Product", back_populates="images")
