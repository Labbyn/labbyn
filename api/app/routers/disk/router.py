from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import disk_schemas
from .service import DiskService

router = APIRouter(prefix="/db/disks", tags=["Disks"])

@router.post("", response_model=disk_schemas.DiskResponse, status_code=status.HTTP_201_CREATED)
async def create_disk(
    disk_data: disk_schemas.DiskCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new Disk.

    :param disk_data: Disk data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Disk object.
    """
    return await DiskService(db, ctx).create_disk(disk_data)

@router.get("", response_model=List[disk_schemas.DiskResponse])
async def get_disks(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all Disks.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all Disks.
    """
    return await DiskService(db, ctx).repo.get_all(db, ctx)

@router.get("/{disk_id}", response_model=disk_schemas.DiskResponse)
async def get_disk_by_id(
    disk_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific disk by ID.

    :param disk_id: Disk ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Disk object.
    """
    return await DiskService(db, ctx).get_disk_or_404(disk_id)

@router.patch("/{disk_id}", response_model=disk_schemas.DiskResponse)
async def update_disk(
    disk_id: int,
    disk_data: disk_schemas.DiskUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update disk.

    :param disk_id: Disk ID
    :param disk_data: Disk data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated disk.
    """
    return await DiskService(db, ctx).update_disk(disk_id, disk_data)

@router.delete("/{disk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disk(
    disk_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete disk.

    :param disk_id: Disk ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    await DiskService(db, ctx).delete_disk(disk_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)