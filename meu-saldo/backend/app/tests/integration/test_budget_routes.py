from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def unique_email() -> str:
    return f"meusaldo.budgets.{uuid4().hex[:8]}@gmail.com"


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
        json={"name": "Usuario Orcamento", "email": email, "password": "SenhaForte123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )
    return login_response.json()["data"]["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_account(token: str, initial_balance: str = "500.00") -> str:
    response = client.post(
        "/api/v1/accounts",
        headers=auth_headers(token),
        json={"name": "Conta Orcamento", "type": "checking", "initial_balance": initial_balance},
    )
    return response.json()["data"]["id"]


def create_category(token: str, category_type: str, name: str = "Categoria Orcamento") -> str:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers(token),
        json={"name": name, "type": category_type},
    )
    return response.json()["data"]["id"]


def create_transaction(
    token: str,
    account_id: str,
    category_id: str,
    amount: str,
    transaction_date: str = "2026-06-15",
) -> str:
    response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(token),
        json={
            "account_id": account_id,
            "category_id": category_id,
            "type": "expense",
            "amount": amount,
            "description": "Gasto do orcamento",
            "transaction_date": transaction_date,
        },
    )
    return response.json()["data"]["id"]


def test_budget_crud_calculates_spending_and_allows_recreate_after_soft_delete() -> None:
    email = unique_email()
    token = create_user_token(email)
    account_id = create_account(token)
    category_id = create_category(token, "expense", "Mercado")

    create_transaction(token, account_id, category_id, "120.00")
    create_transaction(token, account_id, category_id, "40.00")

    create_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(token),
        json={"category_id": category_id, "month": 6, "year": 2026, "limit_amount": "150.00"},
    )

    assert create_response.status_code == 201
    budget = create_response.json()["data"]
    budget_id = budget["id"]
    assert budget["category_id"] == category_id
    assert budget["category_name"] == "Mercado"
    assert budget["limit_amount"] == "150.00"
    assert budget["spent_amount"] == "160.00"
    assert budget["remaining_amount"] == "-10.00"
    assert budget["usage_percent"] == "106.67"
    assert budget["is_over_limit"] is True

    duplicate_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(token),
        json={"category_id": category_id, "month": 6, "year": 2026, "limit_amount": "200.00"},
    )

    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["error"]["code"] == "CONFLICT"

    list_response = client.get("/api/v1/budgets?year=2026&month=6", headers=auth_headers(token))

    assert list_response.status_code == 200
    assert list_response.json()["meta"]["total"] == 1
    assert list_response.json()["data"][0]["id"] == budget_id

    update_response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers(token),
        json={"limit_amount": "200.00"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["data"]["remaining_amount"] == "40.00"
    assert update_response.json()["data"]["usage_percent"] == "80.00"
    assert update_response.json()["data"]["is_over_limit"] is False

    delete_response = client.delete(f"/api/v1/budgets/{budget_id}", headers=auth_headers(token))

    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["is_active"] is False

    get_deleted_response = client.get(f"/api/v1/budgets/{budget_id}", headers=auth_headers(token))

    assert get_deleted_response.status_code == 404
    assert get_deleted_response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    recreate_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(token),
        json={"category_id": category_id, "month": 6, "year": 2026, "limit_amount": "250.00"},
    )

    assert recreate_response.status_code == 201

    cleanup_user(email)


def test_budget_requires_expense_category_and_user_ownership() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)

    income_category_id = create_category(owner_token, "income", "Salario")
    other_category_id = create_category(other_token, "expense", "Mercado outro usuario")

    income_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(owner_token),
        json={"category_id": income_category_id, "month": 6, "year": 2026, "limit_amount": "100.00"},
    )

    assert income_response.status_code == 400
    assert income_response.json()["error"]["code"] == "BUSINESS_RULE_VIOLATION"

    foreign_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(owner_token),
        json={"category_id": other_category_id, "month": 6, "year": 2026, "limit_amount": "100.00"},
    )

    assert foreign_response.status_code == 404
    assert foreign_response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    cleanup_user(owner_email)
    cleanup_user(other_email)


def test_budgets_are_isolated_by_user() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)
    category_id = create_category(owner_token, "expense", "Transporte")

    create_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(owner_token),
        json={"category_id": category_id, "month": 6, "year": 2026, "limit_amount": "300.00"},
    )
    budget_id = create_response.json()["data"]["id"]

    other_get_response = client.get(f"/api/v1/budgets/{budget_id}", headers=auth_headers(other_token))
    other_patch_response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers(other_token),
        json={"limit_amount": "1.00"},
    )
    other_delete_response = client.delete(f"/api/v1/budgets/{budget_id}", headers=auth_headers(other_token))
    other_list_response = client.get("/api/v1/budgets", headers=auth_headers(other_token))

    assert other_get_response.status_code == 404
    assert other_patch_response.status_code == 404
    assert other_delete_response.status_code == 404
    assert other_list_response.status_code == 200
    assert other_list_response.json()["meta"]["total"] == 0

    cleanup_user(owner_email)
    cleanup_user(other_email)


def test_budgets_require_authentication_and_validate_payload() -> None:
    no_token_response = client.get("/api/v1/budgets")

    assert no_token_response.status_code == 401
    assert no_token_response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    email = unique_email()
    token = create_user_token(email)

    invalid_response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(token),
        json={"category_id": str(uuid4()), "month": 13, "year": 1999, "limit_amount": "-1.00"},
    )

    assert invalid_response.status_code == 422
    assert invalid_response.json()["error"]["code"] == "VALIDATION_ERROR"

    cleanup_user(email)


def test_budget_database_uniqueness_error_returns_conflict(monkeypatch) -> None:
    email = unique_email()
    token = create_user_token(email)
    category_id = create_category(token, "expense", "Moradia")

    def raise_integrity_error(*_args, **_kwargs):
        raise IntegrityError("insert budget", {}, Exception("duplicate active budget"))

    monkeypatch.setattr("app.services.budget_service.create_budget", raise_integrity_error)

    response = client.post(
        "/api/v1/budgets",
        headers=auth_headers(token),
        json={"category_id": category_id, "month": 6, "year": 2026, "limit_amount": "100.00"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"

    cleanup_user(email)
