"""Router for Metadata Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import (
    Metadata,
)
from app.db.schemas import (
    MetadataCreate,
    MetadataResponse,
    MetadataUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/metadata/",
    response_model=MetadataResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Metadata"],
)
def create_metadata(meta_data: MetadataCreate, db: Session = Depends(get_db)):
    """
    Create new metadata
    :param meta_data: Metadata data
    :param db: Active database session
    :return: Metadata object
    """
    obj = Metadata(**meta_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/metadata/", response_model=List[MetadataResponse], tags=["Metadata"])
def get_all_metadata(db: Session = Depends(get_db)):
    """
    Fetch all metadata records
    :param db: Active database session
    :return: List of Metadata
    """
    return db.query(Metadata).all()


@router.get(
    "/db/metadata/{meta_id}", response_model=MetadataResponse, tags=["Metadata"]
)
def get_metadata(meta_id: int, db: Session = Depends(get_db)):
    """
    Fetch metadata by ID
    :param meta_id: Metadata ID
    :param db: Active database session
    :return: Metadata object
    """
    obj = db.query(Metadata).filter(Metadata.id == meta_id).first()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found"
        )
    return obj


@router.put(
    "/db/metadata/{meta_id}", response_model=MetadataResponse, tags=["Metadata"]
)
async def update_metadata(
    meta_id: int, data: MetadataUpdate, db: Session = Depends(get_db)
):
    """
    Update Metadata
    :param meta_id: Metadata ID
    :param data: Metadata data schema
    :param db: Active database session
    :return: Updated Metadata
    """
    async with acquire_lock(f"meta_lock:{meta_id}"):
        obj = db.query(Metadata).filter(Metadata.id == meta_id).first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found"
            )
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj


@router.delete(
    "/db/metadata/{meta_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Metadata"]
)
async def delete_metadata(meta_id: int, db: Session = Depends(get_db)):
    """
    Delete Metadata
    :param meta_id: Metadata ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"meta_lock:{meta_id}"):
        obj = db.query(Metadata).filter(Metadata.id == meta_id).first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found"
            )
        db.delete(obj)
        db.commit()
