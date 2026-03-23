"""Router for User Database API CRUD."""

import glob
import os
from typing import List

import aiofiles
from fastapi import (
    APIRouter,
    Depends,
    File,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import sql, orm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import user_schemas
from app.utils import redis_service, security

router = APIRouter(prefix="/db", tags=["Users"])
AVATAR_DIR = "/home/labbyn/avatars"


def get_masked_user_model(
    u: models.User, ctx: dependencies.RequestContext, detailed: bool = False
):
    """Return user data with fields masked based on requester's permissions.

    Admins can see full data, regular users see limited info.
    :param u: User object
    :param ctx: Request context for user and team info
    :param detailed: Whether to include detailed fields (email, avatar, group links)
    :return: UserInfo or UserInfoExtended model instance.
    """
    user_team_ids = {m.team_id for m in u.teams}
    is_in_common_team = any(tid in ctx.team_ids for tid in user_team_ids)
    can_see_full_data = ctx.is_admin or is_in_common_team

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
            }
        )
        return user_schemas.UserInfoExtended.model_validate(user_data)

    return user_schemas.UserInfo.model_validate(user_data)


@router.post(
    "/users",
    response_model=user_schemas.UserCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    user_data: user_schemas.UserCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new user to database.

    :param user_data: User data
    :param db: Active database session
    :return: New user.
    """
    ctx.require_group_admin()

    if not ctx.is_admin and user_data.user_type == models.UserType.ADMIN:
        raise exceptions.AccessDeniedError(
            "Only system admins can create other admin users."
        )

    raw_password = user_data.password or security.generate_starting_password()
    user_fields = user_data.model_dump(
        exclude={"password", "team_ids", "is_active", "is_superuser", "is_verified"}
    )

    new_user = models.User(
        **user_fields,
        hashed_password=security.hash_password(raw_password),
        force_password_change=True,
        is_active=True,
        is_superuser=(user_data.user_type == models.UserType.ADMIN),
    )

    try:
        db.add(new_user)

        await db.flush()

        target_teams = user_data.team_ids or []
        if not ctx.is_admin:
            target_teams = [t_id for t_id in target_teams if t_id in ctx.team_ids]
            if not target_teams and ctx.team_ids:
                target_teams = [ctx.team_ids[0]]

        for t_id in target_teams:
            db.add(
                models.UsersTeams(
                    user_id=new_user.id,
                    team_id=t_id,
                    is_group_admin=(user_data.user_type == models.UserType.GROUP_ADMIN),
                )
            )

        await db.commit()

        stmt_refresh = (
            sql.select(models.User)
            .options(
                orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
            )
            .where(models.User.id == new_user.id)
        )
        new_user = (await db.execute(stmt_refresh)).unique().scalar_one()

        res = get_masked_user_model(new_user, ctx, detailed=True)
        return {
            **res.model_dump(),
            "generated_password": raw_password,
            "version_id": new_user.version_id,
        }

    except IntegrityError:
        await db.rollback()
        raise exceptions.ConflictError(
            message=f"User with login '{user_data.login}' or email '{user_data.email}' already exists."
        )
    except Exception as e:
        await db.rollback()
        if isinstance(
            e,
            (
                exceptions.AccessDeniedError,
                exceptions.ConflictError,
                exceptions.ValidationError,
            ),
        ):
            raise e
        raise exceptions.ValidationError(
            f"Could not create user '{user_data.login}'"
        ) from e


@router.get("/users/list_info", response_model=List[user_schemas.UserInfo])
async def get_users_with_groups(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all users with their assigned groups (masked based on permissions).

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: User object.
    """
    ctx.require_user()
    stmt = sql.select(models.User).options(
        orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
    )
    result = await db.execute(stmt)
    users = result.unique().scalars().all()
    return [get_masked_user_model(u, ctx, detailed=False) for u in users]


@router.get("/users/{user_id}", response_model=user_schemas.UserInfoExtended)
async def get_user_detail_with_groups(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch full user profile including avatar and group links (requires permissions).

    :param user_id: User ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: User object with extended info.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.User)
        .options(orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team))
        .where(models.User.id == user_id)
    )

    result = await db.execute(stmt)
    user = result.unique().scalar_one_or_none()

    if not user:
        raise exceptions.ObjectNotFoundError("User")

    user_team_ids = {m.team_id for m in user.teams}

    is_own_team = bool(set(ctx.team_ids) & user_team_ids) if ctx.team_ids else False
    if not (ctx.is_admin or is_own_team):
        raise exceptions.AccessDeniedError(
            f"Insufficient permissions to view details of '{user.login}'"
        )

    return get_masked_user_model(user, ctx, detailed=True)


