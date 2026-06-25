import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.scalar(select(User).where(User.id == user_id))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def create_user(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
