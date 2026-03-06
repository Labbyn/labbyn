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
