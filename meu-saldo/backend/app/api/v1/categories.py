import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.services.category_service import (
    create_user_category,
    delete_user_category,
    get_user_category,
    list_user_categories,
    update_user_category,
)


router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", response_model=ApiResponse[CategoryRead], status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[CategoryRead]:
    category = create_user_category(db, current_user, payload)
    return ApiResponse(data=CategoryRead.model_validate(category), message="Categoria criada com sucesso")


@router.get("", response_model=ListResponse[CategoryRead])
def list_categories(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[CategoryRead]:
    categories, total = list_user_categories(db, current_user, page, page_size)
    return ListResponse(
        data=[CategoryRead.model_validate(category) for category in categories],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/{category_id}", response_model=ApiResponse[CategoryRead])
def get_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[CategoryRead]:
    category = get_user_category(db, current_user, category_id)
    return ApiResponse(data=CategoryRead.model_validate(category), message="Categoria encontrada")


@router.patch("/{category_id}", response_model=ApiResponse[CategoryRead])
def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[CategoryRead]:
    category = update_user_category(db, current_user, category_id, payload)
    return ApiResponse(data=CategoryRead.model_validate(category), message="Categoria atualizada com sucesso")


@router.delete("/{category_id}", response_model=ApiResponse[CategoryRead])
def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[CategoryRead]:
    category = delete_user_category(db, current_user, category_id)
    return ApiResponse(data=CategoryRead.model_validate(category), message="Categoria removida com sucesso")
