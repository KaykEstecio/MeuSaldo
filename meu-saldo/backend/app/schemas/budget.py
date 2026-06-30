import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    limit_amount: Decimal = Field(gt=Decimal("0.00"), max_digits=12, decimal_places=2)


class BudgetUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    month: int | None = Field(default=None, ge=1, le=12)
    year: int | None = Field(default=None, ge=2000, le=2100)
    limit_amount: Decimal | None = Field(default=None, gt=Decimal("0.00"), max_digits=12, decimal_places=2)
    is_active: bool | None = None


class BudgetRead(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str
    month: int
    year: int
    limit_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    usage_percent: Decimal
    is_over_limit: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
