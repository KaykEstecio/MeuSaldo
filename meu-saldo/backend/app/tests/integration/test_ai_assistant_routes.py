from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def unique_email() -> str:
    return f"meusaldo.ai.{uuid4().hex[:8]}@gmail.com"


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
        json={"name": "Usuario IA", "email": email, "password": "SenhaForte123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SenhaForte123"},
    )
    return login_response.json()["data"]["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def seed_financial_context(token: str) -> None:
    account_response = client.post(
        "/api/v1/accounts",
        headers=auth_headers(token),
        json={"name": "Conta IA", "type": "checking", "initial_balance": "1000.00"},
    )
    account_id = account_response.json()["data"]["id"]

    category_response = client.post(
        "/api/v1/categories",
        headers=auth_headers(token),
        json={"name": "Mercado IA", "type": "expense"},
    )
    category_id = category_response.json()["data"]["id"]

    client.post(
        "/api/v1/transactions",
        headers=auth_headers(token),
        json={
            "account_id": account_id,
            "category_id": category_id,
            "type": "expense",
            "amount": "120.00",
            "description": "Compra agregada",
            "transaction_date": "2026-07-03",
        },
    )
    client.post(
        "/api/v1/budgets",
        headers=auth_headers(token),
        json={"category_id": category_id, "month": 7, "year": 2026, "limit_amount": "100.00"},
    )


def test_ai_assistant_generates_rules_reply_and_stores_messages() -> None:
    email = unique_email()
    token = create_user_token(email)
    seed_financial_context(token)

    response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(token),
        json={"message": "Como posso economizar e revisar meus orcamentos?"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == "Resposta do assistente gerada com sucesso"
    data = payload["data"]
    assert data["source"] == "rules"
    assert data["assistant_message"]["role"] == "assistant"
    assert data["assistant_message"]["source"] == "rules"
    assert "nao executo alteracoes" in data["answer"]
    assert email not in data["answer"]

    list_response = client.get("/api/v1/ai-assistant/messages", headers=auth_headers(token))
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["meta"]["total"] == 2
    assert {message["role"] for message in list_payload["data"]} == {"user", "assistant"}


def test_ai_assistant_requires_authentication_and_isolates_history() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)

    unauthenticated_response = client.post(
        "/api/v1/ai-assistant/messages",
        json={"message": "Analise meus gastos"},
    )
    assert unauthenticated_response.status_code == 401
    assert unauthenticated_response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    create_response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(owner_token),
        json={"message": "Analise meus gastos"},
    )
    assert create_response.status_code == 201

    other_list_response = client.get("/api/v1/ai-assistant/messages", headers=auth_headers(other_token))
    assert other_list_response.status_code == 200
    assert other_list_response.json()["data"] == []
    assert other_list_response.json()["meta"]["total"] == 0
