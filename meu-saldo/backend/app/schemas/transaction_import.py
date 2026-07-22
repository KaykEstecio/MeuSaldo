import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ImportPreviewRequest(BaseModel):
    account_id: uuid.UUID
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=2_000_000)


class ImportPreviewRow(BaseModel):
    row_number: int
    transaction_date: date
    description: str
    amount: Decimal
    type: Literal["income", "expense"]
    suggested_category_id: uuid.UUID | None
    confidence: Decimal = Field(ge=Decimal("0"), le=Decimal("1"))
    suggestion_reason: str
    is_duplicate: bool


class ImportPreview(BaseModel):
    filename: str
    file_format: Literal["csv", "ofx"]
    total_rows: int
    duplicate_count: int
    ready_count: int
    rows: list[ImportPreviewRow]


class ImportConfirmRow(BaseModel):
    transaction_date: date
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)
    type: Literal["income", "expense"]
    category_id: uuid.UUID | None = None
    selected: bool = True


class ImportConfirmRequest(BaseModel):
    account_id: uuid.UUID
    filename: str = Field(min_length=1, max_length=255)
    file_format: Literal["csv", "ofx"]
    rows: list[ImportConfirmRow] = Field(min_length=1, max_length=500)


class TransactionImportRead(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    filename: str
    file_format: str
    status: str
    total_rows: int
    imported_count: int
    duplicate_count: int
    skipped_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImportConfirmResult(BaseModel):
    import_record: TransactionImportRead
    imported_count: int
    duplicate_count: int
    skipped_count: int

