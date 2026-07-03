import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AiMessageCreate(BaseModel):
    message: str = Field(min_length=2, max_length=1000)


class AiMessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AiAssistantReply(BaseModel):
    answer: str
    source: str
    disclaimer: str
    user_message: AiMessageRead
    assistant_message: AiMessageRead
