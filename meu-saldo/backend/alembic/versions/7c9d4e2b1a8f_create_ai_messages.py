"""create ai messages

Revision ID: 7c9d4e2b1a8f
Revises: 2a56078d6f32
Create Date: 2026-07-03 10:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7c9d4e2b1a8f"
down_revision: str | None = "2a56078d6f32"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=30), server_default="rules", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant')", name="ck_ai_messages_role"),
        sa.CheckConstraint("source IN ('user', 'rules', 'external')", name="ck_ai_messages_source"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_messages_created_at", "ai_messages", ["created_at"], unique=False)
    op.create_index("ix_ai_messages_user_id", "ai_messages", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_messages_user_id", table_name="ai_messages")
    op.drop_index("ix_ai_messages_created_at", table_name="ai_messages")
    op.drop_table("ai_messages")
