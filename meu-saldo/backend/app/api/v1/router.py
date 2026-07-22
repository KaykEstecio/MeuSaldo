from fastapi import APIRouter

from app.api.v1 import (
    accounts,
    admin,
    ai_assistant,
    auth,
    budgets,
    categories,
    dashboard,
    transaction_imports,
    transactions,
    users,
)


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(users.router)
api_router.include_router(accounts.router)
api_router.include_router(categories.router)
api_router.include_router(transactions.router)
api_router.include_router(transaction_imports.router)
api_router.include_router(dashboard.router)
api_router.include_router(budgets.router)
api_router.include_router(ai_assistant.router)
