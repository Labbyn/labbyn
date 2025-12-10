"""Router for User Database API CRUD."""

from typing import List

from app.database import get_db
from app.db.models import (
    User,
    UserType,
)
from app.db.schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash password in bcrypt
    :param password: Plain password
    :return: Hashed password
    """
    return pwd_context.hash(password)


router = APIRouter()


# ==========================================
# USERS
# ==========================================
@router.post(
    "/db/users/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Users"],
)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create and add new user to database
    :param user_data: User data
    :param db: Active database session
    :return: New user
    """
    if db.query(User).filter(User.login == user_data.login).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Login already exists."
        )

    hashed_pw = hash_password(user_data.password)
    user_dict = user_data.model_dump(exclude={"password"})
    new_user = User(**user_dict, password=hashed_pw, user_type=UserType.USER)

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e


@router.get("/db/users/", response_model=List[UserResponse], tags=["Users"])
def get_users(db: Session = Depends(get_db)):
    """
    Fetch all users
    :param db: Active database session
    :return: List of all users
    """
    return db.query(User).all()


@router.get("/db/users/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific user by ID
    :param user_id: User ID
    :param db: Active database session
    :return: User object
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.put("/db/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def update_user(
    user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)
):
    """
    Update user data
    :param user_id: User ID
    :param user_data: User data schema
    :param db: Active database session
    :return: Updated User
    """
    async with acquire_lock(f"user_lock:{user_id}"):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        data = user_data.model_dump(exclude_unset=True)
        if "password" in data:
            data["password"] = hash_password(data["password"])

        for k, v in data.items():
            setattr(user, k, v)

        db.commit()
        db.refresh(user)
        return user


@router.delete(
    "/db/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Users"]
)
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete user
    :param user_id: User ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"user_lock:{user_id}"):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        db.delete(user)
        db.commit()
