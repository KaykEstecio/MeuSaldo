"""add base model defaults

Revision ID: 9b1e62c0ea99
Revises: fa051b4ad528
Create Date: 2026-06-25 13:51:37.717332
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op



revision: str = '9b1e62c0ea99'
down_revision: str | None = 'fa051b4ad528'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "is_active", server_default=sa.text("true"))
    op.alter_column("accounts", "is_active", server_default=sa.text("true"))
    op.alter_column("categories", "is_default", server_default=sa.text("false"))
    op.alter_column("categories", "is_active", server_default=sa.text("true"))


def downgrade() -> None:
    op.alter_column("categories", "is_active", server_default=None)
    op.alter_column("categories", "is_default", server_default=None)
    op.alter_column("accounts", "is_active", server_default=None)
    op.alter_column("users", "is_active", server_default=None)
