import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class AdminMetricsRead(BaseModel):
    total_users: int
    new_users_this_month: int


class AdminUserRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    created_at: datetime
    last_login_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
