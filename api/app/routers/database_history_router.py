"""Router for History Database API CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database import get_db
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


def resolve_entity_name(log: History, db: Session):
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
        entity = db.query(model_class).filter(model_class.id == log.entity_id).first()
        if entity:
            return getattr(
                entity, "name", getattr(entity, "login", f"ID: {log.entity_id}")
            )

    return f"{log.entity_type.value} (ID: {log.entity_id})"


def _rollback_create(model_class, log_entry: History, db: Session) -> str:
    """
    Helper to rollback a CREATE action (performs DELETE).
    model_class: SQLAlchemy model class
    log_entry: History log entry
    db: Active database session
    :return: Success message
    """
    obj = db.query(model_class).filter(model_class.id == log_entry.entity_id).first()
    if obj:
        db.delete(obj)
        return (
            f"Rollback successful: {log_entry.entity_type.value}, "
            f"ID: {log_entry.entity_id} deleted"
        )
    return (
        f"No action taken: {log_entry.entity_type.value}, "
        f"ID: {log_entry.entity_id} not found for deletion"
    )


def _rollback_delete(model_class, log_entry: History, db: Session) -> str:
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


def _rollback_update(model_class, log_entry: History, db: Session) -> str:
    """
    Helper to rollback an UPDATE action (reverts fields).
    model_class: SQLAlchemy model class
    log_entry: History log entry
    db: Active database session
    :return: Success message
    """
    obj = db.query(model_class).filter(model_class.id == log_entry.entity_id).first()
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
def get_history_logs(limit=200, db: Session = Depends(get_db)):
    """
    Retrieve history logs with enhanced information.
    :param limit: Maximum number of logs to retrieve
    :param db: Active database session
    :return: History logs with enhanced details
    """
    query = db.query(History).options(joinedload(History.user))
    query = query.order_by(desc(History.timestamp))
    logs = query.limit(limit).all()

    results = []

    for log in logs:
        readable_name = resolve_entity_name(log, db)
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
                "before_state": log.before_state,
                "after_state": log.after_state,
                "can_rollback": log.can_rollback,
            }
        )

    return results

@router.get("/db/history/{history_id}", response_model=HistoryEnhancedResponse, tags=["History"])
def get_history_by_id(history_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific history by ID
    :param history_id: History ID
    :param db: Active database session
    :return: History object
    """
    history = db.query(History).filter(History.id == history_id).first()
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
def rollback_history_entry(history_id: int, db: Session = Depends(get_db)):
    """
    Rollback a specific history entry by ID.
    :param history_id: History entry ID
    :param db: Active database session
    :return: Success message
    """
    log_entry = db.query(History).filter(History.id == history_id).first()
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
            msg = _rollback_create(model_class, log_entry, db)
        elif log_entry.action == ActionType.DELETE:
            msg = _rollback_delete(model_class, log_entry, db)
        elif log_entry.action == ActionType.UPDATE:
            msg = _rollback_update(model_class, log_entry, db)

        db.commit()
        return {"message": msg, "success": True}

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Entity already exists"
        ) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
