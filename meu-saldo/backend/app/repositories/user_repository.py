import uuid
from datetime import datetime

from sqlalchemy import func, select
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


def update_user_last_login(db: Session, user: User, logged_in_at: datetime) -> User:
    user.last_login_at = logged_in_at
    db.commit()
    db.refresh(user)
    return user


def count_users(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User)) or 0


def count_users_created_since(db: Session, created_since: datetime) -> int:
    return db.scalar(select(func.count()).select_from(User).where(User.created_at >= created_since)) or 0


def list_users(db: Session, page: int, page_size: int) -> list[User]:
    offset = (page - 1) * page_size
    return list(db.scalars(select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size)))


def update_user_admin_fields(
    db: Session,
    user: User,
    role: str | None = None,
    is_active: bool | None = None,
) -> User:
    if role is not None:
        user.role = role

    if is_active is not None:
        user.is_active = is_active

    db.commit()
    db.refresh(user)
    return user
