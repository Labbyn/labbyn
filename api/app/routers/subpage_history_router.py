"""Router for custom History endpoints"""

from typing import List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

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
from app.db.schemas import HistoryResponse
from app.auth.dependencies import RequestContext

router = APIRouter()


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
}


def get_state_diff(
    before: Dict[str, Any], after: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Compares two states and returns only the keys that changed,
    excluding internal/system keys.
    """
    before = before or {}
    after = after or {}

    b_clean = {k: v for k, v in before.items() if k not in INTERNAL_KEYS}
    a_clean = {k: v for k, v in after.items() if k not in INTERNAL_KEYS}

    diff_before = {}
    diff_after = {}

    all_keys = set(b_clean.keys()) | set(a_clean.keys())

    for key in all_keys:
        val_b = b_clean.get(key)
        val_a = a_clean.get(key)

        if val_b != val_a:
            if val_b is not None:
                diff_before[key] = val_b
            if val_a is not None:
                diff_after[key] = val_a

    return diff_before, diff_after


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


@router.get(
    "/sub/history/{history_id}", response_model=HistoryResponse, tags=["History"]
)
def get_blackboxed_history_item(
    history_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Retrieve "blackboxed" history information.
    :param history_id: History ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Blackboxed history item
    """

    query = (
        db.query(History)
        .join(User, History.user_id == User.id)
        .filter(History.id == history_id)
    )

    query = ctx.team_filter(query, User)
    query = query.order_by(History.timestamp)
    log_entry = query.first()
    results = []

    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="History not found"
        )
    clean_before, clean_after = get_state_diff(
        log_entry.before_state, log_entry.after_state
    )

    readable_name = resolve_entity_name(log_entry, db)

    results = {
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

    return results
