import os
from typing import Optional

from dotenv import load_dotenv
from fastapi.params import Depends
from fastapi_users import BaseUserManager, IntegerIDMixin, exceptions
from app.db.models import User
from app.database import get_user_db
from sqlalchemy import select

load_dotenv(".env/api.env")
AUTH_SECRET = os.getenv("AUTH_SECRET")


class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = AUTH_SECRET
    verification_token_secret = AUTH_SECRET

    async def get_by_login(self, login: str):
        query = select(User).where(User.login == login)
        result = self.user_db.session.execute(query)
        user = result.scalar_one_or_none()
        if user is None:
            raise exceptions.UserNotExists(f"User {login} not found.")
        return User

    async def authenticate_user(self, credentials, request: None):
        try:
            user = await self.get_by_login(credentials.username)
        except exceptions.UserNotExists:
            self.password_helper.hash(credentials.password)
            return None

        if await self.validate_password(credentials.password, user) and user.is_active:
            return user

        return None

    async def on_after_login(self, user: User, request=None, response=None):
        print(f"User {user.email} logged in.")


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)
