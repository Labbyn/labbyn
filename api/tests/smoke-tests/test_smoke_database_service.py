"""
Backend Smoke Tests.
These tests verify that the core service logic, database connections,
and critical mechanisms (History, Locking) are operational.
"""

import uuid

# pylint: disable=unused-import
import app.db.listeners
import pytest
from app.database import SessionLocal
from app.db import models, schemas
from app.utils import database_service as service
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

pytestmark = [pytest.mark.smoke, pytest.mark.database]


def generate_unique_name(prefix: str):
    """
    Generate random name to avoid unique fields.
    :param prefix: Starting prefix
    :return: Prefix along with random name
    """
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def test_database_is_reachable(db_session):
    """
    Test if database is reachable.
    """
    try:
        result = db_session.execute(text("SELECT 1"))
        assert result.scalar() == 1
    except DBAPIError as e:
        pytest.fail(f"Cannot connect to database. Error: {e}")


def test_machine_full_lifecycle(db_session):
    """
    Create advanced model object (new Machine).
    Checks relations: Machine -> Room, Machine -> Metadata, Machine -> Shelf.
    Check is listener is registring operations properly
    """

    room = service.create_room(
        db_session,
        schemas.RoomsCreate(name=generate_unique_name("Room"), room_type="Server"),
    )
    meta = service.create_metadata(
        db_session, schemas.MetadataCreate(agent_prometheus=True)
    )

    author = service.create_user(
        db_session,
        schemas.UserCreate(
            name="Test",
            surname="User",
            login=generate_unique_name("User"),
            password="SecretPassword123!",
            email=f"{generate_unique_name('user')}@labbyn.service",
            user_type="user",
        ),
    )
    author_id = author.id

    rack = models.Rack(
        name=generate_unique_name("Rack"),
        room_id=room.id,
        layout_id=None
    )
    db_session.add(rack)
    db_session.flush()

    shelf = models.Shelf(name="Shelf-01", rack_id=rack.id, order=1)
    db_session.add(shelf)
    db_session.flush()

    machine_name = generate_unique_name("SmokeMachine")
    machine = service.create_machine(
        db_session,
        schemas.MachinesCreate(
            name=machine_name,
            localization_id=room.id,
            metadata_id=meta.id,
            shelf_id = shelf.id,
            cpu="Intel Xeon",
            ram="128GB",
        ),
        user_id=author_id,
    )

    assert machine.id is not None

    db_session.commit()

    assert machine.shelf.name == "Shelf-01"

    history = (
        db_session.query(models.History)
        .filter(
            models.History.entity_id == machine.id,
            models.History.entity_type == models.EntityType.MACHINES,
            models.History.action == models.ActionType.CREATE,
        )
        .first()
    )

    assert history is not None, "History listener did not record CREATE action."
    assert history.user_id == author_id


def test_optimistic_locking_protection(db_session):
    """
    Check if optimistic locking protection is working fine.
    Simulate conflict with directly executing SQL query command.
    Try to update with stale object.
    """

    cat_name = generate_unique_name("SmokeCategory")
    category = service.create_category(
        db_session, schemas.CategoriesCreate(name=cat_name)
    )
    cat_id = category.id

    assert category.version_id == 1

    session_b = SessionLocal()
    try:
        # pylint: disable=unused-variable
        cat_b = service.get_entity_by_id(session_b, models.Categories, cat_id)
        service.update_category(
            session_b, cat_id, schemas.CategoriesUpdate(name=f"{cat_name}-UPDATED_BY_B")
        )
    finally:
        session_b.close()

    category.name = f"FAIL-{uuid.uuid4().hex[:8]}"

    with pytest.raises(HTTPException) as excinfo:
        db_session.add(category)
        service.handle_commit(db_session)

    assert excinfo.value.status_code == 409
