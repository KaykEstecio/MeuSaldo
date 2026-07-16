import logging

from openai import OpenAI

from app.core.config import settings


logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTIONS = """Voce e o assistente financeiro educacional do MeuSaldo.
Responda em portugues do Brasil, de forma objetiva, usando somente os dados agregados fornecidos.
Nao solicite nem infira dados pessoais, nao recomende investimentos especificos e nao execute acoes financeiras.
Deixe claro quando faltarem dados e encerre com um proximo passo pratico e prudente.
Nunca trate a resposta como aconselhamento financeiro profissional."""


def generate_external_answer(prompt: str, financial_context: str) -> str | None:
    if settings.ai_provider.lower() != "openai" or not settings.effective_ai_api_key or not settings.ai_model:
        return None

    try:
        client = OpenAI(api_key=settings.effective_ai_api_key, timeout=settings.ai_timeout_seconds)
        response = client.responses.create(
            model=settings.ai_model,
            instructions=SYSTEM_INSTRUCTIONS,
            input=f"Dados financeiros agregados:\n{financial_context}\n\nPergunta do usuario:\n{prompt}",
            max_output_tokens=500,
        )
        answer = response.output_text.strip()
        return answer or None
    except Exception as exc:
        logger.warning("external_ai_fallback", extra={"error_type": type(exc).__name__})
        return None
