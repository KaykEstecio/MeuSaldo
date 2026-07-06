import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, model_validator


class AdminMetricsRead(BaseModel):
    total_users: int
    new_users_this_month: int


class AdminUserRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: Literal["user", "admin"]
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AdminUserUpdate(BaseModel):
    role: Literal["user", "admin"] | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def require_change(self) -> "AdminUserUpdate":
        if self.role is None and self.is_active is None:
            raise ValueError("Informe ao menos uma alteracao")
        return self