@router.patch("/users/{user_id}", response_model=user_schemas.UserInfoExtended)
async def update_user(
    user_id: int,
    user_data: user_schemas.UserUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update user data.

    :param user_id: User ID
    :param user_data: User data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated User.
    """
    async with redis_service.acquire_lock(f"user_lock:{user_id}"):
        stmt = (
            sql.select(models.User)
            .options(
                orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
            )
            .where(models.User.id == user_id)
        )
        result = await db.execute(stmt)
        user = result.unique().scalar_one_or_none()

        if not user:
            raise exceptions.ObjectNotFoundError("User", name=str(user_id))

        user_team_ids = {m.team_id for m in user.teams}
        if not ctx.is_admin and not any(tid in ctx.team_ids for tid in user_team_ids):
            raise exceptions.AccessDeniedError(
                f"Access denied to update user '{user.login}'"
            )

        data = user_data.model_dump(exclude_unset=True)

        if not ctx.is_admin:
            if "user_type" in data and data["user_type"] == models.UserType.ADMIN:
                raise exceptions.AccessDeniedError(
                    f"Access denied to update user '{user.login}' to ADMIN"
                )
            data.pop("team_ids", None)

        try:
            if "password" in data:
                user.hashed_password = security.hash_password(data.pop("password"))

            if "team_ids" in data and ctx.is_admin:
                await db.execute(
                    sql.delete(models.UsersTeams).where(
                        models.UsersTeams.user_id == user.id
                    )
                )
                new_team_ids = data.pop("team_ids")
                for t_id in new_team_ids:
                    db.add(models.UsersTeams(user_id=user.id, team_id=t_id))

                user.teams = []

            for k, v in data.items():
                if hasattr(user, k):
                    setattr(user, k, v)

            await db.flush()
            await db.commit()

            stmt_final = (
                sql.select(models.User)
                .options(
                    orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
                )
                .where(models.User.id == user_id)
            )
            refresh_result = await db.execute(stmt_final)
            user_refreshed = refresh_result.unique().scalar_one()

            return get_masked_user_model(user_refreshed, ctx, detailed=True)

        except IntegrityError:
            await db.rollback()
            conflict_login = user_data.login if user_data.login else "this user"
            raise exceptions.ConflictError(
                message=f"Update failed. Login or email for '{conflict_login}' is already taken."
            )
        except Exception as e:
            await db.rollback()
            if isinstance(
                e,
                (
                    exceptions.AccessDeniedError,
                    exceptions.ObjectNotFoundError,
                    exceptions.ConflictError,
                ),
            ):
                raise e
            raise exceptions.ValidationError(
                f"Failed to update user '{user.login}'"
            ) from e


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete user.

    :param user_id: User ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    ctx.require_group_admin()
    async with redis_service.acquire_lock(f"user_lock:{user_id}"):
        stmt = (
            sql.select(models.User)
            .options(orm.joinedload(models.User.teams))
            .where(models.User.id == user_id)
        )
        result = await db.execute(stmt)
        user = result.unique().scalar_one_or_none()

        if not user:
            raise exceptions.ObjectNotFoundError("User")

        user_team_ids = {m.team_id for m in user.teams}
        if not ctx.is_admin and ctx.team_id not in user_team_ids:
            raise exceptions.AccessDeniedError(
                f"Cannot delete user '{user.login}' from another team"
            )

        if user.id == ctx.current_user.id:
            raise exceptions.ValidationError("You cannot delete your own account")

        try:
            await db.delete(user)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete user '{user.login}'"
            ) from e


@router.post("/users/avatar")
async def upload_user_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Upload user avatar.

    Avatars are static files mounted in /home/labbyn/avatars directory

    :param file: File to upload
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    ctx.require_user()
    user_id = ctx.current_user.id

    for old_file in glob.glob(os.path.join(AVATAR_DIR, f"avatar_user_{user_id}.*")):
        try:
            os.remove(old_file)
        except OSError:
            pass

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".gif"]:
        raise exceptions.ValidationError(
            "Unsupported file type for avatar. Allowed: png, jpg, jpeg, gif."
        )

    filename = f"avatar_user_{user_id}{ext}"
    full_path = os.path.join(AVATAR_DIR, filename)

    try:
        async with aiofiles.open(full_path, "wb") as buffer:
            await buffer.write(await file.read())

        user = (
            await db.execute(sql.select(models.User).where(models.User.id == user_id))
        ).scalar_one()
        user.avatar_path = f"/static/avatars/{filename}"
        await db.commit()
        return {"info": "Avatar updated!"}
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError("Failed to upload avatar.") from e


@router.patch("/users/{user_id}/promote", tags=["Users"])
async def update_user_team_role(
    user_id: int,
    role_data: user_schemas.UserTeamRoleUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update user's group admin role within a specific team.

    :param user_id: user ID
    :param role_data: Schema containing team_id and is_group_admin flag
    :param db: Database session
    :param ctx: Context for permissions and user info
    :return: None.
    """
    ctx.require_user()

    team = (
        await db.execute(
            sql.select(models.Teams).where(models.Teams.id == role_data.team_id)
        )
    ).scalar_one_or_none()
    if not team:
        raise exceptions.ObjectNotFoundError("Team")

    user = (
        await db.execute(sql.select(models.User).where(models.User.id == user_id))
    ).scalar_one_or_none()
    if not user:
        raise exceptions.ObjectNotFoundError("User")

    if not ctx.is_admin:
        stmt_req = sql.select(models.UsersTeams).where(
            models.UsersTeams.user_id == ctx.current_user.id,
            models.UsersTeams.team_id == role_data.team_id,
            models.UsersTeams.is_group_admin.is_(True),
        )
        if not (await db.execute(stmt_req)).scalar_one_or_none():
            raise exceptions.AccessDeniedError(
                f"You are not an admin of team '{team.name}'"
            )

    stmt_target = sql.select(models.UsersTeams).where(
        models.UsersTeams.user_id == user_id,
        models.UsersTeams.team_id == role_data.team_id,
    )
    target_membership = (await db.execute(stmt_target)).scalar_one_or_none()

    if not target_membership:
        raise exceptions.ValidationError(
            f"User '{user.login}' does not belong to team '{team.name}'"
        )

    try:
        target_membership.is_group_admin = role_data.is_group_admin
        if role_data.is_group_admin and user.user_type == models.UserType.USER:
            user.user_type = models.UserType.GROUP_ADMIN

        await db.commit()
        stmt_final = (
            sql.select(models.User)
            .options(
                orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
            )
            .where(models.User.id == user_id)
        )
        user = (await db.execute(stmt_final)).unique().scalar_one()
        return get_masked_user_model(user, ctx, detailed=True)
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            f"Error promoting '{user.login}' in team '{team.name} to group admin.'"
        ) from e
