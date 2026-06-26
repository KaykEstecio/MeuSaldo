from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class DashboardPeriod(BaseModel):
    year: int
    month: int
    start_date: date
    end_date: date


class DashboardCategoryExpense(BaseModel):
    category_id: UUID | None
    category_name: str
    amount: Decimal


class DashboardCashflowPoint(BaseModel):
    date: date
    income: Decimal
    expense: Decimal
    net: Decimal


class DashboardSummary(BaseModel):
    period: DashboardPeriod
    total_balance: Decimal
    monthly_income: Decimal
    monthly_expense: Decimal
    monthly_net: Decimal
    active_accounts: int
    transactions_count: int
    expense_by_category: list[DashboardCategoryExpense]
    cashflow_by_day: list[DashboardCashflowPoint]
