import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.schemas.transaction import TransactionCreate, TransactionRead, TransactionType, TransactionUpdate
from app.services.transaction_service import (
    create_user_transaction,
    delete_user_transaction,
    get_user_transaction,
    list_user_transactions,
    update_user_transaction,
)


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=ApiResponse[TransactionRead], status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TransactionRead]:
    transaction = create_user_transaction(db, current_user, payload)
    return ApiResponse(data=TransactionRead.model_validate(transaction), message="Transacao criada com sucesso")


@router.get("", response_model=ListResponse[TransactionRead])
def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    type: TransactionType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[TransactionRead]:
    transactions, total = list_user_transactions(
        db,
        current_user,
        page,
        page_size,
        account_id,
        category_id,
        type,
        date_from,
        date_to,
    )
    return ListResponse(
        data=[TransactionRead.model_validate(transaction) for transaction in transactions],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/{transaction_id}", response_model=ApiResponse[TransactionRead])
def get_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TransactionRead]:
    transaction = get_user_transaction(db, current_user, transaction_id)
    return ApiResponse(data=TransactionRead.model_validate(transaction), message="Transacao encontrada")


@router.patch("/{transaction_id}", response_model=ApiResponse[TransactionRead])
def update_transaction(
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TransactionRead]:
    transaction = update_user_transaction(db, current_user, transaction_id, payload)
    return ApiResponse(data=TransactionRead.model_validate(transaction), message="Transacao atualizada com sucesso")


@router.delete("/{transaction_id}", response_model=ApiResponse[TransactionRead])
def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TransactionRead]:
    transaction = delete_user_transaction(db, current_user, transaction_id)
    return ApiResponse(data=TransactionRead.model_validate(transaction), message="Transacao removida com sucesso")
