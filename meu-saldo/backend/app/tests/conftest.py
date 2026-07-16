import os
from pathlib import Path
from urllib.parse import urlparse

import pytest
from dotenv import dotenv_values


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
PRODUCTION_MARKERS = ("neon.tech", "render.com", "onrender.com")


def _read_database_url() -> str:
    env_values = dotenv_values(ENV_FILE) if ENV_FILE.exists() else {}
    test_database_url = os.getenv("TEST_DATABASE_URL") or str(env_values.get("TEST_DATABASE_URL") or "")
    database_url = test_database_url or os.getenv("DATABASE_URL") or str(env_values.get("DATABASE_URL") or "")

    if test_database_url:
        os.environ["DATABASE_URL"] = test_database_url

    return database_url


def _read_app_env() -> str:
    env_values = dotenv_values(ENV_FILE) if ENV_FILE.exists() else {}
    return (os.getenv("APP_ENV") or str(env_values.get("APP_ENV") or "development")).lower()


def pytest_configure() -> None:
    os.environ["AI_PROVIDER"] = "rules"
    os.environ["OPENAI_API_KEY"] = ""
    database_url = _read_database_url()
    app_env = _read_app_env()
    allow_non_local = os.getenv("MEUSALDO_ALLOW_NON_LOCAL_TEST_DB") == "true"

    if not database_url:
        pytest.exit("DATABASE_URL nao configurada. Configure um banco local antes de rodar os testes.", returncode=2)

    parsed_url = urlparse(database_url)
    hostname = parsed_url.hostname or ""
    normalized_url = database_url.lower()

    if app_env == "production":
        pytest.exit("Testes bloqueados: APP_ENV=production nao pode ser usado com pytest.", returncode=2)

    if any(marker in normalized_url for marker in PRODUCTION_MARKERS):
        pytest.exit("Testes bloqueados: DATABASE_URL parece apontar para ambiente de producao/remoto.", returncode=2)

    if "sslmode=require" in normalized_url:
        pytest.exit("Testes bloqueados: DATABASE_URL com sslmode=require parece ambiente remoto/producao.", returncode=2)

    if hostname not in LOCAL_HOSTS and not allow_non_local:
        pytest.exit(
            "Testes bloqueados: use um PostgreSQL local ou defina MEUSALDO_ALLOW_NON_LOCAL_TEST_DB=true "
            "apenas para um banco de teste descartavel.",
            returncode=2,
        )


@pytest.fixture(autouse=True)
def reset_rate_limiters() -> None:
    from app.api.deps import ai_rate_limiter, auth_rate_limiter

    auth_rate_limiter.reset()
    ai_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()
    ai_rate_limiter.reset()
