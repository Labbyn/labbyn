import uuid

import pytest
from sqlalchemy import select
from app.db import models, schemas
from app.utils import database_service as service
from app.routers.database_history_router import (
    _rollback_create,
    _rollback_delete,
    _rollback_update,
)


pytestmark = [pytest.mark.smoke, pytest.mark.database, pytest.mark.asyncio]


def unique_str(prefix: str):
    """
    Generate random name to avoid unique fields.
    :param prefix: Starting prefix
    :return: Prefix along with random name
    """
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


@pytest.mark.database
async def test_history_full_cycle_with_rollback(
    test_client, db_session, service_header
):
    """
    Test full history cycle with rollbacks:
    1. CREATE User -> Check log
    2. UPDATE User -> Check log
    3. DELETE User -> Check log
    4. ROLLBACK DELETE -> Check if user returned
    5. ROLLBACK UPDATE -> Check if user data is back to original state
    6. ROLLBACK CREATE -> Check if user doesn't exist
    """

    team_res = await test_client.post(
        "/db/teams/", json={"name": unique_str("HistoryTeam")}, headers=service_header
    )
    team_ids = team_res.json()["id"]

    user_payload = {
        "name": "John",
        "surname": "Doe",
        "login": unique_str("HistoryUser"),
        "email": f"{unique_str('h')}@test.pl",
        "password": "password123",
        "user_type": "user",
        "team_ids": [team_ids],
    }

    res = await test_client.post(
        "/db/users/", json=user_payload, headers=service_header
    )
    assert res.status_code == 201
    user_id = res.json()["id"]

    db_session.expire_all()

    admin_payload = {
        "name": "Admin",
        "surname": "Tester",
        "login": unique_str("Admin"),
        "email": f"{unique_str('admin')}@labbyn.service",
        "password": "adminpassword123",
        "user_type": "admin",
        "team_ids": [team_ids],
    }
    admin_res = await test_client.post(
        "/db/users/", json=admin_payload, headers=service_header
    )
    assert admin_res.status_code == 201
    admin_id = admin_res.json()["id"]

    unique_login = unique_str("HistoryUser")
    original_email = f"{unique_login}@labbyn.service"

    target_user_payload = {
        "name": "John",
        "surname": "Doe",
        "login": unique_login,
        "password": "password123",
        "email": original_email,
        "user_type": "user",
        "team_ids": [team_ids],
    }
    target_user_res = await test_client.post(
        "/db/users/", json=target_user_payload, headers=service_header
    )
    assert target_user_res.status_code == 201
    user = target_user_res.json()

    user_id = user["id"]
    assert user_id is not None

    db_session.expire_all()

    log_create = (
        (
            await db_session.execute(
                select(models.History).filter(
                    models.History.entity_id == user_id,
                    models.History.entity_type == models.EntityType.USER,
                    models.History.action == models.ActionType.CREATE,
                )
            )
        )
        .scalars()
        .first()
    )
    assert log_create is not None, "No Create log found in history"

    new_email = f"updated-{unique_login}@test.com"
    await test_client.patch(
        f"/db/users/{user_id}", json={"email": new_email}, headers=service_header
    )

    db_session.expire_all()

    log_update = (
        (
            await db_session.execute(
                select(models.History)
                .filter(
                    models.History.entity_id == user_id,
                    models.History.action == models.ActionType.UPDATE,
                )
                .order_by(models.History.timestamp.desc())
            )
        )
        .scalars()
        .first()
    )
    assert log_update is not None, "No Update log found in history"
    assert "email" in log_update.extra_data
    assert log_update.extra_data["email"]["new"] == new_email

    await test_client.delete(f"/db/users/{user_id}", headers=service_header)

    db_session.expire_all()
    deleted_user = await db_session.get(models.User, user_id)
    assert deleted_user is None

    log_delete = (
        (
            await db_session.execute(
                select(models.History).filter(
                    models.History.entity_id == user_id,
                    models.History.action == models.ActionType.DELETE,
                )
            )
        )
        .scalars()
        .first()
    )
    assert log_delete is not None, "No Delete log found in history"
    assert log_delete.before_state["id"] == user_id

    await db_session.refresh(log_delete)
    msg = await _rollback_delete(models.User, log_delete, db_session)
    await db_session.commit()
    db_session.expire_all()
    restored_user = await db_session.get(models.User, user_id)
    assert restored_user is not None, "Rollback DELETE didn't restore the user"
    assert (
        restored_user.id == user_id
    ), f"Wrong ID after restoring expected: {user_id}, get: {restored_user.id}"
    assert (
        restored_user.email == new_email
    ), f"Wrong email after restoring expected: {new_email}, get: {restored_user.email}"

    await db_session.refresh(log_update)
    msg = await _rollback_update(models.User, log_update, db_session)
    await db_session.commit()
    await db_session.refresh(restored_user)

    assert (
        restored_user.email == original_email
    ), "Rollback UPDATE didn't revert email to original"

    await db_session.refresh(log_create)
    msg = await _rollback_create(models.User, log_create, db_session)
    await db_session.commit()

    final_check = await db_session.get(models.User, user_id)
    assert final_check is None, "Rollback CREATE didn't delete the user"
