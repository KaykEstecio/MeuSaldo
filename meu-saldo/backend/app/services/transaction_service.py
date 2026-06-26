import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories.account_repository import (
    get_active_account_by_id,
    get_active_account_by_id_for_update,
    list_active_accounts_by_ids_for_update,
)
from app.repositories.category_repository import get_active_category_by_id
from app.repositories.transaction_repository import (
    add_transaction,
    count_transactions,
    get_transaction_by_id,
    list_transactions,
    save_transaction,
)
from app.schemas.transaction import TransactionCreate, TransactionUpdate


def apply_balance(account: Account, transaction_type: str, amount: Decimal) -> None:
    if transaction_type == "income":
        account.current_balance += amount
    else:
        account.current_balance -= amount


def reverse_balance(account: Account, transaction_type: str, amount: Decimal) -> None:
    if transaction_type == "income":
        account.current_balance -= amount
    else:
        account.current_balance += amount


def get_owned_account(db: Session, current_user: User, account_id: uuid.UUID, lock_for_update: bool = False) -> Account:
    if lock_for_update:
        account = get_active_account_by_id_for_update(db, account_id, current_user.id)
    else:
        account = get_active_account_by_id(db, account_id, current_user.id)
    if account is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Conta nao encontrada",
        )
    return account


def get_owned_accounts_for_balance_update(
    db: Session,
    current_user: User,
    account_ids: list[uuid.UUID],
) -> dict[uuid.UUID, Account]:
    accounts = list_active_accounts_by_ids_for_update(db, account_ids, current_user.id)
    accounts_by_id = {account.id: account for account in accounts}

    if any(account_id not in accounts_by_id for account_id in account_ids):
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Conta nao encontrada",
        )

    return accounts_by_id


def get_owned_category(db: Session, current_user: User, category_id: uuid.UUID, transaction_type: str) -> Category:
    category = get_active_category_by_id(db, category_id, current_user.id)
    if category is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Categoria nao encontrada",
        )
    if category.type != transaction_type:
        raise AppError(
            status_code=400,
            code="BUSINESS_RULE_VIOLATION",
            message="Tipo da categoria incompativel com a transacao",
        )
    return category


def create_user_transaction(db: Session, current_user: User, payload: TransactionCreate) -> Transaction:
    account = get_owned_account(db, current_user, payload.account_id, lock_for_update=True)
    category = get_owned_category(db, current_user, payload.category_id, payload.type)

    transaction = Transaction(
        user_id=current_user.id,
        account_id=account.id,
        category_id=category.id,
        type=payload.type,
        amount=payload.amount,
        description=payload.description.strip(),
        transaction_date=payload.transaction_date,
    )

    try:
        apply_balance(account, transaction.type, transaction.amount)
        transaction = add_transaction(db, transaction)
        db.commit()
        db.refresh(account)
        db.refresh(transaction)
        return transaction
    except Exception:
        db.rollback()
        raise


def list_user_transactions(
    db: Session,
    current_user: User,
    page: int,
    page_size: int,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    transaction_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[Transaction], int]:
    transactions = list_transactions(
        db,
        current_user.id,
        page,
        page_size,
        account_id,
        category_id,
        transaction_type,
        date_from,
        date_to,
    )
    total = count_transactions(
        db,
        current_user.id,
        account_id,
        category_id,
        transaction_type,
        date_from,
        date_to,
    )
    return transactions, total


def get_user_transaction(db: Session, current_user: User, transaction_id: uuid.UUID) -> Transaction:
    transaction = get_transaction_by_id(db, transaction_id, current_user.id)
    if transaction is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Transacao nao encontrada",
        )
    return transaction


def update_user_transaction(
    db: Session,
    current_user: User,
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
) -> Transaction:
    transaction = get_user_transaction(db, current_user, transaction_id)
    update_data = payload.model_dump(exclude_unset=True)

    new_account_id = update_data.get("account_id", transaction.account_id)
    new_type = update_data.get("type", transaction.type)
    new_amount = update_data.get("amount", transaction.amount)
    new_category_id = update_data.get("category_id", transaction.category_id)

    if new_category_id is None:
        raise AppError(
            status_code=400,
            code="BUSINESS_RULE_VIOLATION",
            message="Categoria e obrigatoria",
        )

    accounts_by_id = get_owned_accounts_for_balance_update(
        db,
        current_user,
        [transaction.account_id, new_account_id],
    )
    old_account = accounts_by_id[transaction.account_id]
    new_account = accounts_by_id[new_account_id]
    new_category = get_owned_category(db, current_user, new_category_id, new_type)

    try:
        reverse_balance(old_account, transaction.type, transaction.amount)
        apply_balance(new_account, new_type, new_amount)

        transaction.account_id = new_account.id
        transaction.category_id = new_category.id
        transaction.type = new_type
        transaction.amount = new_amount

        if "description" in update_data and update_data["description"] is not None:
            transaction.description = update_data["description"].strip()
        if "transaction_date" in update_data and update_data["transaction_date"] is not None:
            transaction.transaction_date = update_data["transaction_date"]

        db.add(transaction)
        db.flush()
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception:
        db.rollback()
        raise


def delete_user_transaction(db: Session, current_user: User, transaction_id: uuid.UUID) -> Transaction:
    transaction = get_user_transaction(db, current_user, transaction_id)
    account = get_owned_account(db, current_user, transaction.account_id, lock_for_update=True)

    try:
        reverse_balance(account, transaction.type, transaction.amount)
        transaction.is_active = False
        transaction.deleted_at = datetime.now(UTC)
        transaction = save_transaction(db, transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception:
        db.rollback()
        raise
