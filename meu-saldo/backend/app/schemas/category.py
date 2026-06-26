import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


CategoryType = Literal["income", "expense"]


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    type: CategoryType
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=60)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    type: CategoryType | None = None
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=60)
    is_active: bool | None = None


class CategoryRead(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    color: str | None
    icon: str | None
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
