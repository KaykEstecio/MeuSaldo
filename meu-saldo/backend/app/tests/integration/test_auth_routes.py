from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.models.user import User
from app.repositories.user_repository import get_user_by_email
from app.core.security import get_password_hash


client = TestClient(app)


def unique_email() -> str:
    return f"meusaldo.test.{uuid4().hex[:8]}@gmail.com"


def cleanup_user(email: str) -> None:
    db = SessionLocal()
    try:
        user = get_user_by_email(db, email)
        if user is not None:
            db.delete(user)
            db.commit()
    finally:
        db.close()


def test_register_login_and_current_user() -> None:
    email = unique_email()
    cleanup_user(email)

    register_response = client.post(
        "/api/v1/auth/register",
        json={"name": "Usuario Teste", "email": email, "password": "SenhaForte123"},
    )

    assert register_response.status_code == 201
    register_data = register_response.json()
    assert register_data["data"]["email"] == email
    assert "password_hash" not in register_data["data"]

    duplicate_response = client.post(
        "/api/v1/auth/register",
        json={"name": "Usuario Teste", "email": email, "password": "SenhaForte123"},
    )

    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["error"]["code"] == "CONFLICT"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["data"]["access_token"]
    assert token
    db = SessionLocal()
    try:
        logged_user = get_user_by_email(db, email)
        assert logged_user is not None
        assert logged_user.last_login_at is not None
    finally:
        db.close()

    current_user_response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert current_user_response.status_code == 200
    assert current_user_response.json()["data"]["email"] == email

    cleanup_user(email)


def test_login_with_invalid_password_returns_official_error() -> None:
    email = unique_email()
    cleanup_user(email)

    db = SessionLocal()
    try:
        user = User(
            name="Usuario Teste",
            email=email,
            password_hash=get_password_hash("SenhaCorreta123"),
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaErrada123"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"

    cleanup_user(email)


def test_login_with_corrupted_password_hash_returns_invalid_credentials() -> None:
    email = unique_email()
    cleanup_user(email)

    db = SessionLocal()
    try:
        user = User(
            name="Usuario Teste",
            email=email,
            password_hash="hash-corrompido",
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaCorreta123"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"

    cleanup_user(email)


def test_current_user_without_token_returns_official_error() -> None:
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


def test_validation_error_does_not_echo_password_input() -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "U", "email": "email-invalido", "password": "123"},
    )

    content = response.text
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "123" not in content


def test_unknown_route_returns_official_error() -> None:
    response = client.get("/api/v1/nao-existe")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"


def test_method_not_allowed_returns_official_error() -> None:
    response = client.put("/api/v1/auth/login")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_refresh_cookie_rotates_and_logout_revokes_session() -> None:
    email = unique_email()
    cleanup_user(email)
    client.post(
        "/api/v1/auth/register",
        json={"name": "Usuario Sessao", "email": email, "password": "SenhaForte123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )
    assert login_response.status_code == 200
    assert "HttpOnly" in login_response.headers["set-cookie"]
    first_cookie = client.cookies.get("meusaldo_refresh")
    assert first_cookie

    refresh_response = client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 200
    assert refresh_response.json()["data"]["access_token"]
    rotated_cookie = client.cookies.get("meusaldo_refresh")
    assert rotated_cookie and rotated_cookie != first_cookie

    logout_response = client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json()["data"]["revoked"] is True
    assert client.cookies.get("meusaldo_refresh") is None

    client.cookies.set("meusaldo_refresh", rotated_cookie, path="/api/v1/auth")
    revoked_response = client.post("/api/v1/auth/refresh")
    assert revoked_response.status_code == 401
    cleanup_user(email)


def test_refresh_rejects_untrusted_origin() -> None:
    response = client.post(
        "/api/v1/auth/refresh",
        headers={"Origin": "https://example.invalid"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
