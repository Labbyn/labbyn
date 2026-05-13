"""Router for Tags Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import tag_schemas

from .service import TagService

router = APIRouter(prefix="/db/tags", tags=["Tags"])


@router.get("", response_model=List[tag_schemas.TagsResponse])
async def get_tags(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all available tags.

    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    return await TagService(ctx.db, ctx).repo.get_all(ctx.db)


@router.post(
    "", response_model=tag_schemas.TagsResponse, status_code=status.HTTP_201_CREATED
)
async def create_tag(
    tag_data: tag_schemas.TagsCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all tags.

    :param tag_data: Tag data schema
    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    return await TagService(ctx.db, ctx).create_tag(tag_data)


@router.post("/assign", status_code=status.HTTP_200_OK)
async def assign_tag(
    data: tag_schemas.TagsAssignment,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Assign tag to object.

    Can be used for machine, rack, room and documentation objects

    :param data: Tag assignment data
    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    return await TagService(ctx.db, ctx).assign_tags(data)


@router.post("/detach", status_code=status.HTTP_200_OK)
async def detach_tag(
    data: tag_schemas.TagsAssignment,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Detach tag from object.

    Can be used for machine, rack, room and documentation objects

    :param data: Tag assignment data
    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    return await TagService(ctx.db, ctx).detach_tag(data)


@router.get("/{tag_id}", response_model=tag_schemas.TagsResponse)
async def get_tag_by_id(
    tag_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get specific tag by ID.

    :param tag_id: Tag ID
    :param ctx: Request context for user and team info
    :return: Tag object.
    """
    return await TagService(ctx.db, ctx).get_tag_or_404(tag_id)


@router.patch("/{tag_id}", response_model=tag_schemas.TagsResponse)
async def update_tag(
    tag_id: int,
    tag_data: tag_schemas.TagsUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update tag data.

    :param tag_id: Tag ID
    :param tag_data: Tag data schema
    :param ctx: Request context for user and team info
    :return: Updated tag.
    """
    return await TagService(ctx.db, ctx).update_tag(tag_id, tag_data)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete tag.

    :param tag_id: Tag ID
    :param ctx: Request context for user and team info
    :return: None.
    """
    await TagService(ctx.db, ctx).delete_tag(tag_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
