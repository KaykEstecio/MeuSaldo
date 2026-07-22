import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TransactionType = Literal["income", "expense"]


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    type: TransactionType
    amount: Decimal = Field(gt=Decimal("0.00"), max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=255)
    transaction_date: date


class TransactionUpdate(BaseModel):
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    type: TransactionType | None = None
    amount: Decimal | None = Field(default=None, gt=Decimal("0.00"), max_digits=12, decimal_places=2)
    description: str | None = Field(default=None, min_length=1, max_length=255)
    transaction_date: date | None = None


class TransactionRead(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None
    import_id: uuid.UUID | None
    type: str
    amount: Decimal
    description: str
    transaction_date: date
    is_active: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
