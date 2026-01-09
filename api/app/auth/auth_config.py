"""Authentication configuration using database tokens."""

from fastapi import Depends
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

from app.db.models import User
from app.auth.manager import get_user_manager

from app.database import get_access_token_db

bearer_transport = BearerTransport(tokenUrl="auth/login")


def get_database_strategy(
    access_token_db: SQLAlchemyAccessTokenDatabase = Depends(get_access_token_db),
) -> DatabaseStrategy:
    """
    Create a database strategy for authentication.
    :param access_token_db: access token database dependency
    :return: DatabaseStrategy instance
    """
    return DatabaseStrategy(access_token_db, lifetime_seconds=None)


auth_backend = AuthenticationBackend(
    name="database-tokens",
    transport=bearer_transport,
    get_strategy=get_database_strategy,
)

fastapi_users = FastAPIUsers[User, int](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
