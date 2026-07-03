from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.security import create_access_token, get_password_hash
from app.database.connection import SessionLocal
from app.main import app
from app.models.user import User
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def unique_email(prefix: str = "admin") -> str:
    return f"meusaldo.{prefix}.{uuid4().hex[:8]}@gmail.com"


def cleanup_user(email: str) -> None:
    db = SessionLocal()
    try:
        user = get_user_by_email(db, email)
        if user is not None:
            db.delete(user)
            db.commit()
    finally:
        db.close()


def create_test_user(email: str, role: str = "user") -> User:
    db = SessionLocal()
    try:
        user = User(
            name="Usuario Admin Teste" if role == "admin" else "Usuario Comum Teste",
            email=email,
            password_hash=get_password_hash("SenhaForte123"),
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def token_for(user: User) -> str:
    return create_access_token(str(user.id))


def test_admin_metrics_requires_authentication() -> None:
    response = client.get("/api/v1/admin")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


def test_admin_metrics_blocks_common_user() -> None:
    email = unique_email("common")
    cleanup_user(email)
    user = create_test_user(email, role="user")

    response = client.get(
        "/api/v1/admin",
        headers={"Authorization": f"Bearer {token_for(user)}"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"

    cleanup_user(email)


def test_admin_metrics_and_users_work_for_admin() -> None:
    admin_email = unique_email("admin")
    common_email = unique_email("listed")
    cleanup_user(admin_email)
    cleanup_user(common_email)
    admin_user = create_test_user(admin_email, role="admin")
    common_user = create_test_user(common_email, role="user")
    headers = {"Authorization": f"Bearer {token_for(admin_user)}"}

    metrics_response = client.get("/api/v1/admin", headers=headers)
    users_response = client.get("/api/v1/admin/users?page=1&page_size=100", headers=headers)

    assert metrics_response.status_code == 200
    metrics = metrics_response.json()["data"]
    assert metrics["total_users"] >= 2
    assert metrics["new_users_this_month"] >= 2

    assert users_response.status_code == 200
    users = users_response.json()["data"]
    listed_user = next(user for user in users if user["id"] == str(common_user.id))
    assert listed_user["email"] == common_email
    assert set(listed_user) == {"id", "name", "email", "created_at", "last_login_at"}

    cleanup_user(admin_email)
    cleanup_user(common_email)
