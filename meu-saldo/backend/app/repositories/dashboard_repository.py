import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction


ZERO = Decimal("0.00")


def get_total_balance(db: Session, user_id: uuid.UUID) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(Account.current_balance), 0)).where(
            Account.user_id == user_id,
            Account.is_active.is_(True),
        )
    )
    return total or ZERO


def count_active_accounts(db: Session, user_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count()).select_from(Account).where(Account.user_id == user_id, Account.is_active.is_(True))
    ) or 0


def get_monthly_transaction_totals(
    db: Session,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> tuple[Decimal, Decimal, int]:
    income_total = func.coalesce(
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)),
        0,
    )
    expense_total = func.coalesce(
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)),
        0,
    )

    row = db.execute(
        select(income_total, expense_total, func.count(Transaction.id)).where(
            Transaction.user_id == user_id,
            Transaction.is_active.is_(True),
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
    ).one()

    return row[0] or ZERO, row[1] or ZERO, row[2] or 0


def list_expenses_by_category(
    db: Session,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> list[tuple[uuid.UUID | None, str, Decimal]]:
    rows = db.execute(
        select(
            Transaction.category_id,
            func.coalesce(Category.name, "Sem categoria"),
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .outerjoin(Category, Category.id == Transaction.category_id)
        .where(
            Transaction.user_id == user_id,
            Transaction.is_active.is_(True),
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .group_by(Transaction.category_id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()

    return [(row[0], row[1], row[2] or ZERO) for row in rows]


def list_cashflow_by_day(
    db: Session,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> list[tuple[date, Decimal, Decimal]]:
    income_total = func.coalesce(
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)),
        0,
    )
    expense_total = func.coalesce(
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)),
        0,
    )

    rows = db.execute(
        select(Transaction.transaction_date, income_total, expense_total)
        .where(
            Transaction.user_id == user_id,
            Transaction.is_active.is_(True),
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .group_by(Transaction.transaction_date)
        .order_by(Transaction.transaction_date.asc())
    ).all()

    return [(row[0], row[1] or ZERO, row[2] or ZERO) for row in rows]
