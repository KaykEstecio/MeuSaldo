from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MeuSaldo"
    app_env: str = "development"
    app_debug: bool = True
    database_url: str
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    jwt_refresh_cookie_name: str = "meusaldo_refresh"
    jwt_cookie_secure: bool | None = None
    jwt_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    ai_provider: str = "rules"
    ai_api_key: str = ""
    openai_api_key: str = ""
    ai_model: str = ""
    ai_timeout_seconds: int = 20
    ai_context_messages: int = 6
    ai_monthly_token_budget: int = 0
    rate_limit_auth_requests: int = 10
    rate_limit_auth_window_seconds: int = 60
    rate_limit_ai_requests: int = 20
    rate_limit_ai_window_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def effective_ai_api_key(self) -> str:
        return self.openai_api_key or self.ai_api_key

    @property
    def refresh_cookie_secure(self) -> bool:
        if self.jwt_cookie_secure is not None:
            return self.jwt_cookie_secure
        return self.app_env.lower() == "production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
