"""
Database service layer.

Handles CRUD operations, transaction management, password hashing (placeholder),
and optimistic locking handling using SQLAlchemy sessions.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Type

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError
from app.utils.security import hash_password
from app.db import schemas
from app.db import models

# pylint: disable=unused-import
import app.db.listeners
import inspect

from app.auth.dependencies import RequestContext


# ==========================
#          UTILS
# ==========================


def set_user_context(db: Session, user_id: Optional[int] = None):
    """
    Injects user ID into the database session info.
    :param db: The current database session.
    :param user_id: The ID of the user performing the action (optional).
    """
    if user_id:
        db.info["user_id"] = user_id


def handle_commit(db: Session):
    """
    Commits the transaction handling Optimistic Locking.
    :param db: The current database session.
    :raises HTTPException: 409 Conflict if concurrent modification is detected.
    """
    try:
        db.commit()
    except StaleDataError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This entity is being modified by another user. Try again.",
        ) from exc


def init_service_team(db: Session):
    """
    Initializes a default service team if none exists.
    :param db: The current database session.
    """
    service_team = (
        db.query(models.Teams).filter(models.Teams.name == "Service Team").first()
    )
    if not service_team:
        service_team = models.Teams(name="Service Team")
        db.add(service_team)
        db.commit()
        db.refresh(service_team)
    return service_team

def init_super_user(db: Session):
    """
    Initializes a super user if none exists.
    :param db: The current database session.
    """
    service_team = init_service_team(db)

    super_user = db.query(models.User).filter(models.User.login == "Service").first()
    if not super_user:
        admin_user = models.User(
            login="Service",
            name="Service Account",
            surname="System",
            email="service@labbyn.service",
            hashed_password=hash_password("Service"),
            user_type=models.UserType.ADMIN,
            is_active=True,
            is_superuser=True,
            is_verified=True,
            force_password_change=False,  # For development purposes only
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        super_user = admin_user
        link = (
            db.query(models.UsersTeams)
            .filter_by(user_id=super_user.id, team_id=service_team.id)
            .first()
        )

        if not link:
            db.add(
                models.UsersTeams(
                    user_id=super_user.id, team_id=service_team.id, is_group_admin=True
                )
            )
            db.commit()


def init_virtual_lab(db: Session):
    """
    Initializes virtual lab if none exists.
    :param db: The current database session.
    """
    service_team = init_service_team(db)

    virtual_lab = (
        db.query(models.Rooms)
        .filter(models.Rooms.name == "virtual", models.Rooms.team_id == service_team.id)
        .first()
    )

    if not virtual_lab:
        virtual_lab = models.Rooms(
            name="virtual", room_type="virtual", team_id=service_team.id
        )
        db.add(virtual_lab)
        db.commit()
        db.refresh(virtual_lab)


def init_document(db: Session):
    """
    Initializes document that contains app documentation.
    :param db: The current database session.
    """

    labbyn_docs = (
        db.query(models.Documentation)
        .filter(models.Documentation.title == "labbyn")
        .first()
    )
    if not labbyn_docs:
        content_raw = """
                # Labbyn

                Labbyn is an application for your datacenter, laboratory or homelab. You can monitor your infrastructure, set the location of each server or platform on an interactive dashboard, store information about your assets in an inventory and more. Everything runs on a modern GUI, is deployable on most Linux machines and is **OPEN SOURCE**.

                ## Installation

                To install you only need docker  and docker compose.
                Example of Debian installation:
                ```bash
                apt update
                apt upgrade
                apt install docker.io docker-compose
                apt install -y docker-compose-plugin
                ```
                ### Application script

                Inside the `scripts` directory there is an `app.sh` script that can be used to manage your application.

                #### Arguments:
                - `deploy` - start/install app on your machine
                - `update` - rebuild application if nesscesary
                - `stop` - stop application container
                - `delete` - delete application
                - `--dev` - run application in development mode
                > [!IMPORTANT]
                > **If you use the `delete` argument entire application will be deleted including containers, images, volumes and networks**

                ### Example:

                Start/Install application

                ```bash
                ./app.sh deploy
                ```

                Stop application

                ```bash
                ./app.sh stop
                ```

                Start application in developement mode:
                ```bash
                ./app.sh deploy --dev
                ```

                **PJATK 2025**:
                s26990, s26985, s27081, s27549
                """

        labbyn_docs = models.Documentation(
            title="labbyn",
            author="anonymous admin",
            content=inspect.cleandoc(content_raw),
        )
        db.add(labbyn_docs)
        db.commit()
        db.refresh(labbyn_docs)


def resolve_target_team_id(ctx: RequestContext, team_id: Optional[int] = None):
    """
    Resolve the target team ID based on the request context and optional team_id parameter.
    :param ctx: User request context containing user and team information
    :param team_id: Team ID provided in the request (optional)
    :return: Target team ID to be used for filtering or assignment
    """
    if ctx.is_admin:
        return team_id
    if not ctx.team_ids:
        raise HTTPException(status_code=400, detail="User does not belong to any team")
    if team_id:
        if team_id not in ctx.team_ids:
            raise HTTPException(
                status_code=403, detail="Access to specified team is denied"
            )
        return team_id
    if len(ctx.team_ids) > 1:
        raise HTTPException(
            status_code=400,
            detail="Multiple teams found for user, team_id parameter is required",
        )
    return ctx.team_ids[0]


# ==========================
#  GENERIC TABLES OPERATIONS
# ==========================


def get_entity_by_id(db: Session, model: Type[models.Base], entity_id: int):
    """
    Generic function to retrieve a single entity by its ID.

    :param db: Database session.
    :param model: The SQLAlchemy model class (e.g., models.Machines).
    :param entity_id: The primary key of the entity.
    :return: The entity instance or None if not found.
    """
    return db.query(model).filter(model.id == entity_id).first()


def get_all_entites(
    db: Session, model: Type[models.Base], skip: int = 0, limit: int = 100
):
    """
    Generic function to retrieve a list of entities with pagination.

    :param db: Database session.
    :param model: The SQLAlchemy model class.
    :param skip: Number of records to skip (offset).
    :param limit: Maximum number of records to return.
    :return: A list of entity instances.
    """
    return db.query(model).offset(skip).limit(limit).all()


def delete_entity(
    db: Session,
    model: Type[models.Base],
    entity_id: int,
    user_id: Optional[int] = None,
):
    """
    Generic function to delete an entity by its ID.

    :param db: Database session.
    :param model: The SQLAlchemy model class.
    :param entity_id: The primary key of the entity to delete.
    :param user_id: ID of the user performing the deletion (for history log).
    :return: The deleted entity instance or None if it didn't exist.
    """
    set_user_context(db, user_id)
    obj = get_entity_by_id(db, model, entity_id)
    if obj:
        db.delete(obj)
        handle_commit(db)
    return obj


# ==========================
#  MACHINES TABLE OPERATIONS
# ==========================


def create_machine(
    db: Session, machine: schemas.MachinesCreate, user_id: Optional[int] = None
):
    """
    Creates a new machine record in the database.

    :param db: Database session.
    :param machine: Pydantic schema containing machine data.
    :param user_id: ID of the user creating the machine.
    :return: The newly created machine instance.
    """
    set_user_context(db, user_id)

    db_obj = models.Machines(**machine.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_machine(
    db: Session,
    machine_id: int,
    machine_update: schemas.MachinesUpdate,
    user_id: Optional[int] = None,
):
    """
    Updates an existing machine record.

    :param db: Database session.
    :param machine_id: ID of the machine to update.
    :param machine_update: Pydantic schema with fields to update.
    :param user_id: ID of the user updating the machine.
    :return: The updated machine instance or None if not found.
    """
    set_user_context(db, user_id)

    db_obj = get_entity_by_id(db, models.Machines, machine_id)
    if not db_obj:
        return None

    update_data = machine_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)

    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  INVENTORY TABLE OPERATIONS
# ==========================


def create_inventory(
    db: Session, item: schemas.InventoryCreate, user_id: Optional[int] = None
):
    """
    Creates a new inventory item.

    :param db: Database session.
    :param item: Pydantic schema containing inventory item data.
    :param user_id: ID of the user creating the item.
    :return: The newly created inventory item instance.
    """
    set_user_context(db, user_id)

    db_obj = models.Inventory(**item.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_inventory(
    db: Session,
    item_id: int,
    item_update: schemas.InventoryUpdate,
    user_id: Optional[int] = None,
):
    """
    Updates an existing inventory item.

    :param db: Database session.
    :param item_id: ID of the item to update.
    :param item_update: Pydantic schema with fields to update.
    :param user_id: ID of the user updating the item.
    :return: The updated inventory item instance or None if not found.
    """
    set_user_context(db, user_id)

    db_obj = get_entity_by_id(db, models.Inventory, item_id)
    if not db_obj:
        return None

    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)

    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  USERS TABLE OPERATIONS
# ==========================


def create_user(db: Session, user: schemas.UserCreate):
    """
    Creates a new user. Hashes the password before saving.

    :param db: Database session.
    :param user: Pydantic schema containing user data (including password).
    :return: The newly created user instance.
    """
    if db.query(models.User).filter(models.User.login == user.login).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Login already exists."
        )
    user_data = user.model_dump(exclude={"password"})
    hashed_pw = hash_password(user.password)

    db_obj = models.User(**user_data, hashed_password=hashed_pw)

    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_user(
    db: Session,
    user_id: int,
    user_update: schemas.UserUpdate,
    current_user_id: Optional[int] = None,
):
    """
    Updates an existing user. Hashes the password if it's being updated.

    :param db: Database session.
    :param user_id: ID of the user to update.
    :param user_update: Pydantic schema with fields to update.
    :param current_user_id: ID of the admin/user performing the update.
    :return: The updated user instance or None if not found.
    """
    set_user_context(db, current_user_id)

    db_obj = get_entity_by_id(db, models.User, user_id)
    if not db_obj:
        return None

    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data:
        plain_password = update_data.pop("password")
        update_data["hashed_password"] = hash_password(plain_password)

    for key, value in update_data.items():
        setattr(db_obj, key, value)

    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  LAYOUT TABLE OPERATIONS
# ==========================


def create_layout(db: Session, layout: schemas.LayoutCreate):
    """
    Creates a new layout coordinate entry.

    :param db: Database session.
    :param layout: Pydantic schema containing layout coordinates.
    :return: The newly created layout instance.
    """
    db_obj = models.Layout(**layout.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_layout(db: Session, layout_id: int, layout_update: schemas.LayoutUpdate):
    """
    Updates an existing layout coordinate entry.

    :param db: Database session.
    :param layout_id: ID of the layout to update.
    :param layout_update: Pydantic schema with fields to update.
    :return: The updated layout instance or None if not found.
    """
    db_obj = get_entity_by_id(db, models.Layout, layout_id)
    if not db_obj:
        return None

    for key, value in layout_update.model_dump(exclude_unset=True).items():
        setattr(db_obj, key, value)

    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  ROOMS TABLE OPERATIONS
# ==========================


def create_room(db: Session, room: schemas.RoomsCreate):
    """
    Creates a new room.

    :param db: Database session.
    :param room: Pydantic schema containing room data.
    :return: The newly created room instance.
    """
    data = room.model_dump()
    tag_ids = data.pop("tag_ids", [])

    db_obj = models.Rooms(**data)

    if tag_ids:
        tags = db.query(models.Tags).filter(models.Tags.id.in_(tag_ids)).all()
        db_obj.tags = tags

    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_room(db: Session, room_id: int, room_update: schemas.RoomsUpdate):
    """
    Updates an existing room.

    :param db: Database session.
    :param room_id: ID of the room to update.
    :param room_update: Pydantic schema with fields to update.
    :return: The updated room instance or None if not found.
    """
    db_obj = get_entity_by_id(db, models.Rooms, room_id)
    if not db_obj:
        return None

    update_data = room_update.model_dump(exclude_unset=True)

    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        if tag_ids is not None:
            tags = db.query(models.Tags).filter(models.Tags.id.in_(tag_ids)).all()
            db_obj.tags = tags

    for key, value in update_data.items():
        setattr(db_obj, key, value)

    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  METADATA TABLE OPERATIONS
# ==========================


def create_metadata(db: Session, meta: schemas.MetadataCreate):
    """
    Creates a new metadata record.

    :param db: Database session.
    :param meta: Pydantic schema containing metadata.
    :return: The newly created metadata instance.
    """
    db_obj = models.Metadata(**meta.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_metadata(db: Session, meta_id: int, meta_update: schemas.MetadataUpdate):
    """
    Updates an existing metadata record.

    :param db: Database session.
    :param meta_id: ID of the metadata record to update.
    :param meta_update: Pydantic schema with fields to update.
    :return: The updated metadata instance or None if not found.
    """
    db_obj = get_entity_by_id(db, models.Metadata, meta_id)
    if not db_obj:
        return None

    for key, value in meta_update.model_dump(exclude_unset=True).items():
        setattr(db_obj, key, value)

    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  TEAMS TABLE OPERATIONS
# ==========================


def create_team(db: Session, team: schemas.TeamsCreate):
    """
    Creates a new team.

    :param db: Database session.
    :param team: Pydantic schema containing team data.
    :return: The newly created team instance.
    """
    db_obj = models.Teams(**team.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_team(db: Session, team_id: int, team_update: schemas.TeamsUpdate):
    """
    Updates an existing team.

    :param db: Database session.
    :param team_id: ID of the team to update.
    :param team_update: Pydantic schema with fields to update.
    :return: The updated team instance or None if not found.
    """
    db_obj = get_entity_by_id(db, models.Teams, team_id)
    if not db_obj:
        return None
    for key, value in team_update.model_dump(exclude_unset=True).items():
        setattr(db_obj, key, value)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  CATEGORY TABLE OPERATIONS
# ==========================


def create_category(db: Session, category: schemas.CategoriesCreate):
    """
    Creates a new inventory category.

    :param db: Database session.
    :param category: Pydantic schema containing category data.
    :return: The newly created category instance.
    """
    db_obj = models.Categories(**category.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_category(db: Session, cat_id: int, cat_update: schemas.CategoriesUpdate):
    """
    Updates an existing category.

    :param db: Database session.
    :param cat_id: ID of the category to update.
    :param cat_update: Pydantic schema with fields to update.
    :return: The updated category instance or None if not found.
    """
    db_obj = get_entity_by_id(db, models.Categories, cat_id)
    if not db_obj:
        return None
    for key, value in cat_update.model_dump(exclude_unset=True).items():
        setattr(db_obj, key, value)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  RENTALS TABLE OPERATIONS
# ==========================


def create_rental(
    db: Session, rental: schemas.RentalsCreate, user_id: Optional[int] = None
):
    """
    Creates a new rental record.

    :param db: Database session.
    :param rental: Pydantic schema containing rental data.
    :param user_id: ID of the user/admin creating the record (optional context).
    :return: The newly created rental instance.
    """
    set_user_context(db, user_id)
    db_obj = models.Rentals(**rental.model_dump())
    db.add(db_obj)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


def update_rental(
    db: Session,
    rental_id: int,
    rental_update: schemas.RentalsUpdate,
    user_id: Optional[int] = None,
):
    """
    Updates an existing rental record.

    :param db: Database session.
    :param rental_id: ID of the rental to update.
    :param rental_update: Pydantic schema with fields to update.
    :param user_id: ID of the user/admin updating the record (optional context).
    :return: The updated rental instance or None if not found.
    """
    set_user_context(db, user_id)
    db_obj = get_entity_by_id(db, models.Rentals, rental_id)
    if not db_obj:
        return None
    for key, value in rental_update.model_dump(exclude_unset=True).items():
        setattr(db_obj, key, value)
    handle_commit(db)
    db.refresh(db_obj)
    return db_obj


# ==========================
#  HISTORY TABLE MAINTANCE
# ==========================


def delete_old_history_logs(db: Session, days: int = 3) -> int:
    """
    Deletes history log entries older than a specified number of days.

    This function bypasses ORM session handling for performance (synchronize_session=False).

    :param db: Database session.
    :param days: Retention period in days (default 3).
    :return: Number of deleted history rows.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    deleted = (
        db.query(models.History)
        .filter(models.History.timestamp < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted
