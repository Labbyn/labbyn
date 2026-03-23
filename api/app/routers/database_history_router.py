"""Router for History Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import sql, orm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import history_schemas

router = APIRouter(prefix="/db", tags=["History"])


def get_model_class(entity_type: models.EntityType):
    """Map EntityType to corresponding SQLAlchemy model class.

    :param entity_type: EntityType enum value
    :return: Corresponding SQLAlchemy model class or None.
    """
    mapping = {
        models.EntityType.MACHINES: models.Machines,
        models.EntityType.INVENTORY: models.Inventory,
        models.EntityType.ROOM: models.Rooms,
        models.EntityType.USER: models.User,
        models.EntityType.CATEGORIES: models.Categories,
    }
    return mapping.get(entity_type)


async def resolve_entity_name(log: models.History, db: AsyncSession):
    """Fetch the name of the entity based on its type and ID.

    :param log: History log entry
    :param db: Active database session
    :return: Readable name of the entity.
    """
    state = log.after_state or log.before_state
    if state:
        if "name" in state:
            return state["name"]
        if "login" in state:
            return state["login"]

    model_class = get_model_class(log.entity_type)
    if model_class:
        stmt = sql.select(model_class).filter(model_class.id == log.entity_id)
        result = await db.execute(stmt)
        entity = result.scalar_one_or_none()
        if entity:
            return getattr(
                entity, "name", getattr(entity, "login", f"ID: {log.entity_id}")
            )

    return f"{log.entity_type.value} (ID: {log.entity_id})"


async def _rollback_create(
    model_class, log_entry: models.History, db: AsyncSession
) -> str:
    """Helper to rollback a CREATE action (performs DELETE).

    :param model_class: SQLAlchemy model class
    :param log_entry: History log entry
    :param db: Active database session
    :return: Success message.
    """
    stmt = sql.select(model_class).filter(model_class.id == log_entry.entity_id)
    result = await db.execute(stmt)
    obj = result.scalar_one_or_none()

    if obj:
        await db.delete(obj)
        return (
            f"Rollback successful: {log_entry.entity_type.value}, "
            f"ID: {log_entry.entity_id} deleted"
        )
    return (
        f"No action taken: {log_entry.entity_type.value}, "
        f"ID: {log_entry.entity_id} not found for deletion"
    )


async def _rollback_delete(
    model_class, log_entry: models.History, db: AsyncSession
) -> str:
    """Helper to rollback a DELETE action (performs CREATE/RESTORE).

    :param model_class: SQLAlchemy model class
    :param log_entry: History log entry
    :param db: Active database session
    :return: Success message.
    """
    if not log_entry.before_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No before state saved",
        )
    data = log_entry.before_state.copy()
    restored_obj = model_class(**data)
    db.add(restored_obj)
    return (
        f"Rollback successful: {log_entry.entity_type.value}, "
        f"ID: {log_entry.entity_id} restored to previous state"
    )


async def _rollback_update(
    model_class, log_entry: models.History, db: AsyncSession
) -> str:
    """Helper to rollback an UPDATE action (reverts fields).

    :param model_class: SQLAlchemy model class
    :param log_entry: History log entry
    :param db: Active database session
    :return: Success message.
    """
    stmt = sql.select(model_class).filter(model_class.id == log_entry.entity_id)
    result = await db.execute(stmt)
    obj = result.scalar_one_or_none()

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found"
        )

    if log_entry.extra_data:
        for field, val in log_entry.extra_data.items():
            if hasattr(obj, field):
                setattr(obj, field, val.get("old"))

    return (
        f"Rollback successful: {log_entry.entity_type.value}, "
        f"ID: {log_entry.entity_id} fields reverted from extra_data"
    )


@router.get(
    "/history/",
    response_model=List[history_schemas.HistoryEnhancedResponse],
    tags=["History"],
)
async def get_history_logs(
    limit=200,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve history logs with enhanced information.

    :param limit: Maximum number of logs to retrieve
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: History logs with enhanced details.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.History)
        .join(models.User, models.History.user_id == models.User.id)
        .options(models.joinedload(models.History.user))
    )
    stmt = ctx.team_filter(stmt, models.User)
    stmt = stmt.order_by(models.History.timestamp).limit(limit)

    result = await db.execute(stmt)
    logs = result.unique().scalars().all()
    results = []

    for log in logs:
        readable_name = await resolve_entity_name(log, db)
        action_val = (
            log.action.value if hasattr(log.action, "value") else str(log.action)
        )
        type_val = (
            log.entity_type.value
            if hasattr(log.entity_type, "value")
            else str(log.entity_type)
        )
        results.append(
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "action": action_val,
                "entity_type": type_val,
                "entity_id": log.entity_id,
                "entity_name": readable_name,
                "user": log.user,
                "user_id": log.user_id,
                "before_state": log.before_state,
                "after_state": log.after_state,
                "can_rollback": log.can_rollback,
            }
        )

    return results


@router.get(
    "/history/{history_id}", response_model=history_schemas.HistoryEnhancedResponse
)
async def get_history_by_id(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific history by ID.

    :param history_id: History ID
    :param db: Active database session
    :return: History object.
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
    history = result.unique().scalar_one_or_none()

    if not history:
        raise exceptions.ObjectNotFoundError("History")

    return history


@router.post(
    "/history/{history_id}/rollback",
    status_code=status.HTTP_200_OK,
)
async def rollback_history_entry(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Rollback a specific history entry by ID.

    :param history_id: History entry ID
    :param db: Active database session
    :return: Success message.
    """
    ctx.require_group_admin()
    stmt = (
        sql.select(models.History)
        .join(models.User, models.History.user_id == models.User.id)
        .filter(models.History.id == history_id)
    )
    stmt = ctx.team_filter(stmt, models.User)

    result = await db.execute(stmt)
    log_entry = result.scalar_one_or_none()

    if not log_entry:
        raise exceptions.ObjectNotFoundError("History")

    if not log_entry.can_rollback:
        raise exceptions.ValidationError("This specific action cannot be rolled back")

    model_class = get_model_class(log_entry.entity_type)
    if not model_class:
        raise exceptions.ObjectNotFoundError("Entity model")

    try:
        msg = ""
        if log_entry.action == models.ActionType.CREATE:
            msg = await _rollback_create(model_class, log_entry, db)
        elif log_entry.action == models.ActionType.DELETE:
            msg = await _rollback_delete(model_class, log_entry, db)
        elif log_entry.action == models.ActionType.UPDATE:
            msg = await _rollback_update(model_class, log_entry, db)

        await db.commit()
        return {"message": msg, "success": True}

    except IntegrityError as e:
        await db.rollback()
        raise exceptions.ValidationError(
            "Rollback failed: Conflict with existing data"
        ) from e
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError("Rollback operation failed") from e
