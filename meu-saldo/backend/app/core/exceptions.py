from typing import Any

from fastapi import HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def error_response(status_code: int, code: str, message: str, details: dict[str, Any] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            }
        },
    )


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message, exc.details)


async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return error_response(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Recurso nao encontrado",
        )
    if exc.status_code == 401:
        return error_response(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Autenticacao obrigatoria",
        )
    if exc.status_code == 403:
        return error_response(
            status_code=403,
            code="FORBIDDEN",
            message="Acesso negado",
        )
    if exc.status_code in {400, 405}:
        return error_response(
            status_code=exc.status_code,
            code="VALIDATION_ERROR",
            message="Requisicao invalida",
        )

    return error_response(
        status_code=exc.status_code,
        code="INTERNAL_ERROR",
        message="Erro interno",
    )


async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for error in exc.errors():
        sanitized_error = {key: value for key, value in error.items() if key != "input"}
        errors.append(jsonable_encoder(sanitized_error))

    return error_response(
        status_code=422,
        code="VALIDATION_ERROR",
        message="Dados invalidos",
        details={"errors": errors},
    )
