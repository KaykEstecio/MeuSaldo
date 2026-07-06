import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.user import User
from app.repositories.user_repository import (
    count_users,
    count_users_created_since,
    get_user_by_id,
    list_users,
    update_user_admin_fields,
)
from app.schemas.admin import AdminMetricsRead, AdminUserUpdate


def get_admin_metrics(db: Session) -> AdminMetricsRead:
    now = datetime.now(UTC)
    month_start = datetime(now.year, now.month, 1, tzinfo=UTC)

    return AdminMetricsRead(
        total_users=count_users(db),
        new_users_this_month=count_users_created_since(db, month_start),
    )


def list_admin_users(db: Session, page: int, page_size: int) -> list[User]:
    return list_users(db, page=page, page_size=page_size)


def update_admin_user(db: Session, target_user_id: uuid.UUID, admin_user: User, payload: AdminUserUpdate) -> User:
    target_user = get_user_by_id(db, target_user_id)

    if target_user is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Usuario nao encontrado",
        )

    if target_user.id == admin_user.id and payload.is_active is False:
        raise AppError(
            status_code=409,
            code="BUSINESS_RULE_VIOLATION",
            message="Administrador nao pode bloquear a propria conta",
        )

    if target_user.id == admin_user.id and payload.role == "user":
        raise AppError(
            status_code=409,
            code="BUSINESS_RULE_VIOLATION",
            message="Administrador nao pode remover a propria permissao",
        )

    return update_user_admin_fields(
        db,
        target_user,
        role=payload.role,
        is_active=payload.is_active,
    )


def deactivate_admin_user(db: Session, target_user_id: uuid.UUID, admin_user: User) -> User:
    return update_admin_user(
        db,
        target_user_id=target_user_id,
        admin_user=admin_user,
        payload=AdminUserUpdate(is_active=False),
    )
