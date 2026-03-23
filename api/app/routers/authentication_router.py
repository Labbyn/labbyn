"""Router for authentication non-default methods."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import auth_config
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import user_schemas
from app.utils import security

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
    if not user.force_password_change:
        raise exceptions.ValidationError(
            "Password change is not required for this account."
        )

    stmt = select(models.User).where(models.User.id == user.id)
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise exceptions.ObjectNotFoundError("User", user.login)

    db_user.hashed_password = security.hash_password(data.new_password)
    db_user.force_password_change = False
    db.add(db_user)
    await db.commit()

    return {"message": "Password has been set successfully."}
