import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ai_message import AiMessage


def create_ai_message_pair(db: Session, user_message: AiMessage, assistant_message: AiMessage) -> tuple[AiMessage, AiMessage]:
    db.add_all([user_message, assistant_message])
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    return user_message, assistant_message


def list_user_ai_messages(db: Session, user_id: uuid.UUID, page: int, page_size: int) -> list[AiMessage]:
    offset = (page - 1) * page_size
    return list(
        db.scalars(
            select(AiMessage)
            .where(AiMessage.user_id == user_id)
            .order_by(AiMessage.created_at.desc(), AiMessage.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    )


def count_user_ai_messages(db: Session, user_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(AiMessage).where(AiMessage.user_id == user_id)) or 0


def list_recent_user_ai_messages(db: Session, user_id: uuid.UUID, limit: int) -> list[AiMessage]:
    if limit <= 0:
        return []
    messages = list(
        db.scalars(
            select(AiMessage)
            .where(AiMessage.user_id == user_id)
            .order_by(AiMessage.created_at.desc(), AiMessage.id.desc())
            .limit(limit)
        )
    )
    messages.reverse()
    return messages


def get_user_ai_message(db: Session, user_id: uuid.UUID, message_id: uuid.UUID) -> AiMessage | None:
    return db.scalar(
        select(AiMessage).where(
            AiMessage.id == message_id,
            AiMessage.user_id == user_id,
        )
    )


def update_ai_message_feedback(db: Session, message: AiMessage, feedback: str) -> AiMessage:
    message.feedback = feedback
    message.feedback_at = datetime.now(UTC)
    db.commit()
    db.refresh(message)
    return message


def get_monthly_external_token_usage(db: Session, year: int, month: int) -> int:
    start_at = datetime(year, month, 1, tzinfo=UTC)
    if month == 12:
        end_at = datetime(year + 1, 1, 1, tzinfo=UTC)
    else:
        end_at = datetime(year, month + 1, 1, tzinfo=UTC)
    return int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(
                        func.coalesce(AiMessage.provider_input_tokens, 0)
                        + func.coalesce(AiMessage.provider_output_tokens, 0)
                    ),
                    0,
                )
            ).where(
                AiMessage.source == "external",
                AiMessage.created_at >= start_at,
                AiMessage.created_at < end_at,
            )
        )
        or 0
    )
