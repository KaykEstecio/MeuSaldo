from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_message import AiMessage
from app.models.user import User
from app.repositories.ai_message_repository import create_ai_message_pair, count_user_ai_messages, list_user_ai_messages
from app.schemas.ai_assistant import AiAssistantReply, AiMessageCreate, AiMessageRead
from app.services.budget_service import list_user_budgets
from app.services.dashboard_service import get_dashboard_summary


DISCLAIMER = "Resposta gerada por regras do MeuSaldo; use como apoio, nao como recomendacao financeira profissional."


def money_text(value: Decimal) -> str:
    return f"R$ {value:.2f}".replace(".", ",")


def build_rules_answer(db: Session, current_user: User, prompt: str) -> str:
    summary = get_dashboard_summary(db, current_user)
    budgets, _total = list_user_budgets(
        db,
        current_user,
        page=1,
        page_size=100,
        month=summary.period.month,
        year=summary.period.year,
    )
    prompt_lower = prompt.lower()

    lines = [
        f"No periodo atual ({summary.period.month:02d}/{summary.period.year}), seu saldo total ativo e {money_text(summary.total_balance)}.",
        f"Receitas do mes: {money_text(summary.monthly_income)}. Despesas do mes: {money_text(summary.monthly_expense)}. Resultado: {money_text(summary.monthly_net)}.",
    ]

    if summary.active_accounts == 0:
        lines.append("Comece cadastrando uma conta para que o assistente consiga analisar seus saldos.")
    elif summary.transactions_count == 0:
        lines.append("Ainda nao ha transacoes no periodo; registre receitas e despesas para receber analises mais uteis.")

    if summary.monthly_expense > summary.monthly_income and summary.monthly_income > Decimal("0.00"):
        lines.append("Suas despesas do mes estao acima das receitas; revise gastos recorrentes e priorize categorias essenciais.")
    elif summary.monthly_net > Decimal("0.00"):
        lines.append("O mes esta positivo ate agora; considere manter uma reserva antes de aumentar gastos variaveis.")

    if summary.expense_by_category:
        top_category = summary.expense_by_category[0]
        lines.append(
            f"A maior categoria de despesa no periodo e {top_category.category_name}, com {money_text(top_category.amount)}."
        )

    over_limit_budgets = [budget for budget in budgets if budget.is_over_limit]
    if "orcamento" in prompt_lower or "limite" in prompt_lower or "gasto" in prompt_lower:
        if not budgets:
            lines.append("Voce ainda nao tem orcamentos ativos neste periodo; crie limites por categoria de despesa.")
        elif over_limit_budgets:
            names = ", ".join(budget.category_name for budget in over_limit_budgets[:3])
            lines.append(f"Ha orcamentos acima do limite: {names}. Priorize revisar essas categorias.")
        else:
            lines.append("Os orcamentos ativos do periodo estao dentro do limite neste momento.")

    if "econom" in prompt_lower or "poupar" in prompt_lower:
        lines.append("Uma acao simples e definir um teto semanal para a maior categoria de despesa e acompanhar no dashboard.")

    lines.append("Eu nao executo alteracoes na sua conta; posso apenas analisar os dados agregados e sugerir proximos passos.")
    return " ".join(lines)


def create_ai_assistant_reply(db: Session, current_user: User, payload: AiMessageCreate) -> AiAssistantReply:
    prompt = payload.message.strip()
    source = "rules"
    answer = build_rules_answer(db, current_user, prompt)
    if settings.ai_provider != "rules":
        source = "rules"

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
        ),
    )

    return AiAssistantReply(
        answer=answer,
        source=source,
        disclaimer=DISCLAIMER,
        user_message=AiMessageRead.model_validate(user_message),
        assistant_message=AiMessageRead.model_validate(assistant_message),
    )


def list_ai_messages(db: Session, current_user: User, page: int, page_size: int) -> tuple[list[AiMessage], int]:
    return list_user_ai_messages(db, current_user.id, page, page_size), count_user_ai_messages(db, current_user.id)
