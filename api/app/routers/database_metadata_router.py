"""Router for Metadata Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import Metadata, Machines
from app.db.schemas import (
    MetadataCreate,
    MetadataResponse,
    MetadataUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.dependencies import RequestContext

router = APIRouter()


@router.post(
    "/db/metadata/",
    response_model=MetadataResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Metadata"],
)
def create_metadata(
    meta_data: MetadataCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create new metadata
    :param meta_data: Metadata data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Metadata object
    """
    ctx.require_user()
    obj = Metadata(**meta_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/metadata/", response_model=List[MetadataResponse], tags=["Metadata"])
def get_all_metadata(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all metadata records
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of Metadata
    """
    ctx.require_user()
    query = db.query(Machines)
    if not ctx.is_admin:
        query = query.join(Machines).filter(Machines.team_id == ctx.team_id)
    return query.all()


@router.get(
    "/db/metadata/{meta_id}", response_model=MetadataResponse, tags=["Metadata"]
)
def get_metadata(
    meta_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch metadata by ID
    :param meta_id: Metadata ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Metadata object
    """
    ctx.require_user()
    query = db.query(Metadata).filter(Metadata.id == meta_id)
    if not ctx.is_admin:
        query = query.join(Machines).filter(Machines.team_id == ctx.team_id)
    obj = query.first()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metadata not found or access denied",
        )
    return obj


@router.put(
    "/db/metadata/{meta_id}", response_model=MetadataResponse, tags=["Metadata"]
)
async def update_metadata(
    meta_id: int,
    data: MetadataUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update Metadata
    :param meta_id: Metadata ID
    :param data: Metadata data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Metadata
    """
    ctx.require_user()
    async with acquire_lock(f"meta_lock:{meta_id}"):
        query = db.query(Metadata).filter(Metadata.id == meta_id)
        if not ctx.is_admin:
            query = query.join(Machines).filter(Machines.team_id == ctx.team_id)
        obj = query.first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Metadata not found or access denied",
            )
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj


@router.delete(
    "/db/metadata/{meta_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Metadata"]
)
async def delete_metadata(
    meta_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete Metadata
    :param meta_id: Metadata ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_user()
    async with acquire_lock(f"meta_lock:{meta_id}"):
        query = db.query(Metadata).filter(Metadata.id == meta_id)
        if not ctx.is_admin:
            query = query.join(Machines).filter(Machines.team_id == ctx.team_id)
        obj = query.first()

        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Metadata not found or access denied",
            )
        db.delete(obj)
        db.commit()
