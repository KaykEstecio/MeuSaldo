import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.account import Account


def create_account(db: Session, account: Account) -> Account:
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def get_active_account_by_id(db: Session, account_id: uuid.UUID, user_id: uuid.UUID) -> Account | None:
    return db.scalar(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == user_id,
            Account.is_active.is_(True),
        )
    )


def get_active_account_by_id_for_update(db: Session, account_id: uuid.UUID, user_id: uuid.UUID) -> Account | None:
    return db.scalar(
        select(Account)
        .where(
            Account.id == account_id,
            Account.user_id == user_id,
            Account.is_active.is_(True),
        )
        .with_for_update()
    )


def list_active_accounts_by_ids_for_update(
    db: Session,
    account_ids: list[uuid.UUID],
    user_id: uuid.UUID,
) -> list[Account]:
    ordered_ids = sorted(set(account_ids), key=str)
    if not ordered_ids:
        return []

    return list(
        db.scalars(
            select(Account)
            .where(
                Account.id.in_(ordered_ids),
                Account.user_id == user_id,
                Account.is_active.is_(True),
            )
            .order_by(Account.id)
            .with_for_update()
        )
    )


def list_active_accounts(db: Session, user_id: uuid.UUID, page: int, page_size: int) -> list[Account]:
    offset = (page - 1) * page_size
    return list(
        db.scalars(
            select(Account)
            .where(Account.user_id == user_id, Account.is_active.is_(True))
            .order_by(Account.created_at.desc(), Account.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    )


def count_active_accounts(db: Session, user_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count()).select_from(Account).where(Account.user_id == user_id, Account.is_active.is_(True))
    ) or 0


def save_account(db: Session, account: Account) -> Account:
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
