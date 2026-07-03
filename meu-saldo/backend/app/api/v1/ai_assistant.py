from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.ai_assistant import AiAssistantReply, AiMessageCreate, AiMessageRead
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.services.ai_assistant_service import create_ai_assistant_reply, list_ai_messages


router = APIRouter(prefix="/ai-assistant", tags=["ai-assistant"])


@router.post("/messages", response_model=ApiResponse[AiAssistantReply], status_code=status.HTTP_201_CREATED)
def create_message(
    payload: AiMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AiAssistantReply]:
    reply = create_ai_assistant_reply(db, current_user, payload)
    return ApiResponse(data=reply, message="Resposta do assistente gerada com sucesso")


@router.get("/messages", response_model=ListResponse[AiMessageRead])
def list_messages(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[AiMessageRead]:
    messages, total = list_ai_messages(db, current_user, page, page_size)
    return ListResponse(
        data=[AiMessageRead.model_validate(message) for message in messages],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )
