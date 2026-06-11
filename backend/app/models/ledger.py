"""Ledger model — append-only debit/credit entries with running balance."""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class LedgerType(str, enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class LedgerEntry(BaseModel):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        Index("ix_ledger_user_id", "user_id"),
        Index("ix_ledger_created_at", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    entry_type: Mapped[LedgerType] = mapped_column(Enum(LedgerType, name="ledger_type_enum"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
    reference_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "order" or "payment"
    reference_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
