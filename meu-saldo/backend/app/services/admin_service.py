from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import count_users, count_users_created_since, list_users
from app.schemas.admin import AdminMetricsRead


def get_admin_metrics(db: Session) -> AdminMetricsRead:
    now = datetime.now(UTC)
    month_start = datetime(now.year, now.month, 1, tzinfo=UTC)

    return AdminMetricsRead(
        total_users=count_users(db),
        new_users_this_month=count_users_created_since(db, month_start),
    )


def list_admin_users(db: Session, page: int, page_size: int) -> list[User]:
    return list_users(db, page=page, page_size=page_size)
