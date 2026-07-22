from __future__ import annotations

import csv
import hashlib
import io
import re
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.transaction_import import TransactionImport
from app.models.user import User
from app.repositories.account_repository import get_active_account_by_id, get_active_account_by_id_for_update
from app.repositories.category_repository import list_active_categories
from app.repositories.transaction_import_repository import (
    find_existing_import_fingerprints,
    list_categorized_transactions_for_suggestions,
    list_transaction_imports,
    list_transactions_for_duplicate_check,
)
from app.schemas.transaction_import import (
    ImportConfirmRequest,
    ImportConfirmResult,
    ImportPreview,
    ImportPreviewRequest,
    ImportPreviewRow,
    TransactionImportRead,
)
from app.services.transaction_service import apply_balance


MAX_IMPORT_ROWS = 500


@dataclass(frozen=True)
class ParsedRow:
    transaction_date: date
    description: str
    amount: Decimal
    type: str


def normalize_description(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower().strip())
    ascii_text = "".join(character for character in normalized if not unicodedata.combining(character))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", ascii_text).split())


def transaction_fingerprint(account_id: uuid.UUID, row: ParsedRow) -> str:
    source = "|".join(
        [
            str(account_id),
            row.transaction_date.isoformat(),
            row.type,
            f"{row.amount.quantize(Decimal('0.01')):.2f}",
            normalize_description(row.description),
        ]
    )
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def _parse_date(value: str) -> date:
    cleaned = value.strip()[:10]
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y%m%d"):
        try:
            return datetime.strptime(cleaned, pattern).date()
        except ValueError:
            continue
    raise ValueError(f"Data invalida: {value}")


def _parse_decimal(value: str) -> Decimal:
    cleaned = re.sub(r"[^0-9,.-]", "", value.strip())
    if not cleaned:
        raise ValueError("Valor vazio")
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif cleaned.count(".") > 1:
        parts = cleaned.split(".")
        cleaned = "".join(parts[:-1]) + "." + parts[-1]
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except InvalidOperation as error:
        raise ValueError(f"Valor invalido: {value}") from error


def _normalized_headers(row: dict[str, str | None]) -> dict[str, str]:
    return {normalize_description(key): (value or "").strip() for key, value in row.items() if key}


def _value_for(row: dict[str, str], aliases: tuple[str, ...]) -> str:
    for alias in aliases:
        if alias in row and row[alias]:
            return row[alias]
    return ""


