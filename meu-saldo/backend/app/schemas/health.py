from pydantic import BaseModel


class HealthResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, str]
