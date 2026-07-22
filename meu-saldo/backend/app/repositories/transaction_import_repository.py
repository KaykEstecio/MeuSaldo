import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.transaction_import import TransactionImport


def find_existing_import_fingerprints(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    fingerprints: set[str],
) -> set[str]:
    if not fingerprints:
        return set()
    return set(
        db.scalars(
            select(Transaction.import_fingerprint).where(
                Transaction.user_id == user_id,
                Transaction.account_id == account_id,
                Transaction.is_active.is_(True),
                Transaction.import_fingerprint.in_(fingerprints),
            )
        )
    )


def list_transactions_for_duplicate_check(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    date_from: date,
    date_to: date,
) -> list[Transaction]:
    return list(
        db.scalars(
            select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.account_id == account_id,
                Transaction.is_active.is_(True),
                Transaction.transaction_date >= date_from,
                Transaction.transaction_date <= date_to,
            )
        )
    )


def list_categorized_transactions_for_suggestions(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 500,
) -> list[Transaction]:
    return list(
        db.scalars(
            select(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.is_active.is_(True),
                Transaction.category_id.is_not(None),
            )
            .order_by(Transaction.created_at.desc())
            .limit(limit)
        )
    )


def list_transaction_imports(db: Session, user_id: uuid.UUID, limit: int = 20) -> list[TransactionImport]:
    return list(
        db.scalars(
            select(TransactionImport)
            .where(TransactionImport.user_id == user_id)
            .order_by(TransactionImport.created_at.desc(), TransactionImport.id.desc())
            .limit(limit)
        )
    )
