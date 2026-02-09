from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.auth_config import fastapi_users
from app.db.models import User
from app.db.schemas import FirstChangePasswordRequest
from app.utils.security import hash_password

router = APIRouter(prefix="/auth", tags=["Auth"])

current_user = fastapi_users.current_user(active=True)


@router.post("/setup-password")
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

    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    db_user.hashed_password = hash_password(data.new_password)
    db_user.force_password_change = False
    db.add(db_user)
    db.commit()

    return {"message": "Password has been set successfully."}
