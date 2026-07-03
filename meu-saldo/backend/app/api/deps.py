import uuid

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.models.user import User
from app.repositories.user_repository import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


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


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="Acesso administrativo restrito",
        )

    return current_user
