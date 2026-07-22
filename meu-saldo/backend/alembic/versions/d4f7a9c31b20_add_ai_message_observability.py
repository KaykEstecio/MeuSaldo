"""add ai message observability and feedback

Revision ID: d4f7a9c31b20
Revises: c8e4f6a2b901
Create Date: 2026-07-22 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "d4f7a9c31b20"
down_revision: str | None = "c8e4f6a2b901"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ai_messages", sa.Column("provider_model", sa.String(length=100), nullable=True))
    op.add_column("ai_messages", sa.Column("provider_latency_ms", sa.Integer(), nullable=True))
    op.add_column("ai_messages", sa.Column("provider_input_tokens", sa.Integer(), nullable=True))
    op.add_column("ai_messages", sa.Column("provider_output_tokens", sa.Integer(), nullable=True))
    op.add_column("ai_messages", sa.Column("fallback_reason", sa.String(length=40), nullable=True))
    op.add_column("ai_messages", sa.Column("feedback", sa.String(length=20), nullable=True))
    op.add_column("ai_messages", sa.Column("feedback_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "ck_ai_messages_feedback",
        "ai_messages",
        "feedback IS NULL OR feedback IN ('helpful', 'not_helpful')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_ai_messages_feedback", "ai_messages", type_="check")
    op.drop_column("ai_messages", "feedback_at")
    op.drop_column("ai_messages", "feedback")
    op.drop_column("ai_messages", "fallback_reason")
    op.drop_column("ai_messages", "provider_output_tokens")
    op.drop_column("ai_messages", "provider_input_tokens")
    op.drop_column("ai_messages", "provider_latency_ms")
    op.drop_column("ai_messages", "provider_model")
