from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.config import fastapi_users
from app.db.models import User
from app.db.schemas import FirstChangePasswordRequest  # Ten schemat co robiliśmy
from app.utils.security import hash_password

router = APIRouter(prefix="/auth", tags=["Auth"])

current_user = fastapi_users.current_user(active=True)


@router.post("/auth/setup-password")
async def setup_first_password(
    data: FirstChangePasswordRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):

    if not user.force_password_change:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password change not required.",
        )

    user.hashed_password = hash_password(data.new_password)
    user.force_password_change = False

    db.commit()
    db.refresh(user)

    return {"message": "Password has been set successfully."}
