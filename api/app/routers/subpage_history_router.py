"""Router for custom History endpoints"""

from typing import List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.db.models import History, User
from app.db.schemas import HistoryResponse
from app.auth.dependencies import RequestContext
from app.routers.database_history_router import resolve_entity_name

router = APIRouter()

# Filtering out history fields
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
    "layout_id",
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


@router.get("/sub/history", response_model=List[HistoryResponse], tags=["History"])
def get_blackboxed_history_logs(
    limit=200, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    query = (
        db.query(History)
        .join(User, History.user_id == User.id)
        .options(joinedload(History.user))
    )
    query = ctx.team_filter(query, User)
    query = query.order_by(History.timestamp.desc())
    logs = query.limit(limit).all()

    results = []

    for log in logs:
        clean_before, clean_after = get_state_diff(log.before_state, log.after_state)

        readable_name = resolve_entity_name(log, db)

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
