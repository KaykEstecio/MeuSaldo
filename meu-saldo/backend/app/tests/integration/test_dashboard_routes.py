from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def unique_email() -> str:
    return f"meusaldo.dashboard.{uuid4().hex[:8]}@gmail.com"


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
        json={"name": "Usuario Dashboard", "email": email, "password": "SenhaForte123"},
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
        json={"name": "Conta Dashboard", "type": "checking", "initial_balance": initial_balance},
    )
    return response.json()["data"]["id"]


def create_category(token: str, category_type: str, name: str) -> str:
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
    transaction_type: str,
    amount: str,
    description: str,
    transaction_date: str = "2026-06-26",
) -> str:
    response = client.post(
        "/api/v1/transactions",
        headers=auth_headers(token),
        json={
            "account_id": account_id,
            "category_id": category_id,
            "type": transaction_type,
            "amount": amount,
            "description": description,
            "transaction_date": transaction_date,
        },
    )
    return response.json()["data"]["id"]


def test_dashboard_summary_aggregates_authenticated_user_data() -> None:
    email = unique_email()
    other_email = unique_email()
    token = create_user_token(email)
    other_token = create_user_token(other_email)

    account_id = create_account(token, "100.00")
    other_account_id = create_account(other_token, "999.00")
    income_category_id = create_category(token, "income", "Salario")
    market_category_id = create_category(token, "expense", "Mercado")
    leisure_category_id = create_category(token, "expense", "Lazer")
    other_income_category_id = create_category(other_token, "income", "Receita externa")

    create_transaction(token, account_id, income_category_id, "income", "500.00", "Salario", "2026-06-05")
    create_transaction(token, account_id, market_category_id, "expense", "120.00", "Mercado", "2026-06-06")
    create_transaction(token, account_id, leisure_category_id, "expense", "30.00", "Cinema", "2026-06-06")
    deleted_transaction_id = create_transaction(
        token,
        account_id,
        leisure_category_id,
        "expense",
        "70.00",
        "Despesa removida",
        "2026-06-07",
    )
    create_transaction(
        other_token,
        other_account_id,
        other_income_category_id,
        "income",
        "1000.00",
        "Receita de outro usuario",
        "2026-06-05",
    )

    delete_response = client.delete(
        f"/api/v1/transactions/{deleted_transaction_id}",
        headers=auth_headers(token),
    )
    assert delete_response.status_code == 200

    response = client.get("/api/v1/dashboard/summary?year=2026&month=6", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    data = body["data"]
    assert body["message"] == "Resumo financeiro encontrado"
    assert data["period"]["year"] == 2026
    assert data["period"]["month"] == 6
    assert data["period"]["start_date"] == "2026-06-01"
    assert data["period"]["end_date"] == "2026-06-30"
    assert data["total_balance"] == "450.00"
    assert data["monthly_income"] == "500.00"
    assert data["monthly_expense"] == "150.00"
    assert data["monthly_net"] == "350.00"
    assert data["active_accounts"] == 1
    assert data["transactions_count"] == 3
    assert data["expense_by_category"] == [
        {"category_id": market_category_id, "category_name": "Mercado", "amount": "120.00"},
        {"category_id": leisure_category_id, "category_name": "Lazer", "amount": "30.00"},
    ]
    assert data["cashflow_by_day"] == [
        {"date": "2026-06-05", "income": "500.00", "expense": "0.00", "net": "500.00"},
        {"date": "2026-06-06", "income": "0.00", "expense": "150.00", "net": "-150.00"},
    ]

    cleanup_user(email)
    cleanup_user(other_email)


def test_dashboard_requires_authentication_and_validates_period() -> None:
    no_token_response = client.get("/api/v1/dashboard/summary")

    assert no_token_response.status_code == 401
    assert no_token_response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    email = unique_email()
    token = create_user_token(email)

    invalid_response = client.get("/api/v1/dashboard/summary?year=1999&month=13", headers=auth_headers(token))

    assert invalid_response.status_code == 422
    assert invalid_response.json()["error"]["code"] == "VALIDATION_ERROR"

    cleanup_user(email)
