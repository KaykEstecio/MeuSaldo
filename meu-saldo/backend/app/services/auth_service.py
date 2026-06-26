from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repository import create_user, get_user_by_email
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


def normalize_email(email: str) -> str:
    return email.strip().lower()


def register_user(db: Session, payload: RegisterRequest) -> User:
    email = normalize_email(payload.email)
    existing_user = get_user_by_email(db, email)

    if existing_user is not None:
        raise AppError(
            status_code=409,
            code="CONFLICT",
            message="Email ja cadastrado",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=get_password_hash(payload.password),
    )
    return create_user(db, user)


def authenticate_user(db: Session, payload: LoginRequest) -> TokenResponse:
    user = get_user_by_email(db, normalize_email(payload.email))

    if user is None or not verify_password(payload.password, user.password_hash):
        raise AppError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Credenciais invalidas",
        )

    if not user.is_active:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="Usuario inativo",
        )

    access_token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.jwt_access_token_expire_minutes,
    )