def _parse_csv(content: str) -> list[ParsedRow]:
    sample = content[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;|\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff")), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError("O CSV precisa ter uma linha de cabecalho")

    parsed: list[ParsedRow] = []
    for raw_row in reader:
        row = _normalized_headers(raw_row)
        date_value = _value_for(row, ("data", "date", "transaction date", "data lancamento"))
        description = _value_for(row, ("descricao", "description", "historico", "memo", "name"))
        amount_value = _value_for(row, ("valor", "amount", "quantia"))
        debit_value = _value_for(row, ("debito", "debit"))
        credit_value = _value_for(row, ("credito", "credit"))
        type_value = normalize_description(_value_for(row, ("tipo", "type", "natureza")))

        if not date_value and not description and not amount_value and not debit_value and not credit_value:
            continue
        if not date_value or not description:
            raise ValueError("Cada linha precisa ter data e descricao")

        if amount_value:
            signed_amount = _parse_decimal(amount_value)
            transaction_type = "expense" if signed_amount < 0 else "income"
            if type_value in {"despesa", "expense", "debito", "saida"}:
                transaction_type = "expense"
            elif type_value in {"receita", "income", "credito", "entrada"}:
                transaction_type = "income"
        elif debit_value:
            signed_amount = _parse_decimal(debit_value)
            transaction_type = "expense"
        elif credit_value:
            signed_amount = _parse_decimal(credit_value)
            transaction_type = "income"
        else:
            raise ValueError("Cada linha precisa ter valor, debito ou credito")

        amount = abs(signed_amount)
        if amount <= 0:
            raise ValueError("Os valores precisam ser maiores que zero")
        parsed.append(ParsedRow(_parse_date(date_value), description[:255], amount, transaction_type))

    return parsed


def _ofx_value(block: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\s*([^<\r\n]+)", block, flags=re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _parse_ofx(content: str) -> list[ParsedRow]:
    blocks = re.split(r"<STMTTRN>", content, flags=re.IGNORECASE)[1:]
    parsed: list[ParsedRow] = []
    for raw_block in blocks:
        block = re.split(r"</STMTTRN>", raw_block, maxsplit=1, flags=re.IGNORECASE)[0]
        amount_value = _ofx_value(block, "TRNAMT")
        date_value = _ofx_value(block, "DTPOSTED")[:8]
        description = _ofx_value(block, "NAME") or _ofx_value(block, "MEMO") or "Movimentacao importada"
        if not amount_value or not date_value:
            raise ValueError("Movimentacao OFX sem data ou valor")
        signed_amount = _parse_decimal(amount_value)
        if signed_amount == 0:
            raise ValueError("Os valores precisam ser diferentes de zero")
        parsed.append(
            ParsedRow(
                _parse_date(date_value),
                description[:255],
                abs(signed_amount),
                "expense" if signed_amount < 0 else "income",
            )
        )
    return parsed


def parse_import_file(filename: str, content: str) -> tuple[str, list[ParsedRow]]:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    try:
        if extension == "csv":
            rows = _parse_csv(content)
        elif extension == "ofx":
            rows = _parse_ofx(content)
        else:
            raise AppError(400, "UNSUPPORTED_FILE", "Use um arquivo CSV ou OFX")
    except UnicodeError as error:
        raise AppError(400, "INVALID_IMPORT_FILE", "Nao foi possivel ler a codificacao do arquivo") from error
    except ValueError as error:
        raise AppError(400, "INVALID_IMPORT_FILE", str(error)) from error
    if not rows:
        raise AppError(400, "EMPTY_IMPORT_FILE", "O arquivo nao possui movimentacoes validas")
    if len(rows) > MAX_IMPORT_ROWS:
        raise AppError(400, "IMPORT_TOO_LARGE", f"O arquivo pode conter no maximo {MAX_IMPORT_ROWS} linhas")
    return extension, rows


def _existing_fingerprints(
    db: Session, current_user: User, account_id: uuid.UUID, rows: list[ParsedRow]
) -> set[str]:
    fingerprints = {transaction_fingerprint(account_id, row) for row in rows}
    existing = find_existing_import_fingerprints(db, current_user.id, account_id, fingerprints)
    transactions = list_transactions_for_duplicate_check(
        db,
        current_user.id,
        account_id,
        min(row.transaction_date for row in rows),
        max(row.transaction_date for row in rows),
    )
    for transaction in transactions:
        existing.add(
            transaction.import_fingerprint
            or transaction_fingerprint(
                account_id,
                ParsedRow(
                    transaction.transaction_date,
                    transaction.description,
                    transaction.amount,
                    transaction.type,
                ),
            )
        )
    return existing


def _category_suggestion_maps(
    db: Session, current_user: User
) -> tuple[list[Category], dict[tuple[str, str], uuid.UUID]]:
    categories = list_active_categories(db, current_user.id, 1, 100)
    learned: dict[tuple[str, str], uuid.UUID] = {}
    for transaction in list_categorized_transactions_for_suggestions(db, current_user.id):
        key = (transaction.type, normalize_description(transaction.original_description or transaction.description))
        learned.setdefault(key, transaction.category_id)
    return categories, learned


def preview_transaction_import(
    db: Session, current_user: User, payload: ImportPreviewRequest
) -> ImportPreview:
    if get_active_account_by_id(db, payload.account_id, current_user.id) is None:
        raise AppError(404, "RESOURCE_NOT_FOUND", "Conta nao encontrada")
    file_format, parsed_rows = parse_import_file(payload.filename, payload.content)
    existing = _existing_fingerprints(db, current_user, payload.account_id, parsed_rows)
    categories, learned = _category_suggestion_maps(db, current_user)
    seen: set[str] = set()
    preview_rows: list[ImportPreviewRow] = []

    for index, row in enumerate(parsed_rows, start=1):
        fingerprint = transaction_fingerprint(payload.account_id, row)
        duplicate = fingerprint in existing or fingerprint in seen
        seen.add(fingerprint)
        normalized = normalize_description(row.description)
        suggested_id = learned.get((row.type, normalized))
        confidence = Decimal("0.95") if suggested_id else Decimal("0")
        reason = "Aprendido com uma correcao anterior" if suggested_id else "Revisao necessaria"

        if suggested_id is None:
            matching = next(
                (
                    category
                    for category in categories
                    if category.type == row.type and normalize_description(category.name) in normalized
                ),
                None,
            )
            if matching:
                suggested_id = matching.id
                confidence = Decimal("0.65")
                reason = "Nome da categoria encontrado na descricao"

        preview_rows.append(
            ImportPreviewRow(
                row_number=index,
                transaction_date=row.transaction_date,
                description=row.description,
                amount=row.amount,
                type=row.type,
                suggested_category_id=suggested_id,
                confidence=confidence,
                suggestion_reason=reason,
                is_duplicate=duplicate,
            )
        )

    duplicate_count = sum(row.is_duplicate for row in preview_rows)
    return ImportPreview(
        filename=payload.filename,
        file_format=file_format,
        total_rows=len(preview_rows),
        duplicate_count=duplicate_count,
        ready_count=len(preview_rows) - duplicate_count,
        rows=preview_rows,
    )


def confirm_transaction_import(
    db: Session, current_user: User, payload: ImportConfirmRequest
) -> ImportConfirmResult:
    account = get_active_account_by_id_for_update(db, payload.account_id, current_user.id)
    if account is None:
        raise AppError(404, "RESOURCE_NOT_FOUND", "Conta nao encontrada")
    selected_rows = [row for row in payload.rows if row.selected]
    parsed_rows = [ParsedRow(row.transaction_date, row.description.strip(), row.amount, row.type) for row in selected_rows]
    existing = _existing_fingerprints(db, current_user, payload.account_id, parsed_rows) if parsed_rows else set()
    categories = {category.id: category for category in list_active_categories(db, current_user.id, 1, 100)}
    batch = TransactionImport(
        user_id=current_user.id,
        account_id=payload.account_id,
        filename=payload.filename,
        file_format=payload.file_format,
        total_rows=len(payload.rows),
        imported_count=0,
        duplicate_count=0,
        skipped_count=sum(not row.selected for row in payload.rows),
    )
    db.add(batch)
    db.flush()
    seen: set[str] = set()

    try:
        for source_row, row in zip(selected_rows, parsed_rows, strict=True):
            fingerprint = transaction_fingerprint(payload.account_id, row)
            if fingerprint in existing or fingerprint in seen:
                batch.duplicate_count += 1
                continue
            seen.add(fingerprint)
            category = categories.get(source_row.category_id)
            if category is None or category.type != row.type:
                raise AppError(
                    400,
                    "CATEGORY_REVIEW_REQUIRED",
                    f"Revise a categoria da movimentacao '{row.description}'",
                )
            transaction = Transaction(
                user_id=current_user.id,
                account_id=payload.account_id,
                category_id=category.id,
                import_id=batch.id,
                import_fingerprint=fingerprint,
                original_description=row.description,
                type=row.type,
                amount=row.amount,
                description=row.description,
                transaction_date=row.transaction_date,
            )
            apply_balance(account, transaction.type, transaction.amount)
            db.add(transaction)
            batch.imported_count += 1

        db.commit()
        db.refresh(batch)
    except AppError:
        db.rollback()
        raise
    except IntegrityError as error:
        db.rollback()
        raise AppError(409, "DUPLICATE_IMPORT", "Outra importacao registrou estas movimentacoes") from error
    except Exception:
        db.rollback()
        raise

    return ImportConfirmResult(
        import_record=TransactionImportRead.model_validate(batch),
        imported_count=batch.imported_count,
        duplicate_count=batch.duplicate_count,
        skipped_count=batch.skipped_count,
    )


def list_user_transaction_imports(db: Session, current_user: User) -> list[TransactionImport]:
    return list_transaction_imports(db, current_user.id)
