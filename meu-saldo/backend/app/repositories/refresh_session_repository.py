import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_session import RefreshSession


def add_refresh_session(db: Session, session: RefreshSession) -> RefreshSession:
    db.add(session)
    db.flush()
    return session


def get_active_refresh_session(
    db: Session, token_hash: str, *, for_update: bool = False
) -> RefreshSession | None:
    query = select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
            RefreshSession.revoked_at.is_(None),
            RefreshSession.expires_at > datetime.now(UTC),
        )
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def revoke_refresh_session(
    db: Session, session: RefreshSession, *, replaced_by: uuid.UUID | None = None
) -> RefreshSession:
    session.revoked_at = datetime.now(UTC)
    session.replaced_by = replaced_by
    return session
