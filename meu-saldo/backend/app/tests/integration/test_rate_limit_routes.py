from collections.abc import Iterator
from contextlib import contextmanager
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import ai_rate_limiter, auth_rate_limiter
from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


@contextmanager
def temporary_limit(limiter, limit: int, window_seconds: int) -> Iterator[None]:
    original_limit = limiter.limit
    original_window_seconds = limiter.window_seconds
    limiter.limit = limit
    limiter.window_seconds = window_seconds
    limiter.reset()
    try:
        yield
    finally:
        limiter.limit = original_limit
        limiter.window_seconds = original_window_seconds
        limiter.reset()


def unique_email() -> str:
    return f"meusaldo.rate.{uuid4().hex[:8]}@gmail.com"


def cleanup_user(email: str) -> None:
    db = SessionLocal()
    try:
        user = get_user_by_email(db, email)
        if user is not None:
            db.delete(user)
            db.commit()
    finally:
        db.close()


def create_user_token(email: str) -> str:
    cleanup_user(email)
    client.post(
        "/api/v1/auth/register",
        json={"name": "Usuario Rate", "email": email, "password": "SenhaForte123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )
    return login_response.json()["data"]["access_token"]


def test_auth_login_rate_limit_returns_official_error() -> None:
    with temporary_limit(auth_rate_limiter, limit=1, window_seconds=60):
        first_response = client.post(
            "/api/v1/auth/login",
            json={"email": "naoexiste@example.com", "password": "SenhaErrada123"},
        )
        second_response = client.post(
            "/api/v1/auth/login",
            json={"email": "naoexiste@example.com", "password": "SenhaErrada123"},
        )

    assert first_response.status_code == 401
    assert second_response.status_code == 429
    assert second_response.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "retry_after_seconds" in second_response.json()["error"]["details"]


def test_ai_assistant_rate_limit_returns_official_error() -> None:
    email = unique_email()
    token = create_user_token(email)
    headers = {"Authorization": f"Bearer {token}"}

    try:
        with temporary_limit(ai_rate_limiter, limit=1, window_seconds=60):
            first_response = client.post(
                "/api/v1/ai-assistant/messages",
                headers=headers,
                json={"message": "Como posso economizar este mes?"},
            )
            second_response = client.post(
                "/api/v1/ai-assistant/messages",
                headers=headers,
                json={"message": "Pode repetir a analise?"},
            )
    finally:
        cleanup_user(email)

    assert first_response.status_code == 201
    assert second_response.status_code == 429
    assert second_response.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "retry_after_seconds" in second_response.json()["error"]["details"]
