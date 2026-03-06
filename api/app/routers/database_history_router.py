"""Router for History Database API CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_async_db
from app.db.models import (
    History,
    User,
    EntityType,
    ActionType,
    Machines,
    Inventory,
    Rooms,
    Categories,
)
from app.db.schemas import HistoryEnhancedResponse
from app.auth.dependencies import RequestContext

router = APIRouter()


def get_model_class(entity_type: EntityType):
    """
    Map EntityType to corresponding SQLAlchemy model class.
    :param entity_type: EntityType enum value
    :return: Corresponding SQLAlchemy model class or None
    """
    mapping = {
        EntityType.MACHINES: Machines,
        EntityType.INVENTORY: Inventory,
        EntityType.ROOM: Rooms,
        EntityType.USER: User,
        EntityType.CATEGORIES: Categories,
    }
    return mapping.get(entity_type)


async def resolve_entity_name(log: History, db: AsyncSession):
    """
    Fetch the name of the entity based on its type and ID.
    log: History log entry
    db: Active database session
    :return: Readable name of the entity
    """
    state = log.after_state or log.before_state
    if state:
        if "name" in state:
            return state["name"]
        if "login" in state:
            return state["login"]

    model_class = get_model_class(log.entity_type)
    if model_class:
        stmt = select(model_class).filter(model_class.id == log.entity_id)
        result = await db.execute(stmt)
        entity = result.scalar_one_or_none()
        if entity:
            return getattr(
                entity, "name", getattr(entity, "login", f"ID: {log.entity_id}")
            )

    return f"{log.entity_type.value} (ID: {log.entity_id})"


async def _rollback_create(model_class, log_entry: History, db: AsyncSession) -> str:
    """
    Helper to rollback a CREATE action (performs DELETE).
    model_class: SQLAlchemy model class
    log_entry: History log entry
    db: Active database session
    :return: Success message
    """
    stmt = select(model_class).filter(model_class.id == log_entry.entity_id)
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


async def _rollback_delete(model_class, log_entry: History, db: AsyncSession) -> str:
    """
    Helper to rollback a DELETE action (performs CREATE/RESTORE).
    model_class: SQLAlchemy model class
    log_entry: History log entry
    db: Active database session
    :return: Success message
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


async def _rollback_update(model_class, log_entry: History, db: AsyncSession) -> str:
    """
    Helper to rollback an UPDATE action (reverts fields).
    model_class: SQLAlchemy model class
    log_entry: History log entry
    db: Active database session
    :return: Success message
    """
    stmt = select(model_class).filter(model_class.id == log_entry.entity_id)
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
    "/db/history/", response_model=List[HistoryEnhancedResponse], tags=["History"]
)
async def get_history_logs(
    limit=200,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Retrieve history logs with enhanced information.
    :param limit: Maximum number of logs to retrieve
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: History logs with enhanced details
    """
    ctx.require_user()
    stmt = (
        select(History)
        .join(User, History.user_id == User.id)
        .options(joinedload(History.user))
    )
    stmt = ctx.team_filter(stmt, User)
    stmt = stmt.order_by(History.timestamp).limit(limit)

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
    "/db/history/{history_id}", response_model=HistoryEnhancedResponse, tags=["History"]
)
async def get_history_by_id(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific history by ID
    :param history_id: History ID
    :param db: Active database session
    :return: History object
    """
    ctx.require_user()
    stmt = select(History).filter(History.id == history_id)
    result = await db.execute(stmt)
    history = result.scalar_one_or_none()

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="History not found"
        )
    return history


@router.post(
    "/db/history/{history_id}/rollback",
    status_code=status.HTTP_200_OK,
    tags=["History"],
)
async def rollback_history_entry(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Rollback a specific history entry by ID.
    :param history_id: History entry ID
    :param db: Active database session
    :return: Success message
    """

    ctx.require_group_admin()
    stmt = (
        select(History)
        .join(User, History.user_id == User.id)
        .filter(History.id == history_id)
    )
    stmt = ctx.team_filter(stmt, User)

    result = await db.execute(stmt)
    log_entry = result.scalar_one_or_none()

    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="History not found"
        )
    if not log_entry.can_rollback:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot rollback"
        )

    model_class = get_model_class(log_entry.entity_type)
    if not model_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entity type not found"
        )

    try:
        msg = ""
        if log_entry.action == ActionType.CREATE:
            msg = await _rollback_create(model_class, log_entry, db)
        elif log_entry.action == ActionType.DELETE:
            msg = await _rollback_delete(model_class, log_entry, db)
        elif log_entry.action == ActionType.UPDATE:
            msg = await _rollback_update(model_class, log_entry, db)

        await db.commit()
        return {"message": msg, "success": True}

    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Entity already exists"
        ) from e
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
