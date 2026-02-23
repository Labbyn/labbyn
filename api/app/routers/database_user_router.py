"""Router for User Database API CRUD."""

import os
import shutil
import glob
from typing import List, Union

from app.database import get_db
from app.db.models import User, UserType, UsersTeams
from app.db.schemas import (
    UserCreate,
    UserUpdate,
    UserCreatedResponse,
    UserInfoExtended,
    UserInfo,
    UserTeamRoleUpdate
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
                "group_links": [f"/teams/{tid}" for tid in user_team_ids]
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

    if (
        db.query(User)
        .filter((User.login == user_data.login) | (User.email == user_data.email))
        .first()
    ):
        raise HTTPException(409, detail="User already exists.")

    if not ctx.is_admin and user_data.user_type == UserType.ADMIN:
        raise HTTPException(403, detail="Only admins can create other admin users.")

    raw_password = user_data.password or generate_starting_password()
    user_fields = user_data.model_dump(
        exclude={"password", "team_ids", "is_active", "is_superuser", "is_verified"}
    )

    new_user = User(
        **user_fields,
        hashed_password=hash_password(raw_password),
        force_password_change=True,
        is_active=True,
        is_superuser=(user_data.user_type == UserType.ADMIN),
    )

    try:
        db.add(new_user)
        db.flush()

        if ctx.is_admin:
            target_teams = user_data.team_ids or []
        else:
            target_teams = [t_id for t_id in user_data.team_ids if t_id in ctx.team_ids]

            if not target_teams and ctx.team_ids:
                target_teams = [ctx.team_ids[0]]

        for t_id in target_teams:
            db.add(
                UsersTeams(
                    user_id=new_user.id,
                    team_id=t_id,
                    is_group_admin=(user_data.user_type == UserType.GROUP_ADMIN),
                )
            )

        db.commit()
        db.refresh(new_user)
        db.expire_all()
        res = get_masked_user_model(new_user, ctx, detailed=True)
        return {**res.model_dump(), "generated_password": raw_password, "version_id": new_user.version_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=f"User creation error: {str(e)}")


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
    users = (
        db.query(User).options(joinedload(User.teams).joinedload(UsersTeams.team)).all()
    )
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
        .options(joinedload(User.teams).joinedload(UsersTeams.team))
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_team_ids = {m.team_id for m in user.teams}

    is_own_team = bool(set(ctx.team_ids) & user_team_ids) if ctx.team_ids else False
    if not (ctx.is_admin or is_own_team):
        raise HTTPException(
            status_code=403, detail="Insufficient permissions to view details"
        )

    return get_masked_user_model(user, ctx, detailed=True)


@router.patch("/db/users/{user_id}", response_model=UserInfoExtended, tags=["Users"])
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
        user = (
            db.query(User)
            .options(joinedload(User.teams))
            .filter(User.id == user_id)
            .first()
        )
        if not user:
            raise HTTPException(404, detail="User not found")

        user_team_ids = {m.team_id for m in user.teams}
        if not ctx.is_admin and ctx.team_id not in user_team_ids:
            raise HTTPException(403, detail="Access denied to user from another team")

        data = user_data.model_dump(exclude_unset=True)

        if not ctx.is_admin:
            if "user_type" in data and data["user_type"] == UserType.ADMIN:
                raise HTTPException(
                    403, detail="Insufficient permissions to assign ADMIN role"
                )
            if "team_ids" in data:
                data.pop("team_ids")

        if "password" in data:
            user.hashed_password = hash_password(data.pop("password"))

        if "team_ids" in data and ctx.is_admin:
            new_teams = data.pop("team_ids")
            db.query(UsersTeams).filter(UsersTeams.user_id == user.id).delete()
            for t_id in new_teams:
                db.add(UsersTeams(user_id=user.id, team_id=t_id))

        for k, v in data.items():
            if hasattr(user, k):
                setattr(user, k, v)
        try:
            db.commit()
            db.refresh(user)
            user = (
                db.query(User)
                .options(joinedload(User.teams).joinedload(UsersTeams.team))
                .filter(User.id == user.id)
                .first()
            )

            return get_masked_user_model(user, ctx, detailed=True)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"User update error: {str(e)}")

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
        user = (
            db.query(User)
            .options(joinedload(User.teams))
            .filter(User.id == user_id)
            .first()
        )
        if not user:
            raise HTTPException(404, detail="User not found")

        user_team_ids = {m.team_id for m in user.teams}
        if not ctx.is_admin and ctx.team_id not in user_team_ids:
            raise HTTPException(403, detail="Cannot delete user from another team")

        if user.id == ctx.current_user.id:
            raise HTTPException(400, detail="Cannot delete own account")

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


@router.patch("/db/users/{user_id}/promote", tags=["Users"])
async def update_user_team_role(
        user_id: int,
        role_data: UserTeamRoleUpdate,
        db: Session = Depends(get_db),
        ctx: RequestContext = Depends(),
):
    """
    Update user's group admin role within a specific team
    :param user_id: user ID
    :param role_data: Schema containing team_id and is_group_admin flag
    :param db: Database session
    :param ctx: Context for permissions and user info
    :return: None
    """
    if not ctx.is_admin:
        requester_membership = (
            db.query(UsersTeams)
            .filter(
                UsersTeams.user_id == ctx.current_user.id,
                UsersTeams.team_id == role_data.team_id,
                UsersTeams.is_group_admin == True
            )
            .first()
        )

        if not requester_membership:
            raise HTTPException(
                status_code=403,
                detail="You can only change roles for users in teams where you are a group admin."
            )

    target_membership = (
        db.query(UsersTeams)
        .filter(
            UsersTeams.user_id == user_id,
            UsersTeams.team_id == role_data.team_id
        )
        .first()
    )

    if not target_membership:
        raise HTTPException(
            status_code=404,
            detail="User does not belong to the specified team or user not found."
        )

    target_membership.is_group_admin = role_data.is_group_admin

    try:
        db.commit()
        user = db.query(User).options(
            joinedload(User.teams).joinedload(UsersTeams.team)
        ).filter(User.id == user_id).first()

        return get_masked_user_model(user, ctx, detailed=True)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error while promoting user: {str(e)}")