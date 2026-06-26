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

        if security.verify_password(data.new_password, db_user.hashed_password):
            raise exceptions.ValidationError(
                f"New password cannot be the same as the current password for user '{db_user.login}'."
            )
        db_user.hashed_password = security.hash_password(data.new_password)
        db_user.force_password_change = False
        self.db.add(db_user)
        await self.db.commit()

        return {"message": "Password has been set successfully."}

    async def force_password_reset(self, user_id: int):
        """Setup password change flag.

        Set flag to force password reset to redirect user to
        password reset subpage.

        :param user_id: User ID
        :return: Success or error message
        """
        db_user = await self.repo.get_user_by_id(self.db, user_id)

        if not db_user:
            raise exceptions.ObjectNotFoundError("User")

        temp_password = security.generate_starting_password()

        db_user.hashed_password = security.hash_password(temp_password)
        db_user.force_password_change = True

        self.db.info["user_id"] = self.user.id

        self.db.add(db_user)
        await self.db.commit()

        return {
            "message": f"Password reset forced for user {db_user.login}",
            "login": db_user.login,
            "password": temp_password,
        }
