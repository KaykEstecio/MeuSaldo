from __future__ import annotations

import re
import unicodedata
import uuid
from calendar import monthrange
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError
from app.models.ai_message import AiMessage
from app.models.user import User
from app.repositories.ai_message_repository import (
    count_user_ai_messages,
    create_ai_message_pair,
    get_monthly_external_token_usage,
    get_user_ai_message,
    list_recent_user_ai_messages,
    list_user_ai_messages,
    update_ai_message_feedback,
)
from app.repositories.dashboard_repository import (
    count_active_accounts,
    get_monthly_transaction_totals,
    get_total_balance,
    list_expenses_by_category,
)
from app.schemas.ai_assistant import (
    AiAnalysisPeriod,
    AiAssistantReply,
    AiInsight,
    AiMessageCreate,
    AiMessageRead,
)
from app.schemas.budget import BudgetRead
from app.services.ai_provider import AiProviderResult, generate_external_answer
from app.services.budget_service import list_user_budgets


RULES_DISCLAIMER = "Resposta gerada por regras do MeuSaldo; use como apoio, nao como recomendacao financeira profissional."
EXTERNAL_DISCLAIMER = "Resposta gerada por IA a partir de dados agregados; use como apoio, nao como recomendacao financeira profissional."
FALLBACK_DISCLAIMER = "A IA externa esta temporariamente indisponivel. Esta resposta segura foi gerada pelas regras do MeuSaldo."

MONTH_NAMES = {
    "janeiro": 1,
    "fevereiro": 2,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}


@dataclass(frozen=True)
class FinancialAnalysis:
    period: AiAnalysisPeriod
    total_balance: Decimal
    income: Decimal
    expense: Decimal
    net: Decimal
    active_accounts: int
    transactions_count: int
    expense_by_category: list[tuple[uuid.UUID | None, str, Decimal]]
    budgets: list[BudgetRead]


def money_text(value: Decimal) -> str:
    return f"R$ {value:.2f}".replace(".", ",")


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    return "".join(character for character in normalized if not unicodedata.combining(character))


def _month_period(year: int, month: int, label: str) -> AiAnalysisPeriod:
    return AiAnalysisPeriod(
        label=label,
        start_date=date(year, month, 1),
        end_date=date(year, month, monthrange(year, month)[1]),
    )


def resolve_analysis_period(prompt: str, today: date | None = None) -> AiAnalysisPeriod:
    current_date = today or datetime.now(UTC).date()
    normalized_prompt = _normalize_text(prompt)

    if "semana" in normalized_prompt or "ultimos 7 dias" in normalized_prompt:
        start_date = current_date - timedelta(days=6)
        return AiAnalysisPeriod(
            label=f"ultimos 7 dias ({start_date:%d/%m} a {current_date:%d/%m/%Y})",
            start_date=start_date,
            end_date=current_date,
        )

    if "mes passado" in normalized_prompt or "ultimo mes" in normalized_prompt:
        previous_month_end = current_date.replace(day=1) - timedelta(days=1)
        return _month_period(
            previous_month_end.year,
            previous_month_end.month,
            f"mes passado ({previous_month_end:%m/%Y})",
        )

    numeric_period = re.search(r"(?<!\d)(0?[1-9]|1[0-2])/(20\d{2})(?!\d)", normalized_prompt)
    if numeric_period:
        month = int(numeric_period.group(1))
        year = int(numeric_period.group(2))
        return _month_period(year, month, f"{month:02d}/{year}")

    explicit_year = re.search(r"\b(20\d{2})\b", normalized_prompt)
    for month_name, month in MONTH_NAMES.items():
        if re.search(rf"\b{re.escape(month_name)}\b", normalized_prompt):
            year = int(explicit_year.group(1)) if explicit_year else current_date.year
            return _month_period(year, month, f"{month_name} de {year}")

    return _month_period(
        current_date.year,
        current_date.month,
        f"mes atual ({current_date:%m/%Y})",
    )


def build_financial_analysis(
    db: Session,
    current_user: User,
    period: AiAnalysisPeriod,
) -> FinancialAnalysis:
    income, expense, transactions_count = get_monthly_transaction_totals(
        db,
        current_user.id,
        period.start_date,
        period.end_date,
    )
    categories = list_expenses_by_category(
        db,
        current_user.id,
        period.start_date,
        period.end_date,
    )
    budgets, _total = list_user_budgets(
        db,
        current_user,
        page=1,
        page_size=100,
        month=period.end_date.month,
        year=period.end_date.year,
    )
    return FinancialAnalysis(
        period=period,
        total_balance=get_total_balance(db, current_user.id),
        income=income,
        expense=expense,
        net=income - expense,
        active_accounts=count_active_accounts(db, current_user.id),
        transactions_count=transactions_count,
        expense_by_category=categories,
        budgets=budgets,
    )


