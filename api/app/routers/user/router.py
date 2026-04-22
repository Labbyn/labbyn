"""Router for User Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, File, Response, UploadFile, status

from app.auth import dependencies
from app.schemas import user_schemas

from .service import UserService

router = APIRouter(prefix="/db/users", tags=["Users"])


@router.post(
    "",
    response_model=user_schemas.UserCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    user_data: user_schemas.UserCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new user to database.

    :param user_data: User data
    :return: New user.
    """
    return await UserService(ctx.db, ctx).create_user(user_data)


@router.get("/list_info", response_model=List[user_schemas.UserInfo])
async def get_users_list(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all users with their assigned groups (masked based on permissions).

    :param ctx: Request context for user and team info
    :return: User object.
    """
    service = UserService(ctx.db, ctx)
    users = await service.repo.get_all_with_teams(ctx.db)
    return [service.get_masked_user_model(u, detailed=False) for u in users]


@router.get("/{user_id}",
            response_model=user_schemas.UserInfoExtended,
            response_model_exclude_none=True)
async def get_user_detail(
    user_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch full user profile including avatar and group links (requires permissions).

    :param user_id: User ID
    :param ctx: Request context for user and team info
    :return: User object with extended info.
    """
    service = UserService(ctx.db, ctx)
    user = await service.repo.get_by_id(ctx.db, user_id, detailed=True)
    return service.get_masked_user_model(user, detailed=True)


@router.patch("/{user_id}", response_model=user_schemas.UserInfoExtended)
async def update_user(
    user_id: int,
    user_data: user_schemas.UserUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update user data.

    :param user_id: User ID
    :param user_data: User data schema
    :param ctx: Request context for user and team info
    :return: Updated User.
    """
    return await UserService(ctx.db, ctx).update_user(user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete user.

    :param user_id: User ID
    :param ctx: Request context for user and team info
    :return: None.
    """
    await UserService(ctx.db, ctx).delete_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Upload user avatar.

    Avatars are static files mounted in /home/labbyn/avatars directory

    :param file: File to upload
    :param ctx: Request context for user and team info
    :return: None.
    """
    return await UserService(ctx.db, ctx).upload_avatar(file)


@router.patch("/{user_id}/change_team_access", response_model=user_schemas.UserInfoExtended)
async def change_team_access(
    user_id: int,
    promote_data: user_schemas.UserTeamRoleUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update user's group admin role within a specific team.

    :param user_id: User ID
    :param promote_data: User profile data
    :param ctx: Request context for user and team info
    :return: None.
    """
    return await UserService(ctx.db, ctx).change_user_access(user_id, promote_data)
