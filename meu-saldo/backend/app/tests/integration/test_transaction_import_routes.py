from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.connection import SessionLocal
from app.main import app
from app.repositories.user_repository import get_user_by_email


client = TestClient(app)


def create_import_user() -> tuple[str, str]:
    email = f"import.{uuid4().hex[:8]}@example.com"
    client.post("/api/v1/auth/register", json={"name": "Usuario Importacao", "email": email, "password": "SenhaForte123"})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123"})
    return email, login.json()["data"]["access_token"]


def cleanup_import_user(email: str) -> None:
    db = SessionLocal()
    try:
        user = get_user_by_email(db, email)
        if user:
            db.delete(user)
            db.commit()
    finally:
        db.close()


def test_csv_preview_confirmation_deduplication_and_audit() -> None:
    email, token = create_import_user()
    headers = {"Authorization": f"Bearer {token}"}
    account = client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"name": "Conta Importacao", "type": "checking", "initial_balance": "1000.00"},
    ).json()["data"]
    expense_category = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Mercado", "type": "expense"},
    ).json()["data"]
    income_category = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Salario", "type": "income"},
    ).json()["data"]
    content = (
        "data;descricao;valor\n"
        "01/07/2026;Mercado Central;-100,00\n"
        "01/07/2026;Mercado Central;-100,00\n"
        "05/07/2026;Salario Empresa;2000,00\n"
    )

    preview_response = client.post(
        "/api/v1/transaction-imports/preview",
        headers=headers,
        json={"account_id": account["id"], "filename": "extrato.csv", "content": content},
    )
    assert preview_response.status_code == 200
    preview = preview_response.json()["data"]
    assert preview["total_rows"] == 3
    assert preview["duplicate_count"] == 1
    assert preview["ready_count"] == 2
    assert preview["rows"][0]["suggested_category_id"] == expense_category["id"]
    assert preview["rows"][2]["suggested_category_id"] == income_category["id"]

    rows = [
        {
            "transaction_date": row["transaction_date"],
            "description": row["description"],
            "amount": row["amount"],
            "type": row["type"],
            "category_id": row["suggested_category_id"],
            "selected": True,
        }
        for row in preview["rows"]
    ]
    confirm_payload = {
        "account_id": account["id"],
        "filename": "extrato.csv",
        "file_format": "csv",
        "rows": rows,
    }
    confirm_response = client.post("/api/v1/transaction-imports/confirm", headers=headers, json=confirm_payload)
    assert confirm_response.status_code == 201
    result = confirm_response.json()["data"]
    assert result["imported_count"] == 2
    assert result["duplicate_count"] == 1

    second_confirm = client.post("/api/v1/transaction-imports/confirm", headers=headers, json=confirm_payload)
    assert second_confirm.status_code == 201
    assert second_confirm.json()["data"]["imported_count"] == 0
    assert second_confirm.json()["data"]["duplicate_count"] == 3

    account_response = client.get(f"/api/v1/accounts/{account['id']}", headers=headers)
    assert account_response.json()["data"]["current_balance"] == "2900.00"
    history_response = client.get("/api/v1/transaction-imports", headers=headers)
    assert history_response.status_code == 200
    assert history_response.json()["meta"]["total"] == 2
    cleanup_import_user(email)


def test_ofx_preview_reads_statement_transactions() -> None:
    email, token = create_import_user()
    headers = {"Authorization": f"Bearer {token}"}
    account = client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"name": "Conta OFX", "type": "checking", "initial_balance": "0"},
    ).json()["data"]
    content = "<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260710<TRNAMT>-45.90<NAME>Padaria</STMTTRN></BANKTRANLIST></OFX>"

    response = client.post(
        "/api/v1/transaction-imports/preview",
        headers=headers,
        json={"account_id": account["id"], "filename": "banco.ofx", "content": content},
    )

    assert response.status_code == 200
    row = response.json()["data"]["rows"][0]
    assert row["transaction_date"] == "2026-07-10"
    assert row["amount"] == "45.90"
    assert row["type"] == "expense"
    assert row["description"] == "Padaria"
    cleanup_import_user(email)
