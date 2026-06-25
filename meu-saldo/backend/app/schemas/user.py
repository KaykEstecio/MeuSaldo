import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
