"""Smoke tests for Database Listener functionality."""

import pytest
import uuid
from sqlalchemy import select
from app.database import SessionLocal
from app.db import models
import app.db.listeners

def test_full_entity_lifecycle_with_history(db_session, unique_category_name):
    """
    Test full lifecycle of Entity for listener
    1. CREATE -> Check if history logs creating new entity
    2. UPDATE -> Check if history logs updating existing entity
    3. DELETE -> Check if history logs deleting entity
    """
    new_cat = models.Categories(name=unique_category_name)
    db_session.add(new_cat)
    db_session.commit()
    db_session.refresh(new_cat)

    assert new_cat.id is not None
    assert new_cat.version_id == 1

    history_create = db_session.query(models.History).filter(
        models.History.entity_id == new_cat.id,
        models.History.entity_type == models.EntityType.INVENTORY,
        models.History.action == models.ActionType.CREATE
    ).first()

    assert history_create is not None, "No CREATE log in history table"
    assert history_create.after_state['name'] == unique_category_name


    updated_name = f"UPDATED-{unique_category_name}"
    new_cat.name = updated_name
    db_session.commit()
    db_session.refresh(new_cat)

    assert new_cat.version_id == 2
    assert new_cat.name == updated_name

    history_update = db_session.query(models.History).filter(
        models.History.entity_id == new_cat.id,
        models.History.action == models.ActionType.UPDATE
    ).order_by(models.History.timestamp.desc()).first()

    assert history_update is not None, "No UPDATE log in history table"

    changes = history_update.extra_data
    assert 'name' in changes
    assert changes['name']['old'] == unique_category_name
    assert changes['name']['new'] == updated_name

    db_session.delete(new_cat)
    db_session.commit()

    history_delete = db_session.query(models.History).filter(
        models.History.entity_id == new_cat.id,
        models.History.action == models.ActionType.DELETE
    ).first()
    assert history_delete is not None, "No DELETE log in history table"