def build_rules_answer(analysis: FinancialAnalysis, prompt: str) -> str:
    prompt_lower = _normalize_text(prompt)
    lines = [
        f"No periodo analisado, {analysis.period.label}, seu saldo total ativo e {money_text(analysis.total_balance)}.",
        f"Receitas: {money_text(analysis.income)}. Despesas: {money_text(analysis.expense)}. Resultado: {money_text(analysis.net)}.",
    ]

    if analysis.active_accounts == 0:
        lines.append("Comece cadastrando uma conta para que o assistente consiga analisar seus saldos.")
    elif analysis.transactions_count == 0:
        lines.append("Ainda nao ha transacoes nesse periodo; registre receitas e despesas para receber analises mais uteis.")

    if analysis.expense > analysis.income and analysis.income > Decimal("0.00"):
        lines.append("Suas despesas estao acima das receitas; revise gastos recorrentes e priorize categorias essenciais.")
    elif analysis.net > Decimal("0.00"):
        lines.append("O periodo esta positivo; considere manter uma reserva antes de aumentar gastos variaveis.")

    if analysis.expense_by_category:
        _category_id, category_name, amount = analysis.expense_by_category[0]
        lines.append(f"A maior categoria de despesa e {category_name}, com {money_text(amount)}.")

    over_limit_budgets = [budget for budget in analysis.budgets if budget.is_over_limit]
    if "orcamento" in prompt_lower or "limite" in prompt_lower or "gasto" in prompt_lower:
        if not analysis.budgets:
            lines.append("Voce ainda nao tem orcamentos ativos nesse mes; crie limites por categoria de despesa.")
        elif over_limit_budgets:
            names = ", ".join(budget.category_name for budget in over_limit_budgets[:3])
            lines.append(f"Ha orcamentos acima do limite: {names}. Priorize revisar essas categorias.")
        else:
            lines.append("Os orcamentos ativos do mes estao dentro do limite neste momento.")

    if "econom" in prompt_lower or "poupar" in prompt_lower:
        lines.append("Uma acao simples e definir um teto semanal para a maior categoria de despesa e acompanhar no dashboard.")

    lines.append("Eu nao executo alteracoes na sua conta; posso apenas analisar os dados agregados e sugerir proximos passos.")
    return " ".join(lines)


def build_aggregated_context(analysis: FinancialAnalysis) -> str:
    categories = ", ".join(
        f"{name}: {money_text(amount)}" for _category_id, name, amount in analysis.expense_by_category[:5]
    ) or "nenhuma despesa categorizada"
    budget_status = ", ".join(
        f"{item.category_name}: gasto {money_text(item.spent_amount)} de {money_text(item.limit_amount)}"
        for item in analysis.budgets[:10]
    ) or "nenhum orcamento ativo"
    return "\n".join(
        [
            f"Periodo analisado: {analysis.period.label}",
            f"Inicio: {analysis.period.start_date.isoformat()}",
            f"Fim: {analysis.period.end_date.isoformat()}",
            f"Saldo total atual: {money_text(analysis.total_balance)}",
            f"Receitas no periodo: {money_text(analysis.income)}",
            f"Despesas no periodo: {money_text(analysis.expense)}",
            f"Resultado no periodo: {money_text(analysis.net)}",
            f"Contas ativas: {analysis.active_accounts}",
            f"Transacoes no periodo: {analysis.transactions_count}",
            f"Principais despesas por categoria: {categories}",
            f"Orcamentos do mes de referencia: {budget_status}",
        ]
    )


