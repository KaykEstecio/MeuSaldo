import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category


def create_category(db: Session, category: Category) -> Category:
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def get_active_category_by_id(db: Session, category_id: uuid.UUID, user_id: uuid.UUID) -> Category | None:
    return db.scalar(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == user_id,
            Category.is_active.is_(True),
        )
    )


def list_active_categories(db: Session, user_id: uuid.UUID, page: int, page_size: int) -> list[Category]:
    offset = (page - 1) * page_size
    return list(
        db.scalars(
            select(Category)
            .where(Category.user_id == user_id, Category.is_active.is_(True))
            .order_by(Category.type.asc(), Category.name.asc(), Category.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    )


def count_active_categories(db: Session, user_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count()).select_from(Category).where(Category.user_id == user_id, Category.is_active.is_(True))
    ) or 0


def save_category(db: Session, category: Category) -> Category:
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
