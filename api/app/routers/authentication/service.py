"""Authentication Service Module."""

from app.core import exceptions
from app.utils import security

from .repository import AuthRepository


class AuthService:
    def __init__(self, db, user):
        self.db = db
        self.user = user
        self.repo = AuthRepository()

    async def setup_first_password(self, data):
        """Setup first password.

        After creating user with automatically assigned password, the user needs
        to change it at his first login.

        :param data: Password change request data
        :return: Success or error message
        """
        if not self.user.force_password_change:
            raise exceptions.ValidationError(
                "Password change is not required for this account."
            )

        db_user = await self.repo.get_user_by_id(self.db, self.user.id)

        if not db_user:
            raise exceptions.ObjectNotFoundError("User", self.user.login)

        db_user.hashed_password = security.hash_password(data.new_password)
        db_user.force_password_change = False
        self.db.add(db_user)
        await self.db.commit()

        return {"message": "Password has been set successfully."}