def build_insights(analysis: FinancialAnalysis) -> list[AiInsight]:
    period_query = f"start={analysis.period.start_date.isoformat()}&end={analysis.period.end_date.isoformat()}"
    insights = [
        AiInsight(
            key="balance",
            label="Saldo atual",
            value=money_text(analysis.total_balance),
            description=f"Somado em {analysis.active_accounts} conta(s) ativa(s).",
            tone="neutral",
            href="/accounts",
        ),
        AiInsight(
            key="income",
            label="Receitas",
            value=money_text(analysis.income),
            description=analysis.period.label,
            tone="positive",
            href=f"/transactions?type=income&{period_query}",
        ),
        AiInsight(
            key="expense",
            label="Despesas",
            value=money_text(analysis.expense),
            description=analysis.period.label,
            tone="warning" if analysis.expense > Decimal("0.00") else "neutral",
            href=f"/transactions?type=expense&{period_query}",
        ),
        AiInsight(
            key="net",
            label="Resultado",
            value=money_text(analysis.net),
            description="Receitas menos despesas no periodo.",
            tone="positive" if analysis.net > 0 else "negative" if analysis.net < 0 else "neutral",
            href="/dashboard",
        ),
    ]
    if analysis.expense_by_category:
        _category_id, category_name, amount = analysis.expense_by_category[0]
        insights.append(
            AiInsight(
                key="top_category",
                label="Maior categoria",
                value=category_name,
                description=f"{money_text(amount)} em despesas no periodo.",
                tone="warning",
                href=f"/transactions?type=expense&{period_query}",
            )
        )
    return insights


def build_conversation_context(db: Session, current_user: User) -> str:
    messages = list_recent_user_ai_messages(db, current_user.id, settings.ai_context_messages)
    return "\n".join(
        f"{'Usuario' if message.role == 'user' else 'Assistente'}: {message.content[:1500]}"
        for message in messages
    )


def build_follow_up_suggestions(prompt: str) -> list[str]:
    suggestions = [
        "Resuma minha semana.",
        "Resuma meu mes e destaque o maior gasto.",
        "Como posso melhorar meu resultado neste mes?",
    ]
    normalized_prompt = _normalize_text(prompt)
    if "orcamento" in normalized_prompt or "limite" in normalized_prompt:
        suggestions[2] = "Quais limites estao mais proximos de estourar?"
    return suggestions


def _provider_result_with_budget(
    db: Session,
    prompt: str,
    financial_context: str,
    conversation_context: str,
) -> AiProviderResult:
    budget = settings.ai_monthly_token_budget
    now = datetime.now(UTC)
    if budget > 0 and get_monthly_external_token_usage(db, now.year, now.month) >= budget:
        return AiProviderResult(None, "token_budget", settings.ai_model or None, 0)
    return generate_external_answer(prompt, financial_context, conversation_context)


def create_ai_assistant_reply(db: Session, current_user: User, payload: AiMessageCreate) -> AiAssistantReply:
    prompt = payload.message.strip()
    period = resolve_analysis_period(prompt)
    analysis = build_financial_analysis(db, current_user, period)
    provider_result = _provider_result_with_budget(
        db,
        prompt,
        build_aggregated_context(analysis),
        build_conversation_context(db, current_user),
    )
    source = "rules"
    answer = provider_result.answer
    if provider_result.answer:
        source = "external"
        disclaimer = EXTERNAL_DISCLAIMER
    else:
        answer = build_rules_answer(analysis, prompt)
        disclaimer = RULES_DISCLAIMER if provider_result.fallback_reason == "provider_disabled" else FALLBACK_DISCLAIMER

    user_message, assistant_message = create_ai_message_pair(
        db,
        user_message=AiMessage(
            user_id=current_user.id,
            role="user",
            content=prompt,
            source="user",
        ),
        assistant_message=AiMessage(
            user_id=current_user.id,
            role="assistant",
            content=answer,
            source=source,
            provider_model=provider_result.model,
            provider_latency_ms=provider_result.latency_ms,
            provider_input_tokens=provider_result.input_tokens,
            provider_output_tokens=provider_result.output_tokens,
            fallback_reason=provider_result.fallback_reason,
        ),
    )

    return AiAssistantReply(
        answer=answer,
        source=source,
        disclaimer=disclaimer,
        fallback_reason=provider_result.fallback_reason,
        suggestions=build_follow_up_suggestions(prompt),
        analysis_period=period,
        insights=build_insights(analysis),
        user_message=AiMessageRead.model_validate(user_message),
        assistant_message=AiMessageRead.model_validate(assistant_message),
    )


def list_ai_messages(db: Session, current_user: User, page: int, page_size: int) -> tuple[list[AiMessage], int]:
    return list_user_ai_messages(db, current_user.id, page, page_size), count_user_ai_messages(db, current_user.id)


def set_ai_message_feedback(
    db: Session,
    current_user: User,
    message_id: uuid.UUID,
    feedback: str,
) -> AiMessage:
    message = get_user_ai_message(db, current_user.id, message_id)
    if message is None or message.role != "assistant":
        raise AppError(
            status_code=404,
            code="AI_MESSAGE_NOT_FOUND",
            message="Resposta do assistente nao encontrada",
        )
    return update_ai_message_feedback(db, message, feedback)
