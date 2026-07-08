from functools import lru_cache

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
    ai_provider: str = "rules"
    ai_api_key: str = ""
    ai_model: str = ""
    ai_timeout_seconds: int = 20
    rate_limit_auth_requests: int = 10
    rate_limit_auth_window_seconds: int = 60
    rate_limit_ai_requests: int = 20
    rate_limit_ai_window_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
