import uuid

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
