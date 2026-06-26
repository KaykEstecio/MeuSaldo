from calendar import monthrange
from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.user import User
from app.repositories.dashboard_repository import (
    count_active_accounts,
    get_monthly_transaction_totals,
    get_total_balance,
    list_cashflow_by_day,
    list_expenses_by_category,
)
from app.schemas.dashboard import (
    DashboardCashflowPoint,
    DashboardCategoryExpense,
    DashboardPeriod,
    DashboardSummary,
)


def build_period(year: int | None, month: int | None) -> DashboardPeriod:
    today = datetime.now(UTC).date()
    selected_year = year or today.year
    selected_month = month or today.month

    if selected_year < 2000 or selected_year > 2100:
        raise AppError(
            status_code=400,
            code="VALIDATION_ERROR",
            message="Ano invalido para o dashboard",
        )
    if selected_month < 1 or selected_month > 12:
        raise AppError(
            status_code=400,
            code="VALIDATION_ERROR",
            message="Mes invalido para o dashboard",
        )

    last_day = monthrange(selected_year, selected_month)[1]
    return DashboardPeriod(
        year=selected_year,
        month=selected_month,
        start_date=date(selected_year, selected_month, 1),
        end_date=date(selected_year, selected_month, last_day),
    )


def get_dashboard_summary(
    db: Session,
    current_user: User,
    year: int | None = None,
    month: int | None = None,
) -> DashboardSummary:
    period = build_period(year, month)
    monthly_income, monthly_expense, transactions_count = get_monthly_transaction_totals(
        db,
        current_user.id,
        period.start_date,
        period.end_date,
    )

    expense_by_category = [
        DashboardCategoryExpense(category_id=category_id, category_name=name, amount=amount)
        for category_id, name, amount in list_expenses_by_category(
            db,
            current_user.id,
            period.start_date,
            period.end_date,
        )
    ]
    cashflow_by_day = [
        DashboardCashflowPoint(date=day, income=income, expense=expense, net=income - expense)
        for day, income, expense in list_cashflow_by_day(
            db,
            current_user.id,
            period.start_date,
            period.end_date,
        )
    ]

    return DashboardSummary(
        period=period,
        total_balance=get_total_balance(db, current_user.id),
        monthly_income=monthly_income,
        monthly_expense=monthly_expense,
        monthly_net=monthly_income - monthly_expense,
        active_accounts=count_active_accounts(db, current_user.id),
        transactions_count=transactions_count,
        expense_by_category=expense_by_category,
        cashflow_by_day=cashflow_by_day,
    )
