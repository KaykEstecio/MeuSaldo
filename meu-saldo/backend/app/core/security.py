from datetime import UTC, datetime, timedelta
import hashlib
import uuid
from typing import Any

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.exceptions import AppError


password_hash = PasswordHash.recommended()


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": subject,
        "exp": expires_at,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days)
    token_id = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "jti": token_id,
        "exp": expires_at,
        "type": "refresh",
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, token_id, expires_at


def hash_refresh_token_id(token_id: str) -> str:
    return hashlib.sha256(token_id.encode("utf-8")).hexdigest()


def decode_refresh_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except (ExpiredSignatureError, InvalidTokenError) as exc:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Sessao expirada ou invalida",
        ) from exc

    if payload.get("type") != "refresh" or not payload.get("jti"):
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Sessao invalida",
        )
    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except ExpiredSignatureError as exc:
        raise AppError(
            status_code=401,
            code="TOKEN_EXPIRED",
            message="Token expirado",
        ) from exc
    except InvalidTokenError as exc:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Token invalido",
        ) from exc

    if payload.get("type") != "access":
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Token invalido",
        )

    return payload
