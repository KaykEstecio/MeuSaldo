import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction


def add_transaction(db: Session, transaction: Transaction) -> Transaction:
    db.add(transaction)
    db.flush()
    db.refresh(transaction)
    return transaction


def get_transaction_by_id(db: Session, transaction_id: uuid.UUID, user_id: uuid.UUID) -> Transaction | None:
    return db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Transaction.is_active.is_(True),
        )
    )


def list_transactions(
    db: Session,
    user_id: uuid.UUID,
    page: int,
    page_size: int,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    transaction_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Transaction]:
    query = select(Transaction).where(Transaction.user_id == user_id, Transaction.is_active.is_(True))

    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)
    if transaction_type is not None:
        query = query.where(Transaction.type == transaction_type)
    if date_from is not None:
        query = query.where(Transaction.transaction_date >= date_from)
    if date_to is not None:
        query = query.where(Transaction.transaction_date <= date_to)

    offset = (page - 1) * page_size
    return list(
        db.scalars(
            query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    )


def count_transactions(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    transaction_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> int:
    query = (
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.user_id == user_id, Transaction.is_active.is_(True))
    )

    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)
    if transaction_type is not None:
        query = query.where(Transaction.type == transaction_type)
    if date_from is not None:
        query = query.where(Transaction.transaction_date >= date_from)
    if date_to is not None:
        query = query.where(Transaction.transaction_date <= date_to)

    return db.scalar(query) or 0


def save_transaction(db: Session, transaction: Transaction) -> Transaction:
    db.add(transaction)
    db.flush()
    db.refresh(transaction)
    return transaction
