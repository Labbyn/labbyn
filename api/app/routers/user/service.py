import glob
import os
from typing import Union

import aiofiles
from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.schemas import user_schemas
from app.utils import redis_service, security

from .repository import UserRepository

AVATAR_DIR = "/home/labbyn/avatars"


class UserService:
    """Service for managing users, privacy masking, and profile assets."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init User Service.

        :param db: Active database session.
        :param ctx: User context.
        """
        self.db = db
        self.ctx = ctx
        self.repo = UserRepository()

    def get_masked_user_model(
        self, u: models.User, detailed: bool = False
    ) -> Union[user_schemas.UserInfo, user_schemas.UserInfoExtended]:
        """Apply privacy masking to user data based on requester's permissions.

        :param u: User model instance.
        :param detailed: Whether to include sensitive fields (email, etc.).
        :return: Validated Pydantic model (UserInfo or UserInfoExtended).
        """
        user_team_ids = {m.team_id for m in u.teams}
        is_in_common_team = any(tid in self.ctx.team_ids for tid in user_team_ids)
        can_see_full_data = self.ctx.is_admin or is_in_common_team

        memberships = [
            {
                "team_id": m.team_id,
                "team_name": m.team.name if m.team else None,
                "is_group_admin": m.is_group_admin,
            }
            for m in u.teams
        ]

        user_data = {
            "id": u.id,
            "name": u.name,
            "surname": u.surname,
            "login": u.login,
            "user_type": u.user_type,
            "membership": memberships,
        }
        if detailed and can_see_full_data:
            user_data.update(
                {
                    "email": u.email,
                    "avatar_url": u.avatar_path if hasattr(u, "avatar_path") else None,
                    "group_links": [f"/teams/{tid}" for tid in user_team_ids],
                    "force_password_change": u.force_password_change,
                }
            )
            return user_schemas.UserInfoExtended.model_validate(user_data)

        return user_schemas.UserInfo.model_validate(user_data)

    async def create_user(self, user_data: user_schemas.UserCreate):
        """Create a new user with secure password generation and team assignment.

        :param user_data: User creation schema.
        :return: Dict with created user data and generated password.
        """
        self.ctx.require_group_admin()

        if not self.ctx.is_admin and user_data.user_type == models.UserType.ADMIN:
            raise exceptions.AccessDeniedError(
                "Only system admins can create other admin users."
            )

        raw_password = user_data.password or security.generate_starting_password()
        if user_data.password and len(user_data.password) < 6:
            raise exceptions.ValidationError("Password must be at least 6 characters long.")

        user_fields = user_data.model_dump(exclude={"password", "team_ids"})

        new_user = models.User(
            **user_fields,
            hashed_password=security.hash_password(raw_password),
            force_password_change=True,
            is_active=True,
            is_superuser=(user_data.user_type == models.UserType.ADMIN),
        )

        try:
            self.db.add(new_user)
            await self.db.flush()

            target_teams = user_data.team_ids or []
            if not self.ctx.is_admin:
                target_teams = [
                    t_id for t_id in target_teams if t_id in self.ctx.team_ids
                ]
                if not target_teams and self.ctx.team_ids:
                    target_teams = [self.ctx.team_ids[0]]

            for t_id in target_teams:
                self.db.add(
                    models.UsersTeams(
                        user_id=new_user.id,
                        team_id=t_id,
                        is_group_admin=(
                            user_data.user_type == models.UserType.GROUP_ADMIN
                        ),
                    )
                )

            await self.db.commit()
            refreshed = await self.repo.get_by_id(self.db, new_user.id, detailed=True)
            res = self.get_masked_user_model(refreshed, detailed=True)

            return {
                **res.model_dump(),
                "generated_password": raw_password,
                "version_id": refreshed.version_id,
            }

        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"User with login '{user_data.login}' or email '{user_data.email}' already exists."
            )

    async def update_user(self, user_id: int, user_data: user_schemas.UserUpdate):
        """Update user profile with security locks and permission checks.

        :param user_id: ID of the user to update.
        :param user_data: Update fields.
        :return: Updated user (masked).
        """
        async with redis_service.acquire_lock(f"user_lock:{user_id}"):
            user = await self.repo.get_by_id(self.db, user_id, detailed=True)
            if not user:
                raise exceptions.ObjectNotFoundError("User", name=str(user_id))

            user_team_ids = {m.team_id for m in user.teams}
            if not self.ctx.is_admin and not any(
                tid in self.ctx.team_ids for tid in user_team_ids
            ):
                raise exceptions.AccessDeniedError(
                    f"Access denied to update user '{user.login}'"
                )

            data = user_data.model_dump(exclude_unset=True)

            try:
                if "user_type" in data:
                    new_type = data.pop("user_type")
                    if not self.ctx.is_admin and new_type == models.UserType.ADMIN:
                        raise exceptions.AccessDeniedError("Only system admins can promote to ADMIN.")

                    user.user_type = new_type

                if "password" in data:
                    if len(data["password"]) < 6:
                        raise exceptions.ValidationError("New password is too short.")
                    user.hashed_password = security.hash_password(data.pop("password"))

                if "team_ids" in data and self.ctx.is_admin:
                    await self.db.execute(
                        sql.delete(models.UsersTeams).where(
                            models.UsersTeams.user_id == user.id
                        )
                    )
                    for t_id in data.pop("team_ids"):
                        self.db.add(models.UsersTeams(user_id=user.id, team_id=t_id))
                    user.teams = []

                for k, v in data.items():
                    setattr(user, k, v)

                await self.db.commit()
                refreshed = await self.repo.get_by_id(self.db, user_id, detailed=True)
                return self.get_masked_user_model(refreshed, detailed=True)

            except IntegrityError:
                await self.db.rollback()
                raise exceptions.ConflictError(
                    message=f"Login or email for '{user.login}' is already taken."
                )

    async def upload_avatar(self, file):
        """Handle avatar upload and file system cleanup.

        :param file: UploadFile object.
        :return: Success message.
        """
        self.ctx.require_user()
        user_id = self.ctx.current_user.id

        for old_file in glob.glob(os.path.join(AVATAR_DIR, f"avatar_user_{user_id}.*")):
            try:
                os.remove(old_file)
            except OSError:
                pass

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg", ".gif"]:
            raise exceptions.ValidationError("Allowed types: png, jpg, jpeg, gif.")

        filename = f"avatar_user_{user_id}{ext}"
        full_path = os.path.join(AVATAR_DIR, filename)

        try:
            async with aiofiles.open(full_path, "wb") as buffer:
                await buffer.write(await file.read())

            user = await self.repo.get_by_id(self.db, user_id)
            user.avatar_path = f"/static/avatars/{filename}"
            await self.db.commit()
            return {"info": f"Avatar updated for '{user.login}'!"}
        except Exception:
            await self.db.rollback()
            raise exceptions.ValidationError("Failed to upload avatar.")

    async def delete_user(self, user_id: int):
        """Delete user account (Group Admin or Admin only).

        :param user_id: ID of the user to delete.
        :return: Deleted user (masked).
        """
        self.ctx.require_group_admin()
        async with redis_service.acquire_lock(f"user_lock:{user_id}"):
            user = await self.repo.get_by_id(self.db, user_id, detailed=True)
            if not user:
                raise exceptions.ObjectNotFoundError("User")

            user_team_ids = {m.team_id for m in user.teams}
            if not self.ctx.is_admin and self.ctx.team_id not in user_team_ids:
                raise exceptions.AccessDeniedError(
                    f"Cannot delete user '{user.login}' from another team"
                )

            if user.id == self.ctx.current_user.id:
                raise exceptions.ValidationError("You cannot delete your own account")

            try:
                login = user.login
                await self.db.delete(user)
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Could not delete user '{login}'")

    async def change_user_access(self, user_id: int, promote_data):
        """Promote a user to Group Admin within a specific team.

        :param user_id: ID of the user to promote.
        :param promote_data: PromoteData object.
        """
        self.ctx.require_admin()

        async with redis_service.acquire_lock(f"user_lock:{user_id}"):
            user = await self.repo.get_by_id(self.db, user_id)
            if not user:
                raise exceptions.ObjectNotFoundError("User")

            membership = await self.repo.get_membership(
                self.db, user_id, promote_data.team_id
            )

            if not membership:
                membership = models.UsersTeams(
                    user_id=user_id,
                    team_id=promote_data.team_id,
                    is_group_admin=promote_data.is_group_admin,
                )
                self.db.add(membership)
            else:
                membership.is_group_admin = promote_data.is_group_admin

            if promote_data.is_group_admin and user.user_type == models.UserType.USER:
                user.user_type = models.UserType.GROUP_ADMIN

            try:
                await self.db.commit()
                refreshed = await self.repo.get_by_id(self.db, user_id, detailed=True)
                return self.get_masked_user_model(refreshed, detailed=True)
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Failed to promote user: {str(e)}")
