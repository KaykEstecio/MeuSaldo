import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.category import Category
from app.models.user import User
from app.repositories.category_repository import (
    count_active_categories,
    create_category,
    get_active_category_by_id,
    list_active_categories,
    save_category,
)
from app.schemas.category import CategoryCreate, CategoryUpdate


def create_user_category(db: Session, current_user: User, payload: CategoryCreate) -> Category:
    category = Category(
        user_id=current_user.id,
        name=payload.name.strip(),
        type=payload.type,
        color=payload.color.strip() if payload.color else None,
        icon=payload.icon.strip() if payload.icon else None,
    )
    return create_category(db, category)


def list_user_categories(db: Session, current_user: User, page: int, page_size: int) -> tuple[list[Category], int]:
    categories = list_active_categories(db, current_user.id, page, page_size)
    total = count_active_categories(db, current_user.id)
    return categories, total


def get_user_category(db: Session, current_user: User, category_id: uuid.UUID) -> Category:
    category = get_active_category_by_id(db, category_id, current_user.id)
    if category is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Categoria nao encontrada",
        )
    return category


def update_user_category(db: Session, current_user: User, category_id: uuid.UUID, payload: CategoryUpdate) -> Category:
    category = get_user_category(db, current_user, category_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        category.name = update_data["name"].strip()
    if "type" in update_data and update_data["type"] is not None:
        category.type = update_data["type"]
    if "color" in update_data:
        category.color = update_data["color"].strip() if update_data["color"] else None
    if "icon" in update_data:
        category.icon = update_data["icon"].strip() if update_data["icon"] else None
    if "is_active" in update_data and update_data["is_active"] is not None:
        category.is_active = update_data["is_active"]

    return save_category(db, category)


def delete_user_category(db: Session, current_user: User, category_id: uuid.UUID) -> Category:
    category = get_user_category(db, current_user, category_id)
    category.is_active = False
    return save_category(db, category)
