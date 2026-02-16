"""Router for Tags Database API CRUD."""

from typing import List

from app.database import get_db
from app.db.models import Tags
from app.db.schemas import (
    TagsCreate,
    TagsUpdate,
    TagsResponse,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

router = APIRouter()


@router.get(
    "/db/tags/",
    response_model=List[TagsResponse],
    tags=["Tags"],
)
def get_tags(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Get all tags from DB
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all tags
    """
    query = db.query(Tags).all()
    return query


@router.post(
    "/db/tags/",
    response_model=TagsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Tags"],
)
def create_tag(
    tag_data: TagsCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create new tag
    :param data: Tag data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New tag item
    """
    obj = Tags(**tag_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


@router.get(
    "/db/tags/{tag_id}",
    response_model=TagsResponse,
    tags=["Tags"],
)
def get_tag_by_id(
    tag_id: int,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Get specific tag from DB by ID
    :param tag_id: Tag ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Tag object
    """
    query = db.query(Tags).filter(Tags.id == tag_id)
    tag = query.first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
        )
    return tag


@router.put(
    "/db/tags/{tag_id}",
    response_model=TagsResponse,
    tags=["Tags"],
)
async def update_tag(
    tag_id: int,
    tag_data: TagsUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update tag data
    :param tag_id: Tag ID
    :param tag_data: Tag data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated tag
    """
    async with acquire_lock(f"tag_lock:{tag_id}"):
        query = db.query(Tags).filter(Tags.id == tag_id)
        tag = query.first()
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
            )
        update_data = tag_data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(tag, k, v)
        db.commit()
        db.refresh(tag)
        return tag


@router.delete(
    "/db/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Tags"],
)
async def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Delete tag
    :param tag_id: Tag ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    async with acquire_lock(f"tag_lock:{tag_id}"):
        query = db.query(Tags).filter(Tags.id == tag_id)
        tag = query.first()
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
            )
        db.delete(tag)
        db.commit()
