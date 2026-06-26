from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.models.transaction import Transaction
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def unique_email() -> str:
    return f"meusaldo.transactions.{uuid4().hex[:8]}@gmail.com"


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
        json={"name": "Usuario Transacao", "email": email, "password": "SenhaForte123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )
    return login_response.json()["data"]["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_account(token: str, initial_balance: str = "100.00") -> str:
    response = client.post(
        "/api/v1/accounts",
        headers=auth_headers(token),
        json={"name": "Conta Teste", "type": "checking", "initial_balance": initial_balance},
    )
    return response.json()["data"]["id"]


def create_category(token: str, category_type: str) -> str:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers(token),
        json={"name": f"Categoria {category_type}", "type": category_type},
    )
    return response.json()["data"]["id"]


def get_account_balance(token: str, account_id: str) -> str:
    response = client.get(f"/api/v1/accounts/{account_id}", headers=auth_headers(token))
    return response.json()["data"]["current_balance"]


def test_transaction_create_update_delete_recalculates_account_balance() -> None:
    email = unique_email()
    token = create_user_token(email)
    account_id = create_account(token, "100.00")
    income_category_id = create_category(token, "income")
    expense_category_id = create_category(token, "expense")

    income_response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(token),
        json={
            "account_id": account_id,
            "category_id": income_category_id,
            "type": "income",
            "amount": "50.00",
            "description": "Salario",
            "transaction_date": "2026-06-26",
        },
    )

    assert income_response.status_code == 201
    income_id = income_response.json()["data"]["id"]
    assert get_account_balance(token, account_id) == "150.00"

    expense_response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(token),
        json={
            "account_id": account_id,
            "category_id": expense_category_id,
            "type": "expense",
            "amount": "20.00",
            "description": "Mercado",
            "transaction_date": "2026-06-26",
        },
    )

    assert expense_response.status_code == 201
    assert get_account_balance(token, account_id) == "130.00"

    update_response = client.patch(
        f"/api/v1/transactions/{income_id}",
        headers=auth_headers(token),
        json={"amount": "70.00"},
    )

    assert update_response.status_code == 200
    assert get_account_balance(token, account_id) == "150.00"

    delete_response = client.delete(f"/api/v1/transactions/{income_id}", headers=auth_headers(token))

    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["is_active"] is False
    assert delete_response.json()["data"]["deleted_at"] is not None
    assert get_account_balance(token, account_id) == "80.00"

    get_deleted_response = client.get(f"/api/v1/transactions/{income_id}", headers=auth_headers(token))

    assert get_deleted_response.status_code == 404
    assert get_deleted_response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    list_response = client.get("/api/v1/transactions", headers=auth_headers(token))

    assert list_response.status_code == 200
    assert list_response.json()["meta"]["total"] == 1

    db = SessionLocal()
    try:
        deleted_transaction = db.get(Transaction, UUID(income_id))
        assert deleted_transaction is not None
        assert deleted_transaction.is_active is False
        assert deleted_transaction.deleted_at is not None
    finally:
        db.close()

    cleanup_user(email)


def test_transactions_are_isolated_by_user() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)

    owner_account_id = create_account(owner_token)
    owner_category_id = create_category(owner_token, "income")

    transaction_response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(owner_token),
        json={
            "account_id": owner_account_id,
            "category_id": owner_category_id,
            "type": "income",
            "amount": "10.00",
            "description": "Receita",
            "transaction_date": "2026-06-26",
        },
    )
    transaction_id = transaction_response.json()["data"]["id"]

    other_get_response = client.get(f"/api/v1/transactions/{transaction_id}", headers=auth_headers(other_token))
    other_patch_response = client.patch(
        f"/api/v1/transactions/{transaction_id}",
        headers=auth_headers(other_token),
        json={"amount": "99.00"},
    )
    other_delete_response = client.delete(f"/api/v1/transactions/{transaction_id}", headers=auth_headers(other_token))
    other_list_response = client.get("/api/v1/transactions", headers=auth_headers(other_token))

    assert other_get_response.status_code == 404
    assert other_patch_response.status_code == 404
    assert other_delete_response.status_code == 404
    assert other_list_response.status_code == 200
    assert other_list_response.json()["meta"]["total"] == 0

    cleanup_user(owner_email)
    cleanup_user(other_email)


def test_transaction_rejects_foreign_account_and_category_type_mismatch() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)

    owner_category_id = create_category(owner_token, "expense")
    other_account_id = create_account(other_token)

    foreign_account_response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(owner_token),
        json={
            "account_id": other_account_id,
            "category_id": owner_category_id,
            "type": "expense",
            "amount": "10.00",
            "description": "Despesa",
            "transaction_date": "2026-06-26",
        },
    )

    assert foreign_account_response.status_code == 404
    assert foreign_account_response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    owner_account_id = create_account(owner_token)
    mismatch_response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(owner_token),
        json={
            "account_id": owner_account_id,
            "category_id": owner_category_id,
            "type": "income",
            "amount": "10.00",
            "description": "Receita invalida",
            "transaction_date": "2026-06-26",
        },
    )

    assert mismatch_response.status_code == 400
    assert mismatch_response.json()["error"]["code"] == "BUSINESS_RULE_VIOLATION"

    cleanup_user(owner_email)
    cleanup_user(other_email)


def test_transactions_require_authentication_and_validate_payload() -> None:
    no_token_response = client.get("/api/v1/transactions")

    assert no_token_response.status_code == 401
    assert no_token_response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    email = unique_email()
    token = create_user_token(email)

    invalid_response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(token),
        json={
            "account_id": str(uuid4()),
            "category_id": str(uuid4()),
            "type": "expense",
            "amount": "-1.00",
            "description": "",
            "transaction_date": "2026-06-26",
        },
    )

    assert invalid_response.status_code == 422
    assert invalid_response.json()["error"]["code"] == "VALIDATION_ERROR"

    cleanup_user(email)
