from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserRead


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=ApiResponse[UserRead])
def read_current_user(current_user: User = Depends(get_current_user)) -> ApiResponse[UserRead]:
    return ApiResponse(
        data=UserRead.model_validate(current_user),
        message="Usuario autenticado",
    )
