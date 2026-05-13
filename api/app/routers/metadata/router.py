"""Router for Metadata Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import metadata_schemas

from .service import MetadataService

router = APIRouter(prefix="/db/metadata", tags=["Machines Metadata"])


@router.post(
    "",
    response_model=metadata_schemas.MetadataResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_metadata(
    meta_data: metadata_schemas.MetadataCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new metadata.

    :param meta_data: Metadata data
    :param ctx: Request context for user and team info
    :return: Metadata object.
    """
    return await MetadataService(ctx.db, ctx).create_metadata(meta_data)


@router.get("", response_model=List[metadata_schemas.MetadataResponse])
async def get_all_metadata(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all metadata records.

    :param ctx: Request context for user and team info
    :return: List of Metadata.
    """
    return await MetadataService(ctx.db, ctx).repo.get_all(ctx.db, ctx)


@router.get("/{meta_id}", response_model=metadata_schemas.MetadataResponse)
async def get_metadata(
    meta_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch metadata by ID.

    :param meta_id: Metadata ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Metadata object.
    """
    return await MetadataService(ctx.db, ctx).get_metadata_or_404(meta_id)


@router.patch("/{meta_id}", response_model=metadata_schemas.MetadataResponse)
async def update_metadata(
    meta_id: int,
    data: metadata_schemas.MetadataUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update Metadata.

    :param meta_id: Metadata ID
    :param data: Metadata data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Metadata.
    """
    return await MetadataService(ctx.db, ctx).update_metadata(meta_id, data)


@router.delete("/{meta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metadata(
    meta_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Metadata.

    :param meta_id: Metadata ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    await MetadataService(ctx.db, ctx).delete_metadata(meta_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
