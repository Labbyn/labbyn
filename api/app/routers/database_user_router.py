"""Router for User Database API CRUD."""

import os
import shutil
import glob
from typing import List, Union

from app.database import get_db
from app.db.models import (
    User,
    UserType,
)
from app.db.schemas import (
    UserCreate,
    UserUpdate,
    UserCreatedResponse,
    UserInfoExtended,
    UserInfo,
)
from app.utils.redis_service import acquire_lock
from app.utils.security import hash_password, generate_starting_password
from app.db.schemas import UserRead
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from app.auth.dependencies import RequestContext

router = APIRouter()
AVATAR_DIR = "/home/labbyn/avatars"


def get_masked_user_model(u: User, ctx: RequestContext, detailed: bool = False):
    """
    Return user data with fields masked based on requester's permissions.
    Admins can see full data, regular users see limited info.
    :param u: User object
    :param ctx: Request context for user and team info
    :param detailed: Whether to include detailed fields (email, avatar, group links)
    :return: UserInfo or UserInfoExtended model instance
    """
    is_own_team = ctx.team_id is not None and u.team_id == ctx.team_id
    can_see_full_data = ctx.is_admin or is_own_team

    assigned_groups = [{"name": u.teams.name}] if u.teams else []
    group_links = [f"/db/teams/{u.team_id}"] if u.teams else []

    user_data = {
        "id": u.id,
        "name": u.name,
        "surname": u.surname,
        "login": u.login,
        "user_type": u.user_type,
        "assigned_groups": assigned_groups,
    }

    if detailed and can_see_full_data:
        user_data.update(
            {
                "email": u.email,
                "avatar_url": u.avatar_path if hasattr(u, "avatar_path") else None,
                "group_links": group_links,
            }
        )
        return UserInfoExtended.model_validate(user_data)

    return UserInfo.model_validate(user_data)


@router.post(
    "/db/users/",
    response_model=UserCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Users"],
)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create and add new user to database
    :param user_data: User data
    :param db: Active database session
    :return: New user
    """

    ctx.require_group_admin()

    if db.query(User).filter(User.login == user_data.login).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Login already exists."
        )
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already exists."
        )

    if user_data.password:
        raw_password = user_data.password
    else:
        raw_password = generate_starting_password()

    hashed_pw = hash_password(raw_password)
    user_dict = user_data.model_dump(
        exclude={"password", "is_active", "is_superuser", "is_verified"}
    )

    if not ctx.is_admin:
        user_dict["team_id"] = ctx.team_id
        requested_role = user_data.user_type
        if requested_role == UserType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create admin user.",
            )

    new_user = User(
        **user_dict,
        hashed_password=hashed_pw,
        force_password_change=True,
        is_active=True,
        is_verified=False,
        is_superuser=(user_data.user_type == UserType.ADMIN),
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        response_dict = {
            "id": new_user.id,
            "login": new_user.login,
            "email": new_user.email,
            "name": new_user.name,
            "surname": new_user.surname,
            "user_type": new_user.user_type,
            "team_id": new_user.team_id,
            "version_id": new_user.version_id,
            "generated_password": raw_password,
        }

        return response_dict
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e


@router.get("/db/users/list_info", response_model=List[UserInfo], tags=["Users"])
def get_users_with_groups(
    db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch all users with their assigned groups (masked based on permissions).
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: User object
    """
    ctx.require_user()
    users = db.query(User).options(joinedload(User.teams)).all()
    return [get_masked_user_model(u, ctx, detailed=False) for u in users]


@router.get("/db/users/{user_id}", response_model=UserInfoExtended, tags=["Users"])
def get_user_detail_with_groups(
    user_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch full user profile including avatar and group links (requires permissions).
    :param user_id: User ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: User object with extended info
    """
    ctx.require_user()
    user = (
        db.query(User)
        .options(joinedload(User.teams))
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_own_team = ctx.team_id is not None and user.team_id == ctx.team_id
    if not (ctx.is_admin or is_own_team):
        raise HTTPException(
            status_code=403, detail="Insufficient permissions to view details"
        )

    return get_masked_user_model(user, ctx, detailed=True)


@router.put("/db/users/{user_id}", response_model=UserRead, tags=["Users"])
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update user data
    :param user_id: User ID
    :param user_data: User data schema
    :param db: Active database session
    :return: Updated User
    """
    ctx.require_group_admin()
    async with acquire_lock(f"user_lock:{user_id}"):
        query = db.query(User).filter(User.id == user_id)
        if not ctx.is_admin:
            query = query.filter(User.team_id == ctx.team_id)
        user = query.first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or access denied",
            )

        data = user_data.model_dump(exclude_unset=True)

        if not ctx.is_admin:
            if "team_id" in data:
                data["team_id"] = ctx.team_id
            if "user_type" in data and data["user_type"] == UserType.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to assign admin role.",
                )

        if "password" in data:
            new_plain_password = data.pop("password")
            data["hashed_password"] = hash_password(new_plain_password)

        for k, v in data.items():
            setattr(user, k, v)

        db.commit()
        db.refresh(user)
        return user


@router.delete(
    "/db/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Users"]
)
async def delete_user(
    user_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete user
    :param user_id: User ID
    :param db: Active database session
    :return: None
    """
    ctx.require_group_admin()
    async with acquire_lock(f"user_lock:{user_id}"):
        query = db.query(User).filter(User.id == user_id)
        if not ctx.is_admin:
            query = query.filter(User.team_id == ctx.team_id)
        user = query.first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or access denied",
            )
        if user.id == ctx.current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete own user account",
            )
        db.delete(user)
        db.commit()


@router.post("/db/users/avatar", tags=["Users"])
async def upload_user_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    ctx.require_user()
    user = ctx.current_user

    for old_file in glob.glob(os.path.join(AVATAR_DIR, f"avatar_user_{user.id}.*")):
        try:
            os.remove(old_file)
        except:
            pass

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".gif"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed types: png, jpg, jpeg, gif.",
        )

    filename = f"avatar_user_{user.id}{ext}"
    full_path = os.path.join(AVATAR_DIR, filename)

    try:
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Something went wrong! Try again!: {str(e)}"
        )

    user.avatar_path = f"/static/avatars/{filename}"
    db.commit()

    return {"info": "Succesfully updated!", "path": user.avatar_path}
