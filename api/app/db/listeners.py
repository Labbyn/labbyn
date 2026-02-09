"""Database listeners for History logging."""

import json
from enum import Enum
from typing import Any, Optional
from datetime import datetime, date
from sqlalchemy import event, inspect
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.orm import Session, UOWTransaction
from app.db.models import History, EntityType, ActionType


def json_serializer(obj: Any):
    """
    Converts datatetime and date objects to strings.
    :param obj: object to serialize
    :return: JSON-serializable string representation
    """
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value
    return str(obj)


def get_entity_state(obj: Any):
    """
    Retrieve current state of SQLAlchemy Entity
    :param obj: SQLAlchemy model instance
    :return: Dictionary representing entity's state
    """
    state = {}
    try:
        mapper = inspect(obj).mapper
        for col in mapper.column_attrs:
            state[col.key] = getattr(obj, col.key)
    except NoInspectionAvailable:
        pass
    return json.loads(json.dumps(state, default=json_serializer))


def identify_entity_type(obj: Any):
    """
    Robust identification of entity type based on its mapped table name
    :param obj: SQLAlchemy model instance
    :return: Corresponding EntityType member or None
    """
    try:
        table_name = inspect(obj).mapper.persist_selectable.name
    except NoInspectionAvailable:
        table_name = getattr(obj, "__tablename__", None)

    if not table_name:
        return None

    mapping = {
        "machines": EntityType.MACHINES,
        "inventory": EntityType.INVENTORY,
        "rooms": EntityType.ROOM,
        "user": EntityType.USER,
        "categories": EntityType.CATEGORIES,
    }

    result = mapping.get(table_name)

    return result


# pylint: disable=unused-argument
@event.listens_for(Session, "before_flush")
def receive_before_flush(
    session: Session, flush_context: UOWTransaction, instances: Optional[Any]
):
    """
    SQLAlchemy session listener triggered before data is flushed to database.

    This function handles logging for **UPDATE** and **DELETE** actions,
    as it requires access to the *old* state of dirty and deleted objects
    before the database transaction commits the changes.

    - **UPDATE** logs: Compares current and previous values to record specific field changes.
    - **DELETE** logs: Captures the full state of the object *before* deletion.
    - **CREATE** (preparatory): Stores new objects in `session.info` for later
      processing in `after_flush`, where the `entity_id` will be available.

    :param session: Current SQLAlchemy Session object
    :param flush_context: Unit of work transaction context
    :param instances: Optional argument
    :return: None
    """
    user_id = session.info.get("user_id")

    objects_to_create = session.info.setdefault("objects_to_create_history", [])
    for obj in session.new:
        if isinstance(obj, History):
            continue
        if identify_entity_type(obj):
            objects_to_create.append(obj)

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


# pylint: disable=unused-argument
@event.listens_for(Session, "after_flush")
def receive_after_flush(session: Session, flush_context: UOWTransaction):
    """
    SQLAlchemy session listener triggered after data is flushed to database.

    This function is primarily used to handle logging for **CREATE** actions,
    as the primary key (`entity_id`) of the newly created objects is now available.

    :param session: Current SQLAlchemy Session object
    :param flush_context: Unit of work transaction context
    :return: None
    """
    user_id = session.info.get("user_id")

    objects = session.info.pop("objects_to_create_history", [])
    if not objects:
        return

    for obj in objects:
        if obj.id is None:
            continue

        entity_type = identify_entity_type(obj)
        if entity_type:
            session.add(
                History(
                    entity_type=entity_type,
                    action=ActionType.CREATE,
                    entity_id=obj.id,
                    user_id=user_id,
                    after_state=get_entity_state(obj),
                )
            )
