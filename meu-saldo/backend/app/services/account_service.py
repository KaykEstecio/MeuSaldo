import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.account import Account
from app.models.user import User
from app.repositories.account_repository import (
    count_active_accounts,
    create_account,
    get_active_account_by_id,
    list_active_accounts,
    save_account,
)
from app.schemas.account import AccountCreate, AccountUpdate


def create_user_account(db: Session, current_user: User, payload: AccountCreate) -> Account:
    initial_balance = payload.initial_balance
    account = Account(
        user_id=current_user.id,
        name=payload.name.strip(),
        type=payload.type,
        initial_balance=initial_balance,
        current_balance=initial_balance,
    )
    return create_account(db, account)


def list_user_accounts(db: Session, current_user: User, page: int, page_size: int) -> tuple[list[Account], int]:
    accounts = list_active_accounts(db, current_user.id, page, page_size)
    total = count_active_accounts(db, current_user.id)
    return accounts, total


def get_user_account(db: Session, current_user: User, account_id: uuid.UUID) -> Account:
    account = get_active_account_by_id(db, account_id, current_user.id)
    if account is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Conta nao encontrada",
        )
    return account


def update_user_account(db: Session, current_user: User, account_id: uuid.UUID, payload: AccountUpdate) -> Account:
    account = get_user_account(db, current_user, account_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        account.name = update_data["name"].strip()
    if "type" in update_data and update_data["type"] is not None:
        account.type = update_data["type"]
    if "is_active" in update_data and update_data["is_active"] is not None:
        account.is_active = update_data["is_active"]

    return save_account(db, account)


def delete_user_account(db: Session, current_user: User, account_id: uuid.UUID) -> Account:
    account = get_user_account(db, current_user, account_id)
    account.is_active = False
    return save_account(db, account)
