"""Router for Tags Database API CRUD."""

from typing import List

from app.database import get_db
from app.db.models import Tags, Machines, Rack, Rooms, Documentation
from app.db.schemas import TagsCreate, TagsUpdate, TagsResponse, TagsAssignment
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()

ENTITY_MAP = {
    "machine": Machines,
    "rack": Rack,
    "room": Rooms,
    "documentation": Documentation,
}


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
    ctx.require_user()
    query = db.query(Tags).all()
    return query


@router.post("/db/tags/assign", status_code=status.HTTP_200_OK, tags=["Tags"])
async def assign_tag(
    data: TagsAssignment, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    ctx.require_user()

    model = ENTITY_MAP.get(data.entity_type.lower())
    if not model:
        raise HTTPException(status_code=400, detail="Invalid entity type")

    query = db.query(model).filter(model.id == data.entity_id)

    if data.entity_type.lower() == "documentation":
        entity = query.first()
    else:
        entity = ctx.team_filter(query, model).first()

    if not entity:
        raise HTTPException(
            status_code=404, detail=f"{data.entity_type} not found or access denied"
        )

    tag_list = db.query(Tags).filter(Tags.id.in_(data.tag_ids)).all()
    if not tag_list:
        raise HTTPException(status_code=404, detail="Tag not found")

    new_tags = set(tag_list) - set(entity.tags)
    if new_tags:
        entity.tags.extend(new_tags)
        db.commit()

    return {f"Tags assigned to {data.entity_type}"}


@router.post("/db/tags/detach", status_code=status.HTTP_200_OK, tags=["Tags"])
async def detach_tag(
    data: TagsAssignment, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    ctx.require_user()

    model = ENTITY_MAP.get(data.entity_type.lower())
    entity = db.query(model).filter(model.id == data.entity_id).first()

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    tag = db.query(Tags).filter(Tags.id == data.tag_ids[0]).first()

    if tag in entity.tags:
        entity.tags.remove(tag)
        db.commit()

    return {f"Tag {tag.name} detached from {data.entity_type}"}


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
    ctx.require_group_admin()
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
    ctx.require_user()
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
    ctx.require_group_admin()
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
    ctx.require_group_admin()
    async with acquire_lock(f"tag_lock:{tag_id}"):
        query = db.query(Tags).filter(Tags.id == tag_id)
        tag = query.first()
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
            )
        db.delete(tag)
        db.commit()
