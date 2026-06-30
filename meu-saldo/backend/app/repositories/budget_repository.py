import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.transaction import Transaction


ZERO = Decimal("0.00")


def create_budget(db: Session, budget: Budget) -> Budget:
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def get_active_budget_by_id(db: Session, budget_id: uuid.UUID, user_id: uuid.UUID) -> Budget | None:
    return db.scalar(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == user_id,
            Budget.is_active.is_(True),
        )
    )


def get_active_budget_by_period(
    db: Session,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    month: int,
    year: int,
) -> Budget | None:
    return db.scalar(
        select(Budget).where(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month,
            Budget.year == year,
            Budget.is_active.is_(True),
        )
    )


def list_active_budgets(
    db: Session,
    user_id: uuid.UUID,
    page: int,
    page_size: int,
    month: int | None = None,
    year: int | None = None,
) -> list[Budget]:
    offset = (page - 1) * page_size
    query = select(Budget).where(Budget.user_id == user_id, Budget.is_active.is_(True))

    if month is not None:
        query = query.where(Budget.month == month)
    if year is not None:
        query = query.where(Budget.year == year)

    return list(
        db.scalars(
            query.order_by(Budget.year.desc(), Budget.month.desc(), Budget.created_at.desc(), Budget.id.desc())
            .offset(offset)
            .limit(page_size)
        )
    )


def count_active_budgets(
    db: Session,
    user_id: uuid.UUID,
    month: int | None = None,
    year: int | None = None,
) -> int:
    query = select(func.count()).select_from(Budget).where(Budget.user_id == user_id, Budget.is_active.is_(True))

    if month is not None:
        query = query.where(Budget.month == month)
    if year is not None:
        query = query.where(Budget.year == year)

    return db.scalar(query) or 0


def get_budget_spent_amount(
    db: Session,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.type == "expense",
            Transaction.is_active.is_(True),
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
    )
    return total or ZERO


def save_budget(db: Session, budget: Budget) -> Budget:
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget
