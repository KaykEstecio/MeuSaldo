from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def unique_email() -> str:
    return f"meusaldo.categories.{uuid4().hex[:8]}@gmail.com"


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
        json={"name": "Usuario Categoria", "email": email, "password": "SenhaForte123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )
    return login_response.json()["data"]["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_category_crud_for_authenticated_user() -> None:
    email = unique_email()
    token = create_user_token(email)

    create_response = client.post(
        "/api/v1/categories",
        headers=auth_headers(token),
        json={"name": "Mercado", "type": "expense", "color": "#22c55e", "icon": "shopping-cart"},
    )

    assert create_response.status_code == 201
    category = create_response.json()["data"]
    category_id = category["id"]
    assert category["name"] == "Mercado"
    assert category["type"] == "expense"
    assert category["is_active"] is True

    list_response = client.get("/api/v1/categories", headers=auth_headers(token))

    assert list_response.status_code == 200
    assert list_response.json()["meta"]["total"] == 1
    assert list_response.json()["data"][0]["id"] == category_id

    get_response = client.get(f"/api/v1/categories/{category_id}", headers=auth_headers(token))

    assert get_response.status_code == 200
    assert get_response.json()["data"]["id"] == category_id

    update_response = client.patch(
        f"/api/v1/categories/{category_id}",
        headers=auth_headers(token),
        json={"name": "Supermercado", "color": "#16a34a", "icon": None},
    )

    assert update_response.status_code == 200
    assert update_response.json()["data"]["name"] == "Supermercado"
    assert update_response.json()["data"]["color"] == "#16a34a"
    assert update_response.json()["data"]["icon"] is None

    delete_response = client.delete(f"/api/v1/categories/{category_id}", headers=auth_headers(token))

    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["is_active"] is False

    get_deleted_response = client.get(f"/api/v1/categories/{category_id}", headers=auth_headers(token))

    assert get_deleted_response.status_code == 404
    assert get_deleted_response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    cleanup_user(email)


def test_categories_are_isolated_by_user() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)

    create_response = client.post(
        "/api/v1/categories",
        headers=auth_headers(owner_token),
        json={"name": "Salario", "type": "income"},
    )
    category_id = create_response.json()["data"]["id"]

    other_get_response = client.get(f"/api/v1/categories/{category_id}", headers=auth_headers(other_token))
    other_patch_response = client.patch(
        f"/api/v1/categories/{category_id}",
        headers=auth_headers(other_token),
        json={"name": "Tentativa"},
    )
    other_delete_response = client.delete(f"/api/v1/categories/{category_id}", headers=auth_headers(other_token))
    other_list_response = client.get("/api/v1/categories", headers=auth_headers(other_token))

    assert other_get_response.status_code == 404
    assert other_patch_response.status_code == 404
    assert other_delete_response.status_code == 404
    assert other_list_response.status_code == 200
    assert other_list_response.json()["meta"]["total"] == 0

    cleanup_user(owner_email)
    cleanup_user(other_email)


def test_categories_require_authentication() -> None:
    response = client.get("/api/v1/categories")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


def test_category_validation_uses_official_error() -> None:
    email = unique_email()
    token = create_user_token(email)

    response = client.post(
        "/api/v1/categories",
        headers=auth_headers(token),
        json={"name": "C", "type": "invalid"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    cleanup_user(email)
