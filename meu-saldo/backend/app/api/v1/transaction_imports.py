from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, ListResponse, PaginationMeta
from app.schemas.transaction_import import (
    ImportConfirmRequest,
    ImportConfirmResult,
    ImportPreview,
    ImportPreviewRequest,
    TransactionImportRead,
)
from app.services.transaction_import_service import (
    confirm_transaction_import,
    list_user_transaction_imports,
    preview_transaction_import,
)


router = APIRouter(prefix="/transaction-imports", tags=["transaction-imports"])


@router.post("/preview", response_model=ApiResponse[ImportPreview])
def preview_import(
    payload: ImportPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[ImportPreview]:
    return ApiResponse(data=preview_transaction_import(db, current_user, payload), message="Previa gerada com sucesso")


@router.post("/confirm", response_model=ApiResponse[ImportConfirmResult], status_code=status.HTTP_201_CREATED)
def confirm_import(
    payload: ImportConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[ImportConfirmResult]:
    return ApiResponse(data=confirm_transaction_import(db, current_user, payload), message="Importacao concluida")


@router.get("", response_model=ListResponse[TransactionImportRead])
def list_imports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[TransactionImportRead]:
    imports = list_user_transaction_imports(db, current_user)
    return ListResponse(
        data=[TransactionImportRead.model_validate(item) for item in imports],
        meta=PaginationMeta(page=1, page_size=20, total=len(imports)),
    )
