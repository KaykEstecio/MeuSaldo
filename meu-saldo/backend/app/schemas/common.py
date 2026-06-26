from typing import Generic, TypeVar

from pydantic import BaseModel


DataT = TypeVar("DataT")


class ApiResponse(BaseModel, Generic[DataT]):
    data: DataT
    message: str


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class ListResponse(BaseModel, Generic[DataT]):
    data: list[DataT]
    meta: PaginationMeta
