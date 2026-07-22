from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class AiMessage(Base):
    __tablename__ = "ai_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="ck_ai_messages_role"),
        CheckConstraint("source IN ('user', 'rules', 'external')", name="ck_ai_messages_source"),
        CheckConstraint(
            "feedback IS NULL OR feedback IN ('helpful', 'not_helpful')",
            name="ck_ai_messages_feedback",
        ),
        Index("ix_ai_messages_user_id", "user_id"),
        Index("ix_ai_messages_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="rules", server_default="rules")
    provider_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fallback_reason: Mapped[str | None] = mapped_column(String(40), nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(20), nullable=True)
    feedback_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="ai_messages")
