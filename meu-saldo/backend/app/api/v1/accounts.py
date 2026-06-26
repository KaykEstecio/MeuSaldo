import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.account import AccountCreate, AccountRead, AccountUpdate
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.services.account_service import (
    create_user_account,
    delete_user_account,
    get_user_account,
    list_user_accounts,
    update_user_account,
)


router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=ApiResponse[AccountRead], status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AccountRead]:
    account = create_user_account(db, current_user, payload)
    return ApiResponse(data=AccountRead.model_validate(account), message="Conta criada com sucesso")


@router.get("", response_model=ListResponse[AccountRead])
def list_accounts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[AccountRead]:
    accounts, total = list_user_accounts(db, current_user, page, page_size)
    return ListResponse(
        data=[AccountRead.model_validate(account) for account in accounts],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/{account_id}", response_model=ApiResponse[AccountRead])
def get_account(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AccountRead]:
    account = get_user_account(db, current_user, account_id)
    return ApiResponse(data=AccountRead.model_validate(account), message="Conta encontrada")


@router.patch("/{account_id}", response_model=ApiResponse[AccountRead])
def update_account(
    account_id: uuid.UUID,
    payload: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AccountRead]:
    account = update_user_account(db, current_user, account_id, payload)
    return ApiResponse(data=AccountRead.model_validate(account), message="Conta atualizada com sucesso")


@router.delete("/{account_id}", response_model=ApiResponse[AccountRead])
def delete_account(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AccountRead]:
    account = delete_user_account(db, current_user, account_id)
    return ApiResponse(data=AccountRead.model_validate(account), message="Conta removida com sucesso")
