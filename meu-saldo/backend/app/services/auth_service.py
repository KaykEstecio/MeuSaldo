from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    hash_refresh_token_id,
    verify_password,
)
from app.models.refresh_session import RefreshSession
from app.models.user import User
from app.repositories.refresh_session_repository import (
    add_refresh_session,
    get_active_refresh_session,
    revoke_refresh_session,
)
from app.repositories.user_repository import create_user, get_user_by_email, update_user_last_login
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


def _prepare_session(db: Session, user: User) -> tuple[TokenResponse, str, RefreshSession]:
    access_token = create_access_token(str(user.id))
    refresh_token, token_id, expires_at = create_refresh_token(str(user.id))
    refresh_session = add_refresh_session(
        db,
        RefreshSession(
            user_id=user.id,
            token_hash=hash_refresh_token_id(token_id),
            expires_at=expires_at,
        ),
    )
    return (
        TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in_minutes=settings.jwt_access_token_expire_minutes,
        ),
        refresh_token,
        refresh_session,
    )


def authenticate_user(db: Session, payload: LoginRequest) -> tuple[TokenResponse, str]:
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

    user = update_user_last_login(db, user, datetime.now(UTC))
    token_response, refresh_token, refresh_session = _prepare_session(db, user)
    db.commit()
    db.refresh(refresh_session)
    return token_response, refresh_token


def refresh_user_session(db: Session, refresh_token: str) -> tuple[TokenResponse, str]:
    payload = decode_refresh_token(refresh_token)
    session = get_active_refresh_session(db, hash_refresh_token_id(str(payload["jti"])), for_update=True)
    if session is None:
        raise AppError(status_code=401, code="AUTHENTICATION_REQUIRED", message="Sessao expirada ou revogada")

    user = session.user
    if not user.is_active or str(user.id) != payload.get("sub"):
        revoke_refresh_session(db, session)
        db.commit()
        raise AppError(status_code=401, code="AUTHENTICATION_REQUIRED", message="Usuario nao autenticado")

    try:
        token_response, rotated_token, rotated_session = _prepare_session(db, user)
        revoke_refresh_session(db, session, replaced_by=rotated_session.id)
        db.commit()
        db.refresh(rotated_session)
    except Exception:
        db.rollback()
        raise
    return token_response, rotated_token


def revoke_user_session(db: Session, refresh_token: str | None) -> bool:
    if not refresh_token:
        return False
    try:
        payload = decode_refresh_token(refresh_token)
    except AppError:
        return False
    session = get_active_refresh_session(db, hash_refresh_token_id(str(payload["jti"])), for_update=True)
    if session is None:
        return False
    revoke_refresh_session(db, session)
    db.commit()
    return True
