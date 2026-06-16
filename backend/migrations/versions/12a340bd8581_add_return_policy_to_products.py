"""add return_policy to products

Revision ID: 12a340bd8581
Revises: 288530d81028
Create Date: 2026-06-16 16:53:30.402320
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12a340bd8581'
down_revision: Union[str, None] = '288530d81028'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "return_policy",
            sa.String(length=255),
            nullable=True
        )
    )

    op.add_column(
        "products",
        sa.Column(
            "return_window_days",
            sa.Integer(),
            nullable=False,
            server_default="7"
        )
    )


def downgrade() -> None:
    op.drop_column("products", "return_window_days")
    op.drop_column("products", "return_policy")
