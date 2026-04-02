"""Database listeners for History logging."""

import json
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from sqlalchemy import event, inspect, orm, exc

from app.db import models


def json_serializer(obj: Any):
    """Converts datatetime and date objects to strings.

    :param obj: object to serialize
    :return: JSON-serializable string representation
    """
    if obj is None:
        return None
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value

    if isinstance(obj, (list, set)):
        return [json_serializer(item) for item in obj]

    if hasattr(obj, "__tablename__"):
        return getattr(obj, "name", getattr(obj, "id", str(obj)))

    if isinstance(obj, (int, float, bool)):
        return obj

    return str(obj)


def get_entity_state(obj: Any):
    """Retrieve current state of SQLAlchemy Entity.

    :param obj: SQLAlchemy model instance
    :return: Dictionary representing entity's state
    """
    state = {}
    try:
        mapper = inspect(obj).mapper
        for col in mapper.column_attrs:
            state[col.key] = getattr(obj, col.key)
    except exc.NoInspectionAvailable:
        pass
    return json.loads(json.dumps(state, default=json_serializer))


def identify_entity_type(obj: Any):
    """Robust identification of entity type based on its mapped table name.

    :param obj: SQLAlchemy model instance
    :return: Corresponding EntityType member or None
    """
    try:
        table_name = inspect(obj).mapper.persist_selectable.name
    except exc.NoInspectionAvailable:
        table_name = getattr(obj, "__tablename__", None)

    if not table_name:
        return None

    mapping = {
        "machines": models.EntityType.MACHINES,
        "inventory": models.EntityType.INVENTORY,
        "rooms": models.EntityType.ROOM,
        "user": models.EntityType.USER,
        "categories": models.EntityType.CATEGORIES,
    }

    result = mapping.get(table_name)

    return result


# pylint: disable=unused-argument
@event.listens_for(orm.Session, "before_flush")
def receive_before_flush(
    session: orm.Session, flush_context: orm.UOWTransaction, instances: Optional[Any]
):
    """SQLAlchemy session listener triggered before data is flushed to database.

    This function handles logging for **UPDATE** and **DELETE** actions,
    as it requires access to the *old* state of dirty and deleted objects
    before the database transaction commits the changes.

    - **UPDATE** logs: Compares current and previous values to record specific
        field changes.
    - **DELETE** logs: Captures the full state of the object *before* deletion.
    - **CREATE** (preparatory): Stores new objects in `session.info` for later
      processing in `after_flush`, where the `entity_id` will be available.

    :param session: Current SQLAlchemy Session object
    :param flush_context: Unit of work transaction context
    :param instances: Optional argument
    :return: None
    """
    user_id = session.info.get("user_id", 1)
    objects_to_create = session.info.setdefault("objects_to_create_history", [])
    for obj in session.new:
        if isinstance(obj, models.History):
            continue
        if identify_entity_type(obj):
            objects_to_create.append(obj)

    for obj in session.dirty:
        if isinstance(obj, models.History):
            continue
        entity_type = identify_entity_type(obj)
        if not entity_type:
            continue

        changes = {}
        before_dict = {}
        after_dict = {}

        can_rollback = True
        has_changes = False

        state = inspect(obj)
        mapper = state.mapper

        for attr in state.attrs:
            hist = attr.history

            if attr.key not in mapper.column_attrs:
                if hist.has_changes():
                    can_rollback = False
                    has_changes = True

                    before_dict[attr.key] = (
                        [json_serializer(x) for x in hist.deleted]
                        if hist.deleted
                        else []
                    )
                    after_dict[attr.key] = (
                        [json_serializer(x) for x in hist.added] if hist.added else []
                    )
                continue

            current_val = getattr(obj, attr.key)
            original_val = hist.deleted[0] if hist.deleted else current_val

            before_dict[attr.key] = original_val
            after_dict[attr.key] = current_val

            if hist.has_changes() and attr.key != "version_id":
                has_changes = True
                changes[attr.key] = {
                    "old": original_val,
                    "new": current_val,
                }

        if has_changes:

            before_json = json.loads(json.dumps(before_dict, default=json_serializer))
            after_json = json.loads(json.dumps(after_dict, default=json_serializer))
            extra_json = json.loads(json.dumps(changes, default=json_serializer))

            session.add(
                models.History(
                    entity_type=entity_type,
                    action=models.ActionType.UPDATE,
                    entity_id=obj.id,
                    before_state=before_json,
                    after_state=after_json,
                    user_id=user_id,
                    extra_data=extra_json,
                    can_rollback=can_rollback,
                )
            )

    for obj in session.deleted:
        if isinstance(obj, models.History):
            continue
        entity_type = identify_entity_type(obj)
        if not entity_type:
            continue

        session.add(
            models.History(
                entity_type=entity_type,
                action=models.ActionType.DELETE,
                entity_id=obj.id,
                user_id=user_id,
                before_state=get_entity_state(obj),
                can_rollback=True,
            )
        )


# pylint: disable=unused-argument
@event.listens_for(orm.Session, "after_flush")
def receive_after_flush(session: orm.Session, flush_context: orm.UOWTransaction):
    """SQLAlchemy session listener triggered after data is flushed to database.

    This function is primarily used to handle logging for **CREATE** actions,
    as the primary key (`entity_id`) of the newly created objects is now available.

    :param session: Current SQLAlchemy Session object
    :param flush_context: Unit of work transaction context
    :return: None
    """
    user_id = session.info.get("user_id", 1)

    objects = session.info.pop("objects_to_create_history", [])
    if not objects:
        return

    for obj in objects:
        if obj.id is None:
            continue

        entity_type = identify_entity_type(obj)
        if entity_type:
            session.add(
                models.History(
                    entity_type=entity_type,
                    action=models.ActionType.CREATE,
                    entity_id=obj.id,
                    user_id=user_id,
                    after_state=get_entity_state(obj),
                )
            )
