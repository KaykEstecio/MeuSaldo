import uuid
from calendar import monthrange
from datetime import date
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.budget import Budget
from app.models.category import Category
from app.models.user import User
from app.repositories.budget_repository import (
    count_active_budgets,
    create_budget,
    get_active_budget_by_id,
    get_active_budget_by_period,
    get_budget_spent_amount,
    list_active_budgets,
    save_budget,
)
from app.repositories.category_repository import get_active_category_by_id
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate


MONEY_SCALE = Decimal("0.01")
PERCENT_SCALE = Decimal("0.01")


def format_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_SCALE)


def format_percent(value: Decimal) -> Decimal:
    return value.quantize(PERCENT_SCALE)


def get_period_dates(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def get_owned_expense_category(db: Session, current_user: User, category_id: uuid.UUID) -> Category:
    category = get_active_category_by_id(db, category_id, current_user.id)
    if category is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Categoria nao encontrada",
        )
    if category.type != "expense":
        raise AppError(
            status_code=400,
            code="BUSINESS_RULE_VIOLATION",
            message="Orcamento deve usar categoria de despesa",
        )
    return category


def ensure_unique_active_budget(
    db: Session,
    current_user: User,
    category_id: uuid.UUID,
    month: int,
    year: int,
    budget_id: uuid.UUID | None = None,
) -> None:
    existing_budget = get_active_budget_by_period(db, current_user.id, category_id, month, year)
    if existing_budget is not None and existing_budget.id != budget_id:
        raise AppError(
            status_code=409,
            code="CONFLICT",
            message="Ja existe orcamento ativo para esta categoria no periodo",
        )


def raise_budget_conflict() -> None:
    raise AppError(
        status_code=409,
        code="CONFLICT",
        message="Ja existe orcamento ativo para esta categoria no periodo",
    )


def build_budget_read(db: Session, budget: Budget) -> BudgetRead:
    start_date, end_date = get_period_dates(budget.year, budget.month)
    spent_amount = format_money(
        get_budget_spent_amount(
            db,
            budget.user_id,
            budget.category_id,
            start_date,
            end_date,
        )
    )
    limit_amount = format_money(budget.limit_amount)
    remaining_amount = format_money(limit_amount - spent_amount)
    usage_percent = format_percent((spent_amount / limit_amount) * Decimal("100"))

    return BudgetRead(
        id=budget.id,
        category_id=budget.category_id,
        category_name=budget.category.name,
        month=budget.month,
        year=budget.year,
        limit_amount=limit_amount,
        spent_amount=spent_amount,
        remaining_amount=remaining_amount,
        usage_percent=usage_percent,
        is_over_limit=spent_amount > limit_amount,
        is_active=budget.is_active,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
    )


def create_user_budget(db: Session, current_user: User, payload: BudgetCreate) -> BudgetRead:
    category = get_owned_expense_category(db, current_user, payload.category_id)
    ensure_unique_active_budget(db, current_user, category.id, payload.month, payload.year)

    budget = Budget(
        user_id=current_user.id,
        category_id=category.id,
        month=payload.month,
        year=payload.year,
        limit_amount=payload.limit_amount,
    )
    try:
        budget = create_budget(db, budget)
    except IntegrityError:
        db.rollback()
        raise_budget_conflict()
    return build_budget_read(db, budget)


def list_user_budgets(
    db: Session,
    current_user: User,
    page: int,
    page_size: int,
    month: int | None = None,
    year: int | None = None,
) -> tuple[list[BudgetRead], int]:
    budgets = list_active_budgets(db, current_user.id, page, page_size, month, year)
    total = count_active_budgets(db, current_user.id, month, year)
    return [build_budget_read(db, budget) for budget in budgets], total


def get_user_budget(db: Session, current_user: User, budget_id: uuid.UUID) -> BudgetRead:
    budget = get_active_budget_by_id(db, budget_id, current_user.id)
    if budget is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Orcamento nao encontrado",
        )
    return build_budget_read(db, budget)


def update_user_budget(db: Session, current_user: User, budget_id: uuid.UUID, payload: BudgetUpdate) -> BudgetRead:
    budget = get_active_budget_by_id(db, budget_id, current_user.id)
    if budget is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Orcamento nao encontrado",
        )

    update_data = payload.model_dump(exclude_unset=True)
    category_id = update_data.get("category_id", budget.category_id)
    month = update_data.get("month", budget.month)
    year = update_data.get("year", budget.year)

    category = get_owned_expense_category(db, current_user, category_id)
    ensure_unique_active_budget(db, current_user, category.id, month, year, budget.id)

    budget.category_id = category.id
    budget.month = month
    budget.year = year

    if "limit_amount" in update_data and update_data["limit_amount"] is not None:
        budget.limit_amount = update_data["limit_amount"]
    if "is_active" in update_data and update_data["is_active"] is not None:
        budget.is_active = update_data["is_active"]

    try:
        budget = save_budget(db, budget)
    except IntegrityError:
        db.rollback()
        raise_budget_conflict()
    return build_budget_read(db, budget)


def delete_user_budget(db: Session, current_user: User, budget_id: uuid.UUID) -> BudgetRead:
    budget = get_active_budget_by_id(db, budget_id, current_user.id)
    if budget is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Orcamento nao encontrado",
        )

    budget.is_active = False
    budget = save_budget(db, budget)
    return build_budget_read(db, budget)
