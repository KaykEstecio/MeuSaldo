from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email
from app.services.ai_provider import AiProviderResult
from app.services.ai_assistant_service import resolve_analysis_period


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


def test_ai_assistant_uses_external_provider_when_available(monkeypatch) -> None:
    email = unique_email()
    token = create_user_token(email)
    monkeypatch.setattr(
        "app.services.ai_assistant_service.generate_external_answer",
        lambda prompt, financial_context, conversation_context: AiProviderResult(
            answer="Analise externa segura com proximo passo pratico.",
            fallback_reason=None,
            model="test-model",
            latency_ms=25,
            input_tokens=40,
            output_tokens=20,
        ),
    )

    response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(token),
        json={"message": "Analise meu mes"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["source"] == "external"
    assert data["fallback_reason"] is None
    assert len(data["suggestions"]) == 3
    assert data["assistant_message"]["source"] == "external"
    assert email not in data["answer"]
    cleanup_user(email)


def test_ai_assistant_sends_recent_conversation_context(monkeypatch) -> None:
    email = unique_email()
    token = create_user_token(email)
    captured_contexts: list[str] = []

    def fake_provider(prompt: str, financial_context: str, conversation_context: str) -> AiProviderResult:
        captured_contexts.append(conversation_context)
        return AiProviderResult("Resposta externa", None, "test-model", 10, 10, 5)

    monkeypatch.setattr("app.services.ai_assistant_service.generate_external_answer", fake_provider)
    first_response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(token),
        json={"message": "Minha primeira pergunta"},
    )
    second_response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(token),
        json={"message": "Continue a analise"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert captured_contexts[0] == ""
    assert "Minha primeira pergunta" in captured_contexts[1]
    assert "Resposta externa" in captured_contexts[1]
    cleanup_user(email)


def test_ai_assistant_records_feedback_only_for_owned_assistant_message() -> None:
    owner_email = unique_email()
    other_email = unique_email()
    owner_token = create_user_token(owner_email)
    other_token = create_user_token(other_email)

    create_response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(owner_token),
        json={"message": "Analise meus gastos"},
    )
    assistant_message_id = create_response.json()["data"]["assistant_message"]["id"]
    user_message_id = create_response.json()["data"]["user_message"]["id"]

    feedback_response = client.patch(
        f"/api/v1/ai-assistant/messages/{assistant_message_id}/feedback",
        headers=auth_headers(owner_token),
        json={"feedback": "helpful"},
    )
    assert feedback_response.status_code == 200
    assert feedback_response.json()["data"]["feedback"] == "helpful"

    user_feedback_response = client.patch(
        f"/api/v1/ai-assistant/messages/{user_message_id}/feedback",
        headers=auth_headers(owner_token),
        json={"feedback": "helpful"},
    )
    assert user_feedback_response.status_code == 404

    other_feedback_response = client.patch(
        f"/api/v1/ai-assistant/messages/{assistant_message_id}/feedback",
        headers=auth_headers(other_token),
        json={"feedback": "not_helpful"},
    )
    assert other_feedback_response.status_code == 404
    cleanup_user(owner_email)
    cleanup_user(other_email)


def test_ai_assistant_interprets_named_period_and_returns_traceable_insights() -> None:
    email = unique_email()
    token = create_user_token(email)
    seed_financial_context(token)

    response = client.post(
        "/api/v1/ai-assistant/messages",
        headers=auth_headers(token),
        json={"message": "Resuma julho de 2026 e destaque as despesas"},
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["analysis_period"] == {
        "label": "julho de 2026",
        "start_date": "2026-07-01",
        "end_date": "2026-07-31",
    }
    insights = {insight["key"]: insight for insight in data["insights"]}
    assert insights["expense"]["value"] == "R$ 120,00"
    assert insights["expense"]["href"].startswith("/transactions?type=expense")
    assert insights["top_category"]["value"] == "Mercado IA"
    assert "julho de 2026" in data["answer"]
    cleanup_user(email)


def test_period_parser_does_not_treat_maior_as_maio() -> None:
    period = resolve_analysis_period(
        "Resuma meu mes e destaque o maior gasto.",
        today=date(2026, 7, 22),
    )

    assert period.start_date == date(2026, 7, 1)
    assert period.end_date == date(2026, 7, 31)
