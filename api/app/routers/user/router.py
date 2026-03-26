"""Router for User Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
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
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new user to database.

    :param user_data: User data
    :param db: Active database session
    :return: New user.
    """
    return await UserService(db, ctx).create_user(user_data)


@router.get("/list_info", response_model=List[user_schemas.UserInfo])
async def get_users_list(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all users with their assigned groups (masked based on permissions).

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: User object.
    """
    service = UserService(db, ctx)
    users = await service.repo.get_all_with_teams(db)
    return [service.get_masked_user_model(u, detailed=False) for u in users]


@router.get("/{user_id}", response_model=user_schemas.UserInfoExtended)
async def get_user_detail(
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
    service = UserService(db, ctx)
    user = await service.repo.get_by_id(db, user_id, detailed=True)
    return service.get_masked_user_model(user, detailed=True)


@router.patch("/{user_id}", response_model=user_schemas.UserInfoExtended)
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
    return await UserService(db, ctx).update_user(user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    await UserService(db, ctx).delete_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/avatar")
async def upload_avatar(
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
    return await UserService(db, ctx).upload_avatar(file)


@router.patch("/{user_id}/promote", response_model=user_schemas.UserInfoExtended)
async def promote_user(
    user_id: int,
    promote_data: user_schemas.UserTeamRoleUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update user's group admin role within a specific team."""
    return await UserService(db, ctx).promote_user(user_id, promote_data)
