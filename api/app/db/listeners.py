"""Database listeners for History logging."""

import json
from typing import Any, Optional
from datetime import datetime, date
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session, UOWTransaction
from app.db.models import History, EntityType, ActionType


def json_serializer(obj: Any):
    """
    JSON serializer helper for datetime and date objects.

    Converts datetime and date objects to ISO format strings.
    For other types, it returns their string representation.

    :param obj: The object to serialize.
    :return: ISO formatted string if date/datetime, else string representation.
    """
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


def get_entity_state(obj: Any):
    """
    Extracts the current state of a database entity into a dictionary.

    Iterates through the model's columns and retrieves their current values.

    :param obj: SQLAlchemy model instance to inspect.
    :return: A dictionary mapping column names to their values.
    """
    state = {}
    mapper = inspect(obj).mapper
    for col in mapper.column_attrs:
        state[col.key] = getattr(obj, col.key)
    return json.loads(json.dumps(state, default=json_serializer))


def identify_entity_type(obj: Any):
    """
    Maps database instance to coressponding EntityType Enum
    :param obj: SQLAlchemy model instance to inspect
    :return: corresponding EntityType enum member, or None if not mapped.
    """
    table_name = obj.__tablename__
    mapping = {
        "machines": EntityType.MACHINE,
        "inventory": EntityType.INVENTORY,
        "rooms": EntityType.ROOM,
        "user": EntityType.USER,
    }
    return mapping.get(table_name)

# pylint: disable=unused-argument
@event.listens_for(Session, "before_flush")
def dump_before_flush(
    session: Session,
    flush_context: UOWTransaction,
    instances: Optional[Any],
):
    """
    SQLAlchemy event listener triggered before session is flushed to database
    Inspects session for UPDATE, CREATE and DELETE operation and automatically creates corresponding History log entries
    :param session: Database session
    :param flush_context: Internal SQLAlchemy transaction context
    :param instances: List of instances being flushed
    :return: None
    """

    user_id = session.info.get("user_id", None)

    for obj in session.dirty:
        if isinstance(obj, History):
            continue
        entity_type = identify_entity_type(obj)
        if not entity_type:
            continue

        changes = {}
        for attr in inspect(obj).attrs:
            hist = attr.history

            if hist.has_changes() and attr.key != "version_id":
                changes[attr.key] = {
                    "old": hist.deleted[0] if hist.deleted else None,
                    "new": hist.added[0] if hist.added else None,
                }

        if changes:
            session.add(
                History(
                    entity_type=entity_type,
                    action=ActionType.UPDATE,
                    entity_id=obj.id,
                    user_id=user_id,
                    extra_data=json.loads(json.dumps(changes, default=json_serializer)),
                )
            )

    for obj in session.new:
        if isinstance(obj, History):
            continue
        entity_type = identify_entity_type(obj)
        if not entity_type:
            continue

        session.add(
            History(
                entity_type=entity_type,
                action=ActionType.CREATE,
                entity_id=obj.id,
                user_id=user_id,
                after_state=get_entity_state(obj),
            )
        )

    for obj in session.deleted:
        if isinstance(obj, History):
            continue
        entity_type = identify_entity_type(obj)
        if not entity_type:
            continue

        session.add(
            History(
                entity_type=entity_type,
                action=ActionType.DELETE,
                entity_id=obj.id,
                user_id=user_id,
                before_state=get_entity_state(obj),
            )
        )
