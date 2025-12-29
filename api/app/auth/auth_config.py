from fastapi import Depends
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

from app.db.models import User, AccessToken
from app.auth.manager import get_user_manager
from app.database import get_db

bearer_transport = BearerTransport(tokenUrl="auth/login")

async def get_access_token_db(session=Depends(get_db)):
    yield SQLAlchemyAccessTokenDatabase(session, AccessToken)

def get_database_strategy(
    access_token_db: SQLAlchemyAccessTokenDatabase = Depends(get_access_token_db),
) -> DatabaseStrategy:
    return DatabaseStrategy(access_token_db, lifetime_seconds=None)

auth_backend = AuthenticationBackend(
    name="database-tokens",
    transport=bearer_transport,
    get_strategy=get_database_strategy,
)

fastapi_users = FastAPIUsers[User, int](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)