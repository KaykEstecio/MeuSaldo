from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass

from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    OpenAI,
    PermissionDeniedError,
    RateLimitError,
)

from app.core.config import settings


logger = logging.getLogger("meusaldo.ai")

SYSTEM_INSTRUCTIONS = """Voce e o assistente financeiro educacional do MeuSaldo.
Responda em portugues do Brasil, de forma objetiva, usando somente os dados agregados fornecidos.
Nao solicite nem infira dados pessoais, nao recomende investimentos especificos e nao execute acoes financeiras.
Deixe claro quando faltarem dados e encerre com um proximo passo pratico e prudente.
Nunca trate a resposta como aconselhamento financeiro profissional."""


@dataclass(frozen=True)
class AiProviderResult:
    answer: str | None
    fallback_reason: str | None
    model: str | None
    latency_ms: int
    input_tokens: int | None = None
    output_tokens: int | None = None


def _classify_failure(exc: Exception) -> tuple[str, str | None, int | None]:
    error_code = getattr(exc, "code", None)
    status_code = getattr(exc, "status_code", None)
    safe_code = str(error_code)[:80] if error_code else None

    if isinstance(exc, AuthenticationError):
        return "authentication", safe_code, status_code
    if isinstance(exc, PermissionDeniedError):
        return "permission", safe_code, status_code
    if isinstance(exc, RateLimitError):
        if safe_code == "insufficient_quota":
            return "quota", safe_code, status_code
        return "rate_limit", safe_code, status_code
    if isinstance(exc, (APITimeoutError, APIConnectionError)):
        return "connection", safe_code, status_code
    if isinstance(exc, NotFoundError):
        return "model_access", safe_code, status_code
    if isinstance(exc, BadRequestError):
        return "invalid_request", safe_code, status_code
    return "provider_error", safe_code, status_code


def _log_event(payload: dict[str, object]) -> None:
    logger.info(json.dumps(payload, separators=(",", ":"), ensure_ascii=True))


def generate_external_answer(
    prompt: str,
    financial_context: str,
    conversation_context: str = "",
) -> AiProviderResult:
    started_at = time.perf_counter()
    if settings.ai_provider.lower() != "openai":
        return AiProviderResult(None, "provider_disabled", None, 0)
    if not settings.effective_ai_api_key:
        return AiProviderResult(None, "missing_key", settings.ai_model or None, 0)
    if not settings.ai_model:
        return AiProviderResult(None, "missing_model", None, 0)

    try:
        client = OpenAI(api_key=settings.effective_ai_api_key, timeout=settings.ai_timeout_seconds)
        context_section = (
            f"\n\nContexto recente da conversa:\n{conversation_context}" if conversation_context else ""
        )
        response = client.responses.create(
            model=settings.ai_model,
            instructions=SYSTEM_INSTRUCTIONS,
            input=(
                f"Dados financeiros agregados:\n{financial_context}"
                f"{context_section}\n\nPergunta atual do usuario:\n{prompt}"
            ),
            max_output_tokens=500,
        )
        latency_ms = round((time.perf_counter() - started_at) * 1000)
        answer = response.output_text.strip()
        usage = getattr(response, "usage", None)
        input_tokens = getattr(usage, "input_tokens", None)
        output_tokens = getattr(usage, "output_tokens", None)
        _log_event(
            {
                "event": "ai_provider_request",
                "status": "success" if answer else "empty_response",
                "model": settings.ai_model,
                "latency_ms": latency_ms,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }
        )
        return AiProviderResult(
            answer or None,
            None if answer else "empty_response",
            settings.ai_model,
            latency_ms,
            input_tokens,
            output_tokens,
        )
    except Exception as exc:
        latency_ms = round((time.perf_counter() - started_at) * 1000)
        reason, error_code, status_code = _classify_failure(exc)
        _log_event(
            {
                "event": "ai_provider_request",
                "status": "fallback",
                "reason": reason,
                "error_type": type(exc).__name__,
                "error_code": error_code,
                "status_code": status_code,
                "model": settings.ai_model,
                "latency_ms": latency_ms,
            }
        )
        return AiProviderResult(None, reason, settings.ai_model, latency_ms)
