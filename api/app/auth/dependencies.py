from fastapi import Depends, HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_config import fastapi_users
from app.db.models import User, UserType, UsersTeams
from app.database import get_async_db

current_active_user = fastapi_users.current_user(active=True)


class RequestContext:
    """
    Holds user + permission context for a request.
    Provides helpers for access control and query filtering.
    """

    def __init__(self, db: AsyncSession = Depends(get_async_db)):
        """
        Init with database session, then call setup() to populate user info.
        :param db: Active database session
        """

        self.db = db

        self.current_user: User | None = None
        self.user_type: UserType | None = None
        self.team_ids: list[int] = []

        self.is_admin = False
        self.is_group_admin = False
        self.is_user = False

    @classmethod
    async def create(
        cls,
        current_user: User = Depends(current_active_user),
        db: AsyncSession = Depends(get_async_db),
    ):
        """
        Factory method to create and setup RequestContext.
        :param: current_user: Authenticated user for the request
        :param: db: Active database session
        :return: RequestContext
        """

        self = cls(db)
        await self._setup(current_user)
        return self

    async def _setup(self, current_user: User):
        """
        Populates user info and permissions based on the current user.
        :param current_user: Authenticated user for the request
        :return: None
        """
        self.current_user = current_user
        self.user_type = current_user.user_type

        stmt = select(UsersTeams.team_id).where(UsersTeams.user_id == current_user.id)

        result = await self.db.execute(stmt)
        self.team_ids = list(result.scalars())

        self.db.info["user_id"] = current_user.id

        self.is_admin = self.user_type == UserType.ADMIN
        self.is_group_admin = self.user_type == UserType.GROUP_ADMIN
        self.is_user = self.user_type == UserType.USER

    @classmethod
    async def for_websocket(cls, user: User, db: AsyncSession):
        """
        Factory method to create RequestContext for WebSocket connections.
        :param user: Authenticated user for the WebSocket connection
        :param db: Active database session
        :return: RequestContext
        """
        self = cls(db)
        await self._setup(user)
        return self

    def team_filter(self, stmt: Select, model_class):
        """
        Applies team filtering to SQLAlchemy Select statements.

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

        if model_class == User:
            return stmt.join(User.teams).where(UsersTeams.team_id.in_(self.team_ids))

        return stmt

    def require_admin(self):
        """Enforces that the current user has admin privileges. Raises HTTP 403 if not."""
        if not self.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required.",
            )

    def require_group_admin(self):
        """Enforces that the current user has group admin privileges. Raises HTTP 403 if not."""
        if not (self.is_admin or self.is_group_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Group admin privileges required.",
            )

    def require_user(self):
        """Enforces that the current user has at least user privileges. Raises HTTP 403 if not."""
        if not (self.is_admin or self.is_group_admin or self.is_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied."
            )
