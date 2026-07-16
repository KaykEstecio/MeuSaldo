from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from alembic.config import Config
from alembic.script import ScriptDirectory
from pathlib import Path

from app.database.connection import get_db
from app.schemas.health import HealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        success=True,
        message="API MeuSaldo online",
        data={"status": "healthy"},
    )


@router.get("/health/db", response_model=HealthResponse)
def database_health_check(db: Session = Depends(get_db)) -> HealthResponse | JSONResponse:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Banco de dados indisponível",
                    "details": {},
                }
            },
        )

    return HealthResponse(
        success=True,
        message="Conexão com banco de dados ativa",
        data={"database": "connected"},
    )


@router.get("/health/ready", response_model=HealthResponse)
def readiness_check(db: Session = Depends(get_db)) -> HealthResponse | JSONResponse:
    try:
        current_revision = db.scalar(text("SELECT version_num FROM alembic_version"))
        backend_dir = Path(__file__).resolve().parents[2]
        alembic_config = Config(str(backend_dir / "alembic.ini"))
        expected_heads = set(ScriptDirectory.from_config(alembic_config).get_heads())
    except (SQLAlchemyError, OSError):
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "SERVICE_NOT_READY", "message": "Servico indisponivel", "details": {}}},
        )

    if current_revision not in expected_heads:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "MIGRATION_PENDING",
                    "message": "Banco de dados com migration pendente",
                    "details": {},
                }
            },
        )
    return HealthResponse(
        success=True,
        message="API pronta para receber trafego",
        data={"status": "ready"},
    )
