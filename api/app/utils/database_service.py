"""
Database service layer.

Handles CRUD operations, transaction management, password hashing (placeholder),
and optimistic locking handling using SQLAlchemy sessions.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Type

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
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


async def init_service_team(db: AsyncSession):
    """
    Initializes a default service team if none exists.
    :param db: The current database session.
    """
    stmt = select(models.Teams).filter(models.Teams.name == "Service Team")
    result = await db.execute(stmt)
    service_team = result.scalar_one_or_none()

    if not service_team:
        service_team = models.Teams(name="Service Team")
        db.add(service_team)
        await db.commit()
        await db.refresh(service_team)
    return service_team


async def init_super_user(db: AsyncSession):
    """
    Initializes a super user if none exists.
    :param db: The current database session.
    """
    service_team = await init_service_team(db)

    stmt = select(models.User).filter(models.User.login == "Service")
    result = await db.execute(stmt)
    super_user = result.scalar_one_or_none()

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
            force_password_change=False,
        )
        db.add(admin_user)
        await db.flush()

        super_user = admin_user

        link_stmt = select(models.UsersTeams).filter_by(
            user_id=super_user.id, team_id=service_team.id
        )
        link_res = await db.execute(link_stmt)
        if not link_res.scalar_one_or_none():
            db.add(
                models.UsersTeams(
                    user_id=super_user.id, team_id=service_team.id, is_group_admin=True
                )
            )
        await db.commit()


async def init_virtual_lab(db: AsyncSession):
    """
    Initializes virtual lab if none exists.
    :param db: The current database session.
    """
    service_team = await init_service_team(db)

    stmt = select(models.Rooms).filter(
        models.Rooms.name == "virtual", models.Rooms.team_id == service_team.id
    )
    result = await db.execute(stmt)

    if not result.scalar_one_or_none():
        virtual_lab = models.Rooms(
            name="virtual", room_type="virtual", team_id=service_team.id
        )
        db.add(virtual_lab)
        await db.commit()


async def init_document(db: AsyncSession):
    """
    Initializes document that contains app documentation.
    :param db: The current database session.
    """

    stmt = select(models.Documentation).filter(models.Documentation.title == "labbyn")
    result = await db.execute(stmt)

    if not result.scalar_one_or_none():
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
        await db.commit()


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
#  HISTORY TABLE MAINTANCE
# ==========================


async def delete_old_history_logs(db: AsyncSession, days: int = 3) -> int:
    """
    Deletes history log entries older than a specified number of days.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = delete(models.History).where(models.History.timestamp < cutoff)

    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
