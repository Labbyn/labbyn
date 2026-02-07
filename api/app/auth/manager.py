"""User manager module for handling user authentication and management."""

import os

from dotenv import load_dotenv
from fastapi.params import Depends
from fastapi_users import BaseUserManager, IntegerIDMixin, exceptions
from app.db.models import User
from app.database import get_user_db
from sqlalchemy import select

load_dotenv(".env/api.env")
AUTH_SECRET = os.getenv("AUTH_SECRET")


class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    """Custom user manager for handling user authentication and management."""

    reset_password_token_secret = AUTH_SECRET
    verification_token_secret = AUTH_SECRET

    async def get_by_login(self, login: str):
        """Retrieve a user by their login.
        :param login: The login of the user to retrieve.
        :return: The User instance if found.
        """
        query = select(User).where(User.login == login)
        result = await self.user_db.session.execute(query)
        user = result.scalar_one_or_none()
        if user is None:
            raise exceptions.UserNotExists(f"User {login} not found.")
        return user

    async def authenticate(self, credentials):
        """Authenticate a user with given credentials.
        :param credentials: The credentials to authenticate.
        :return: The authenticated User instance or None if authentication fails.
        """
        try:
            user = await self.get_by_login(credentials.username)
        except exceptions.UserNotExists:
            self.password_helper.hash(credentials.password)
            return None

        verified, _ = self.password_helper.verify_and_update(
            credentials.password, user.hashed_password
        )
        if not verified or not user.is_active:
            return None

        return user


async def get_user_manager(user_db=Depends(get_user_db)):
    """Dependency generator that yields a UserManager instance.
    :param user_db: Database dependency instance.
    :return: UserManager instance.
    """
    yield UserManager(user_db)
