import uuid

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.rate_limit import InMemoryRateLimiter
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.models.user import User
from app.repositories.user_repository import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
auth_rate_limiter = InMemoryRateLimiter(
    limit=settings.rate_limit_auth_requests,
    window_seconds=settings.rate_limit_auth_window_seconds,
)
ai_rate_limiter = InMemoryRateLimiter(
    limit=settings.rate_limit_ai_requests,
    window_seconds=settings.rate_limit_ai_window_seconds,
)


def _client_key(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{request.url.path}:{host}"


def _raise_rate_limit_error(retry_after_seconds: int) -> None:
    raise AppError(
        status_code=429,
        code="RATE_LIMIT_EXCEEDED",
        message="Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.",
        details={"retry_after_seconds": retry_after_seconds},
    )


def auth_rate_limit(request: Request) -> None:
    retry_after_seconds = auth_rate_limiter.check(_client_key(request))

    if retry_after_seconds is not None:
        _raise_rate_limit_error(retry_after_seconds)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if token is None:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Token de autenticacao ausente",
        )

    payload = decode_access_token(token)
    subject = payload.get("sub")

    if subject is None:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Token invalido",
        )

    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Token invalido",
        ) from exc

    user = get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Usuario nao autenticado",
        )

    return user


def ai_assistant_rate_limit(current_user: User = Depends(get_current_user)) -> None:
    retry_after_seconds = ai_rate_limiter.check(f"ai-assistant:{current_user.id}")

    if retry_after_seconds is not None:
        _raise_rate_limit_error(retry_after_seconds)


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="Acesso administrativo restrito",
        )

    return current_user
