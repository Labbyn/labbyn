from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import auth_config
from app.database import get_async_db
from app.db import models
from app.schemas import user_schemas

from .service import AuthService
from ...core import exceptions

router = APIRouter(prefix="/auth", tags=["Auth"])

current_user = auth_config.fastapi_users.current_user(active=True)


@router.post("/setup-password")
async def setup_first_password(
    data: user_schemas.FirstChangePasswordRequest,
    user: models.User = Depends(current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Setup first password.

    After creating user with automatically assigned password, the user needs
    to change it at his first login.

    :param data: Password change request data
    :param user: Active user in database session
    :param db: Active database session
    :return: Success or error message
    """
    service = AuthService(db, user)
    return await service.setup_first_password(data)


@router.post("/reset-password/{user_id}")
async def reset_password(
        user_id: int,
        user: models.User = Depends(current_user),
        db: AsyncSession = Depends(get_async_db),
):
    """Force password reset for given user.

    Set password change flag for given user.

    :param user_id: Password change request data
    :param user: Active user in database session
    :param db: Active database session
    :return: Success or error message
    """
    if user.user_type != "admin":
        raise exceptions.AccessDeniedError()

    service = AuthService(db, user)
    return await service.force_password_reset(user_id)