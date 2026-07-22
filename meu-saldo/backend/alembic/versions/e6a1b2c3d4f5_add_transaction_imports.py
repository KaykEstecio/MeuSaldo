"""add transaction imports and deduplication

Revision ID: e6a1b2c3d4f5
Revises: d4f7a9c31b20
Create Date: 2026-07-22 14:30:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e6a1b2c3d4f5"
down_revision: str | None = "d4f7a9c31b20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "transaction_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_format", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="confirmed", nullable=False),
        sa.Column("total_rows", sa.Integer(), nullable=False),
        sa.Column("imported_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("duplicate_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("skipped_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transaction_imports_user_id", "transaction_imports", ["user_id"])
    op.create_index("ix_transaction_imports_created_at", "transaction_imports", ["created_at"])
    op.add_column("transactions", sa.Column("import_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("transactions", sa.Column("import_fingerprint", sa.String(length=64), nullable=True))
    op.add_column("transactions", sa.Column("original_description", sa.String(length=255), nullable=True))
    op.create_foreign_key(
        "fk_transactions_import_id_transaction_imports",
        "transactions",
        "transaction_imports",
        ["import_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "uq_transactions_import_fingerprint",
        "transactions",
        ["user_id", "account_id", "import_fingerprint"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_transactions_import_fingerprint", table_name="transactions")
    op.drop_constraint("fk_transactions_import_id_transaction_imports", "transactions", type_="foreignkey")
    op.drop_column("transactions", "original_description")
    op.drop_column("transactions", "import_fingerprint")
    op.drop_column("transactions", "import_id")
    op.drop_index("ix_transaction_imports_created_at", table_name="transaction_imports")
    op.drop_index("ix_transaction_imports_user_id", table_name="transaction_imports")
    op.drop_table("transaction_imports")
