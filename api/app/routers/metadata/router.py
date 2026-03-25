"""Router for Metadata Database API CRUD."""

from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
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
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new metadata.

    :param meta_data: Metadata data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Metadata object.
    """
    return await MetadataService(db, ctx).create_metadata(meta_data)


@router.get("", response_model=List[metadata_schemas.MetadataResponse])
async def get_all_metadata(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all metadata records.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of Metadata.
    """
    return await MetadataService(db, ctx).repo.get_all(db, ctx)


@router.get("/{meta_id}", response_model=metadata_schemas.MetadataResponse)
async def get_metadata(
    meta_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch metadata by ID.

    :param meta_id: Metadata ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Metadata object.
    """
    return await MetadataService(db, ctx).get_metadata_or_404(meta_id)


@router.patch("/{meta_id}", response_model=metadata_schemas.MetadataResponse)
async def update_metadata(
    meta_id: int,
    data: metadata_schemas.MetadataUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update Metadata.

    :param meta_id: Metadata ID
    :param data: Metadata data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Metadata.
    """
    return await MetadataService(db, ctx).update_metadata(meta_id, data)


@router.delete("/{meta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metadata(
    meta_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Metadata.

    :param meta_id: Metadata ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    await MetadataService(db, ctx).delete_metadata(meta_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
