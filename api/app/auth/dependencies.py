from fastapi import Depends, HTTPException, status
from app.auth.auth_config import fastapi_users
from sqlalchemy.orm import Query, Session
from app.db.models import User, UserType, UsersTeams
from app.database import get_db

current_active_user = fastapi_users.current_user(active=True)


class RequestContext:
    def __init__(
        self,
        current_user: User = Depends(current_active_user),
        db: Session = Depends(get_db),
    ):
        self.db = db
        self._setup(current_user)

    def _setup(self, current_user: User):
        self.current_user = current_user
        self.user_type = current_user.user_type
        self.team_ids = [
            row[0]
            for row in self.db.query(UsersTeams.team_id)
            .filter(UsersTeams.user_id == current_user.id)
            .all()
        ]

        self.db.info["user_id"] = current_user.id

        self.is_admin = self.user_type == UserType.ADMIN
        self.is_group_admin = self.user_type == UserType.GROUP_ADMIN
        self.is_user = self.user_type == UserType.USER

    @classmethod
    async def for_websocket(cls, user: User):
        instance = cls.__new__(cls)
        instance._setup(user)
        return instance

    def team_filter(self, query: Query, model_class):
        if self.is_admin:
            return query
        if not self.team_ids:
            return query.filter(False)
        if hasattr(model_class, "team_id"):
            return query.filter(model_class.team_id.in_(self.team_ids))
        if model_class == User:
            return query.join(User.teams).filter(UsersTeams.team_id.in_(self.team_ids))

        return query

    def require_admin(self):
        if not self.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required.",
            )

    def require_group_admin(self):
        if not (self.is_admin or self.is_group_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Group admin privileges required.",
            )

    def require_user(self):
        if not (self.is_admin or self.is_group_admin or self.is_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied."
            )
