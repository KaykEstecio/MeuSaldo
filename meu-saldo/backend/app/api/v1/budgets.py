import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.services.budget_service import (
    create_user_budget,
    delete_user_budget,
    get_user_budget,
    list_user_budgets,
    update_user_budget,
)


router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.post("", response_model=ApiResponse[BudgetRead], status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[BudgetRead]:
    budget = create_user_budget(db, current_user, payload)
    return ApiResponse(data=budget, message="Orcamento criado com sucesso")


@router.get("", response_model=ListResponse[BudgetRead])
def list_budgets(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[BudgetRead]:
    budgets, total = list_user_budgets(db, current_user, page, page_size, month, year)
    return ListResponse(
        data=budgets,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/{budget_id}", response_model=ApiResponse[BudgetRead])
def get_budget(
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[BudgetRead]:
    budget = get_user_budget(db, current_user, budget_id)
    return ApiResponse(data=budget, message="Orcamento encontrado")


@router.patch("/{budget_id}", response_model=ApiResponse[BudgetRead])
def update_budget(
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[BudgetRead]:
    budget = update_user_budget(db, current_user, budget_id, payload)
    return ApiResponse(data=budget, message="Orcamento atualizado com sucesso")


@router.delete("/{budget_id}", response_model=ApiResponse[BudgetRead])
def delete_budget(
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[BudgetRead]:
    budget = delete_user_budget(db, current_user, budget_id)
    return ApiResponse(data=budget, message="Orcamento removido com sucesso")
