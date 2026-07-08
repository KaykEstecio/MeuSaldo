from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import auth_rate_limit
from app.database.connection import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.common import ApiResponse
from app.schemas.user import UserRead
from app.services.auth_service import authenticate_user, register_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=ApiResponse[UserRead],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limit)],
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> ApiResponse[UserRead]:
    user = register_user(db, payload)
    return ApiResponse(data=UserRead.model_validate(user), message="Usuario cadastrado com sucesso")


@router.post("/login", response_model=ApiResponse[TokenResponse], dependencies=[Depends(auth_rate_limit)])
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    token = authenticate_user(db, payload)
    return ApiResponse(data=token, message="Login realizado com sucesso")
