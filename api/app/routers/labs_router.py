from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.db.schemas import LabsResponse
from app.utils.labs_service import build_labs

router = APIRouter()


@router.get(
    "/labs",
    response_model=List[LabsResponse],
    tags=["labs"],
)
def get_labs(db: Session = Depends(get_db)):
    return build_labs(db)
