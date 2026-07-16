import json
import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response


logger = logging.getLogger("meusaldo.http")


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")


def _log_request(request: Request, request_id: str, status_code: int, started_at: float) -> None:
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        json.dumps(
            {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
            },
            separators=(",", ":"),
        )
    )


async def request_logging_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = (request.headers.get("x-request-id") or str(uuid.uuid4()))[:128]
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        _log_request(request, request_id, 500, started_at)
        raise
    response.headers["x-request-id"] = request_id
    _log_request(request, request_id, response.status_code, started_at)
    return response
