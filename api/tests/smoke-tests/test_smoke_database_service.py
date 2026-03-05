import uuid
import pytest
from app.database import AsyncSessionLocal
from app.db import models
from fastapi import HTTPException
from sqlalchemy import text, select
from sqlalchemy.exc import DBAPIError

pytestmark = [pytest.mark.smoke, pytest.mark.database, pytest.mark.asyncio]


def generate_unique_name(prefix: str):
    """
    Generate random name to avoid unique fields.
    :param prefix: Starting prefix
    :return: Prefix along with random name
    """
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


async def test_database_is_reachable(db_session):
    """
    Test if database is reachable.
    """
    try:
        result = await db_session.execute(text("SELECT 1"))
        assert result.scalar() == 1
    except DBAPIError as e:
        pytest.fail(f"Cannot connect to database. Error: {e}")


async def test_machine_full_lifecycle(db_session):
    """
    Create advanced model object (new Machine).
    Checks relations: Machine -> Room, Machine -> Metadata, Machine -> Shelf.
    Check is listener is registring operations properly
    """

    test_team = models.Teams(name=generate_unique_name("TestTeam"))
    db_session.add(test_team)
    await db_session.commit()
    await db_session.refresh(test_team)

    room = models.Rooms(
        name=generate_unique_name("Room"), 
        room_type="Server", 
        team_id=test_team.id
    )
    db_session.add(room)

    meta = models.Metadata(agent_prometheus=True)
    db_session.add(meta)

    author = models.User(
        name="Test",
        surname="User",
        login=generate_unique_name("User"),
        hashed_password="SecretPassword123!",
        email=f"{generate_unique_name('user')}@labbyn.service",
        user_type=models.UserType.USER,
    )
    db_session.add(author)
    await db_session.flush()
    author_id = author.id

    rack = models.Rack(
        name=generate_unique_name("Rack"),
        room_id=room.id,
        team_id=test_team.id,
    )
    db_session.add(rack)
    await db_session.flush()

    shelf = models.Shelf(name="Shelf-01", rack_id=rack.id, order=1)
    db_session.add(shelf)
    await db_session.flush()

    machine = models.Machines(
        name=generate_unique_name("SmokeMachine"),
        localization_id=room.id,
        metadata_id=meta.id,
        team_id=test_team.id,
        shelf_id=shelf.id,
        cpu="Intel Xeon",
        ram="128GB",
    )
    db_session.add(machine)

    await db_session.commit()
    await db_session.refresh(machine, ["shelf"])

    assert machine.id is not None
    assert machine.shelf.name == "Shelf-01"

    history = (
        (await db_session.execute(
            select(models.History).filter(
                models.History.entity_id == machine.id,
                models.History.entity_type == models.EntityType.MACHINES,
                models.History.action == models.ActionType.CREATE,
            )
        )).scalars().first()
    )

    assert history is not None, "History listener did not record CREATE action."
    assert history.user_id == author_id


async def test_optimistic_locking_protection(db_session):
    """
    Check if optimistic locking protection is working fine.
    Simulate conflict with directly executing SQL query command.
    Try to update with stale object.
    """

    cat_name = generate_unique_name("SmokeCategory")
    category = models.Categories(name=cat_name)
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    
    cat_id = category.id
    assert category.version_id == 1

    async with AsyncSessionLocal() as session_b:
        stmt = select(models.Categories).where(models.Categories.id == cat_id)
        result = await session_b.execute(stmt)
        cat_b = result.scalar_one()
        cat_b.name = f"{cat_name}-UPDATED_BY_B"
        await session_b.commit()

    category.name = f"FAIL-{uuid.uuid4().hex[:8]}"

    with pytest.raises(Exception):
        db_session.add(category)
        await db_session.commit()