import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AiMessageCreate(BaseModel):
    message: str = Field(min_length=2, max_length=1000)


class AiMessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    source: str
    feedback: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AiAnalysisPeriod(BaseModel):
    label: str
    start_date: date
    end_date: date


class AiInsight(BaseModel):
    key: str
    label: str
    value: str
    description: str
    tone: Literal["neutral", "positive", "warning", "negative"]
    href: str


class AiAssistantReply(BaseModel):
    answer: str
    source: str
    disclaimer: str
    fallback_reason: str | None = None
    suggestions: list[str]
    analysis_period: AiAnalysisPeriod
    insights: list[AiInsight]
    user_message: AiMessageRead
    assistant_message: AiMessageRead


class AiMessageFeedbackUpdate(BaseModel):
    feedback: str = Field(pattern="^(helpful|not_helpful)$")
