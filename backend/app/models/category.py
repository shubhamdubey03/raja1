"""
Category model with nested subcategory support.
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
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
        Index("ix_categories_slug", "slug", unique=True, postgresql_where="is_deleted = false"),
        Index("ix_categories_parent_id", "parent_id"),
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

    # ── Visibility ───────────────────────────────────────────
    visible_to_vendor: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    visible_to_retailer: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # ── Relationships ────────────────────────────────────────
    parent = relationship("Category", remote_side="Category.id", backref="subcategories")
    products = relationship("Product", back_populates="category", lazy="noload")
