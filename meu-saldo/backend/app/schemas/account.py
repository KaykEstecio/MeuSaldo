import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AccountType = Literal["checking", "savings", "cash", "credit_card", "investment", "other"]


class AccountCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    type: AccountType
    initial_balance: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), max_digits=12, decimal_places=2)


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    type: AccountType | None = None
    is_active: bool | None = None


class AccountRead(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    initial_balance: Decimal
    current_balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
