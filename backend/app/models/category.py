"""
Category model with nested subcategory support.
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Category(BaseModel):
    """
    Product category — supports nested tree via parent_id.

    Slug auto-generated from name.
    Visibility toggle per role (vendor/retailer).
    """

    __tablename__ = "categories"
    __table_args__ = (
        Index("ix_categories_slug_parent_id", "parent_id", "slug", unique=True, postgresql_where="parent_id IS NOT NULL AND is_deleted = false"),  # ADDED: depth hierarchy
        Index("ix_categories_root_slug", "slug", unique=True, postgresql_where="parent_id IS NULL AND is_deleted = false"),  # ADDED: depth hierarchy
        Index("ix_categories_parent_id", "parent_id"),
        Index("ix_categories_depth", "depth"),  # ADDED: depth hierarchy
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Hierarchy ────────────────────────────────────────────
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )

    depth: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)  # ADDED: depth hierarchy

    # ── Visibility ───────────────────────────────────────────
    visible_to_vendor: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    visible_to_retailer: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # ── Relationships ────────────────────────────────────────
    parent = relationship("Category", remote_side="Category.id", back_populates="subcategories")
    subcategories = relationship("Category", back_populates="parent")
    products = relationship("Product", back_populates="category", foreign_keys="[Product.category_id]", lazy="noload")
