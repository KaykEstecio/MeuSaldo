from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import auth_rate_limit
from app.database.connection import get_db
from app.core.config import settings
from app.core.exceptions import AppError
from app.schemas.auth import LoginRequest, LogoutResponse, RegisterRequest, TokenResponse
from app.schemas.common import ApiResponse
from app.schemas.user import UserRead
from app.services.auth_service import authenticate_user, refresh_user_session, register_user, revoke_user_session


router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        key=settings.jwt_refresh_cookie_name,
        value=refresh_token,
        max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.jwt_cookie_samesite,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(
        key=settings.jwt_refresh_cookie_name,
        path="/api/v1/auth",
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.jwt_cookie_samesite,
    )


def _validate_request_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_origin_list:
        raise AppError(status_code=403, code="FORBIDDEN", message="Origem nao autorizada")


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
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    token, refresh_token = authenticate_user(db, payload)
    _set_refresh_cookie(response, refresh_token)
    return ApiResponse(data=token, message="Login realizado com sucesso")


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[TokenResponse]:
    _validate_request_origin(request)
    refresh_token = request.cookies.get(settings.jwt_refresh_cookie_name)
    if not refresh_token:
        raise AppError(status_code=401, code="AUTHENTICATION_REQUIRED", message="Sessao ausente")
    token, rotated_token = refresh_user_session(db, refresh_token)
    _set_refresh_cookie(response, rotated_token)
    return ApiResponse(data=token, message="Sessao renovada com sucesso")


@router.post("/logout", response_model=ApiResponse[LogoutResponse])
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> ApiResponse[LogoutResponse]:
    _validate_request_origin(request)
    revoked = revoke_user_session(db, request.cookies.get(settings.jwt_refresh_cookie_name))
    _clear_refresh_cookie(response)
    return ApiResponse(data=LogoutResponse(revoked=revoked), message="Sessao encerrada com sucesso")
