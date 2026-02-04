from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.models import (
    Rooms,
)
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.db.schemas import LabsResponse, LabsItem
from app.utils.labs_service import build_labs

router = APIRouter()


@router.get(
    "/labs",
    response_model=List[LabsResponse],
    tags=["labs"],
)
def get_labs(db: Session = Depends(get_db)):
    return build_labs(db)

@router.get("/labs/{lab_id}", response_model=LabsResponse, tags=["labs"])
def get_lab_by_id(lab_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific lab by ID
    :param lab_id: Lab ID
    :param db: Active database session
    :return: User object
    """
    return build_labs(db, lab_id=lab_id)
