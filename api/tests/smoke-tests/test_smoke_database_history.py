import uuid

import pytest
from app.db import models, schemas
from app.utils import database_service as service
from app.routers.database_history_router import (
    _rollback_create,
    _rollback_delete,
    _rollback_update,
)


def unique_str(prefix: str):
    """
    Generate random name to avoid unique fields.
    :param prefix: Starting prefix
    :return: Prefix along with random name
    """
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


@pytest.mark.smoke
@pytest.mark.database
def test_history_full_cycle_with_rollback(db_session):
    """
    Test full history cycle with rollbacks:
    1. CREATE User -> Check log
    2. UPDATE User -> Check log
    3. DELETE User -> Check log
    4. ROLLBACK DELETE -> Check if user returned
    5. ROLLBACK UPDATE -> Check if user data is back to original state
    6. ROLLBACK CREATE -> Check if user doesn't exist
    """

    admin = service.create_user(
        db_session,
        schemas.UserCreate(
            name="Admin",
            surname="Tester",
            login=unique_str("Admin"),
            password="adminpass",
            user_type=models.UserType.ADMIN,
        ),
    )
    admin_id = admin.id

    unique_login = unique_str("HistoryUser")
    original_email = f"{unique_login}@test.com"

    user = service.create_user(
        db_session,
        schemas.UserCreate(
            name="John",
            surname="Doe",
            login=unique_login,
            password="password123",
            email=original_email,
            user_type=models.UserType.USER,
        ),
    )

    user_id = user.id
    assert user_id is not None

    log_create = (
        db_session.query(models.History)
        .filter(
            models.History.entity_id == user_id,
            models.History.entity_type == models.EntityType.USER,
            models.History.action == models.ActionType.CREATE,
        )
        .first()
    )
    assert log_create is not None, "No Create log found in history"

    new_email = f"updated-{unique_login}@test.com"
    service.update_user(
        db_session,
        user_id,
        schemas.UserUpdate(email=new_email),
        current_user_id=admin_id,
    )

    log_update = (
        db_session.query(models.History)
        .filter(
            models.History.entity_id == user_id,
            models.History.action == models.ActionType.UPDATE,
        )
        .order_by(models.History.timestamp.desc())
        .first()
    )
    assert log_update is not None, "No Update log found in history"
    assert "email" in log_update.extra_data
    assert log_update.extra_data["email"]["new"] == new_email

    service.delete_entity(db_session, models.User, user_id, user_id=admin_id)

    deleted_user = service.get_entity_by_id(db_session, models.User, user_id)
    assert deleted_user is None

    log_delete = (
        db_session.query(models.History)
        .filter(
            models.History.entity_id == user_id,
            models.History.action == models.ActionType.DELETE,
        )
        .first()
    )
    assert log_delete is not None, "No Delete log found in history"
    assert log_delete.before_state["id"] == user_id

    msg = _rollback_delete(models.User, log_delete, db_session)
    db_session.commit()

    restored_user = service.get_entity_by_id(db_session, models.User, user_id)
    assert restored_user is not None, "Rollback DELETE didn't restore the user"
    assert (
        restored_user.id == user_id
    ), f"Wrong ID after restoring expected: {user_id}, get: {restored_user.id}"
    assert (
        restored_user.email == new_email
    ), f"Wrong email after restoring expected: {new_email}, get: {restored_user.email}"

    msg = _rollback_update(models.User, log_update, db_session)
    db_session.commit()
    db_session.refresh(restored_user)

    assert (
        restored_user.email == original_email
    ), "Rollback UPDATE didn't revert email to original"

    msg = _rollback_create(models.User, log_create, db_session)
    db_session.commit()

    final_check = service.get_entity_by_id(db_session, models.User, user_id)
    assert final_check is None, "Rollback CREATE didn't delete the user"
