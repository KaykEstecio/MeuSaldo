import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.admin import AdminMetricsRead, AdminUserRead, AdminUserUpdate
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.services.admin_service import deactivate_admin_user, get_admin_metrics, list_admin_users, update_admin_user


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("", response_model=ApiResponse[AdminMetricsRead])
def read_admin_overview(
    _admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminMetricsRead]:
    return ApiResponse(
        data=get_admin_metrics(db),
        message="Painel administrativo carregado",
    )


@router.get("/users", response_model=ListResponse[AdminUserRead])
def read_admin_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> ListResponse[AdminUserRead]:
    users = list_admin_users(db, page=page, page_size=page_size)
    metrics = get_admin_metrics(db)

    return ListResponse(
        data=[AdminUserRead.model_validate(user) for user in users],
        meta=PaginationMeta(page=page, page_size=page_size, total=metrics.total_users),
    )


@router.patch("/users/{user_id}", response_model=ApiResponse[AdminUserRead])
def update_user_control(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserRead]:
    user = update_admin_user(db, target_user_id=user_id, admin_user=admin_user, payload=payload)
    return ApiResponse(
        data=AdminUserRead.model_validate(user),
        message="Usuario atualizado pelo administrador",
    )


@router.delete("/users/{user_id}", response_model=ApiResponse[AdminUserRead])
def deactivate_user(
    user_id: uuid.UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminUserRead]:
    user = deactivate_admin_user(db, target_user_id=user_id, admin_user=admin_user)
    return ApiResponse(
        data=AdminUserRead.model_validate(user),
        message="Usuario bloqueado pelo administrador",
    )
