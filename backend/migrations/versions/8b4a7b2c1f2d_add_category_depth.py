"""add category depth support

Revision ID: 8b4a7b2c1f2d
Revises: f05a71183d88
Create Date: 2026-06-15 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8b4a7b2c1f2d'
down_revision: Union[str, None] = 'afd70709f9db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('depth', sa.Integer(), nullable=False, server_default='0'))
    op.create_index('ix_categories_depth', 'categories', ['depth'], unique=False)
    op.drop_index('ix_categories_slug', table_name='categories')
    op.create_index('ix_categories_root_slug', 'categories', ['slug'], unique=True, postgresql_where='parent_id IS NULL AND is_deleted = false')
    op.create_index('ix_categories_slug_parent_id', 'categories', ['parent_id', 'slug'], unique=True, postgresql_where='parent_id IS NOT NULL AND is_deleted = false')


def downgrade() -> None:
    op.drop_index('ix_categories_slug_parent_id', table_name='categories')
    op.drop_index('ix_categories_root_slug', table_name='categories')
    op.create_index('ix_categories_slug', 'categories', ['slug'], unique=True, postgresql_where='is_deleted = false')
    op.drop_index('ix_categories_depth', table_name='categories')
    op.drop_column('categories', 'depth')
