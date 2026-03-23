"""Configuration of team and role filtering access."""

from fastapi import Depends
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import auth_config
from app.core import exceptions
from app.database import get_async_db
from app.db import models

current_active_user = auth_config.fastapi_users.current_user(active=True)


class RequestContext:
    """Holds user + permission context for a request.

    Provides helpers for access control and query filtering.
    """

    def __init__(self, db: AsyncSession = Depends(get_async_db)):
        """Init with database session, then call setup() to populate user info.

        :param db: Active database session
        """
        self.db = db

        self.current_user: models.User | None = None
        self.user_type: models.UserType | None = None
        self.team_ids: list[int] = []

        self.is_admin = False
        self.is_group_admin = False
        self.is_user = False

    @classmethod
    async def create(
        cls,
        current_user: models.User = Depends(current_active_user),
        db: AsyncSession = Depends(get_async_db),
    ):
        """Factory method to create and setup RequestContext.

        :param: current_user: Authenticated user for the request
        :param: db: Active database session
        :return: RequestContext
        """
        self = cls(db)
        await self._setup(current_user)
        return self

    async def _setup(self, current_user: models.User):
        """Populates user info and permissions based on the current user.

        :param current_user: Authenticated user for the request
        :return: None
        """
        self.current_user = current_user
        self.user_type = current_user.user_type

        stmt = sql.select(models.UsersTeams.team_id).where(
            models.UsersTeams.user_id == current_user.id
        )

        result = await self.db.execute(stmt)
        self.team_ids = list(result.scalars())

        self.db.info["user_id"] = current_user.id

        self.is_admin = self.user_type == models.UserType.ADMIN
        self.is_group_admin = self.user_type == models.UserType.GROUP_ADMIN
        self.is_user = self.user_type == models.UserType.USER

    @classmethod
    async def for_websocket(cls, user: models.User, db: AsyncSession):
        """Factory method to create RequestContext for WebSocket connections.

        :param user: Authenticated user for the WebSocket connection
        :param db: Active database session
        :return: RequestContext
        """
        self = cls(db)
        await self._setup(user)
        return self

    def team_filter(self, stmt: sql.Select, model_class):
        """Applies team filtering to SQLAlchemy Select statements.

        If the user is an admin, no filtering is applied.
        If the model has a team_id field, it filters by the user's team_ids.
        If the model is User, it joins with UsersTeams to filter by team_ids.

        :param stmt: SQLAlchemy Select statement to modify
        :param model_class: SQLAlchemy model class being queried
        :return: Modified Select statement with appropriate team filtering applied
        """
        if self.is_admin:
            return stmt

        if not self.team_ids:
            return stmt.where(False)

        if hasattr(model_class, "team_id"):
            return stmt.where(model_class.team_id.in_(self.team_ids))

        if model_class == models.User:
            return stmt.join(models.User.teams).where(
                models.UsersTeams.team_id.in_(self.team_ids)
            )

        return stmt

    def require_admin(self):
        """Enforces that the current user has admin privileges.

        Raises AccessDeniedError if not.
        """
        if not self.is_admin:
            raise exceptions.AccessDeniedError("Admin privileges required")

    def require_group_admin(self):
        """Enforces that the current user has group admin privileges.

        Raises AccessDeniedError if not.
        """
        if not (self.is_admin or self.is_group_admin):
            raise exceptions.AccessDeniedError("Group Admin privileges required")

    def require_user(self):
        """Enforces that the current user has at least user privileges.

        Raises AccessDeniedError if not.
        """
        if not (self.is_admin or self.is_group_admin or self.is_user):
            raise exceptions.AccessDeniedError("Access denied")

    async def validate_team_access(self, team_id: int):
        """Validate if user has access to team-restricted resources.

        :param team_id: Team Id
        :return: AccessDenied error
        """
        if self.is_admin:
            return

        if team_id not in self.team_ids:
            stmt = sql.select(models.Teams.name).where(models.Teams.id == team_id)
            result = await self.db.execute(stmt)
            team_name = result.scalar_one_or_none()

            if not team_name:
                raise exceptions.ObjectNotFoundError("Team")

            raise exceptions.AccessDeniedError(
                f"Insufficient permissions " f"to manage items for team '{team_name}'"
            )
