"""Router for custom History endpoints."""

from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import history_schemas
from app.routers.database_history_router import resolve_entity_name

router = APIRouter(prefix="/sub", tags=["History subpage dedicated router"])

INTERNAL_KEYS = {
    "id",
    "version_id",
    "user_id",
    "team_id",
    "hashed_password",
    "is_active",
    "is_verified",
    "is_superuser",
    "force_password_change",
    "timestamp",
    "metadata_id",
    "item_id",
    "map_id",
    "localization_id",
    "room_id",
    "rental_id",
    "category_id",
    "machine_id",
    "entity_id",
}


def get_state_diff(
    before: Dict[str, Any], after: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Compares two states and returns only the keys that changed.

    Excluding internal/system keys.
    :param before: Before action state
    :param after: After action state
    :return Diff between passed states
    """
    before = before if before is not None else {}
    after = after if after is not None else {}

    b_clean = {k: v for k, v in before.items() if k not in INTERNAL_KEYS}
    a_clean = {k: v for k, v in after.items() if k not in INTERNAL_KEYS}

    if not b_clean or not a_clean:
        return b_clean, a_clean

    diff_before = {}
    diff_after = {}

    all_keys = set(b_clean.keys()) | set(a_clean.keys())

    for key in all_keys:
        val_b = b_clean.get(key)
        val_a = a_clean.get(key)

        if val_b != val_a:
            diff_before[key] = val_b
            diff_after[key] = val_a

    return diff_before, diff_after


@router.get("/history", response_model=List[history_schemas.HistoryResponse])
async def get_blackboxed_history_logs(
    limit=200,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve "blackboxed" history list.

    :param limit: Limit of entries
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Blackboxed history list.
    """
    ctx.require_user()

    stmt = (
        sql.select(models.History)
        .join(models.User, models.History.user_id == models.User.id)
        .options(orm.joinedload(models.History.user))
    )

    stmt = ctx.team_filter(stmt, models.User)
    stmt = stmt.order_by(models.History.timestamp.desc()).limit(limit)

    result = await db.execute(stmt)
    logs = result.unique().scalars().all()

    results = []

    for log in logs:
        clean_before, clean_after = get_state_diff(log.before_state, log.after_state)

        readable_name = await resolve_entity_name(log, db)

        results.append(
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "action": (
                    log.action.value
                    if hasattr(log.action, "value")
                    else str(log.action)
                ),
                "entity_type": (
                    log.entity_type.value
                    if hasattr(log.entity_type, "value")
                    else str(log.entity_type)
                ),
                "entity_id": log.entity_id,
                "entity_name": readable_name,
                "user_id": log.user_id,
                "user": log.user,
                "before_state": clean_before if clean_before else None,
                "after_state": clean_after if clean_after else None,
                "can_rollback": log.can_rollback,
            }
        )

    return results


@router.get("/history/{history_id}", response_model=history_schemas.HistoryResponse)
async def get_blackboxed_history_item(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve "blackboxed" history information.

    :param history_id: History ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Blackboxed history item.
    """
    ctx.require_user()

    stmt = (
        sql.select(models.History)
        .join(models.User, models.History.user_id == models.User.id)
        .options(orm.joinedload(models.History.user))
        .filter(models.History.id == history_id)
    )

    stmt = ctx.team_filter(stmt, models.User)

    result = await db.execute(stmt)
    log_entry = result.unique().scalar_one_or_none()

    if not log_entry:
        raise exceptions.ObjectNotFoundError("History log")

    clean_before, clean_after = get_state_diff(
        log_entry.before_state, log_entry.after_state
    )

    readable_name = await resolve_entity_name(log_entry, db)

    return {
        "id": log_entry.id,
        "timestamp": log_entry.timestamp,
        "action": (
            log_entry.action.value
            if hasattr(log_entry.action, "value")
            else str(log_entry.action)
        ),
        "entity_type": (
            log_entry.entity_type.value
            if hasattr(log_entry.entity_type, "value")
            else str(log_entry.entity_type)
        ),
        "entity_id": log_entry.entity_id,
        "entity_name": readable_name,
        "user_id": log_entry.user_id,
        "user": log_entry.user,
        "before_state": clean_before if clean_before else None,
        "after_state": clean_after if clean_after else None,
        "can_rollback": log_entry.can_rollback,
    }
