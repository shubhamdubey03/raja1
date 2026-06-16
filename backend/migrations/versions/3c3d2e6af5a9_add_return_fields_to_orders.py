"""add return fields to orders

Revision ID: 3c3d2e6af5a9
Revises: ed164a1c7013
Create Date: 2026-06-16 17:21:04.123299
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c3d2e6af5a9'
down_revision: Union[str, None] = 'ed164a1c7013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='orders' AND column_name='return_image_url'"
    ))
    if not result.fetchone():
        op.add_column('orders',
            sa.Column('return_image_url', sa.String(), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='orders' AND column_name='return_reason'"
    ))
    if not result.fetchone():
        op.add_column('orders',
            sa.Column('return_reason', sa.String(), nullable=True))
def downgrade() -> None:
    op.drop_column('orders', 'return_reason')
    op.drop_column('orders', 'return_image_url')