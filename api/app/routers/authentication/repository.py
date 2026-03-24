from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class AuthRepository:
    """Repository for handling authentication-related database operations."""

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int):
        """Retrieve a single user from the database by their unique ID.

        :param db: Active asynchronous database session.
        :param user_id: The primary key ID of the user.
        :return: User model instance or None if the user does not exist.
        """
        stmt = select(models.User).where(models.User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_user_password(
        db: AsyncSession, db_user: models.User, hashed_password: str
    ):
        """Update a user's password and clear the mandatory change flag.

        This method updates the hashed_password field and sets force_password_change
        to False.

        :param db: Active asynchronous database session.
        :param db_user: The User model instance to be updated.
        :param hashed_password: The new pre-hashed password string.
        """
        db_user.hashed_password = hashed_password
        db_user.force_password_change = False
        db.add(db_user)
