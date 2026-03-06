"""Router for Disks Database API CRUD."""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db
from app.db.models import Disks, Machines
from app.db.schemas import (
    DiskCreate,
    DiskResponse,
    DiskUpdate,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()


@router.post(
    "/db/disks/",
    response_model=DiskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Disks", "Machines"],
)
async def create_disk(
    disk_data: DiskCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create new Disk
    :param disk_data: Disk data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Disk object
    """

    if not ctx.is_admin:
        if not getattr(disk_data, "machine_id", None):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non-admin users must attach disks to a specific machine.",
            )

    stmt = select(Machines).where(Machines.id == disk_data.machine_id)
    stmt = ctx.team_filter(stmt, Machines)
    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target machine not found or access denied.",
        )

    obj = Disks(**disk_data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/db/disks/", response_model=List[DiskResponse], tags=["Disks"])
async def get_disks(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch all Disks
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all Disks
    """
    ctx.require_user()
    stmt = select(Disks).join(Machines)
    stmt = ctx.team_filter(stmt, Machines)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/db/disks/{disk_id}", response_model=DiskResponse, tags=["Disks"])
async def get_disk_by_id(
    disk_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific disk by ID
    :param disk_id: Disk ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Disk object
    """
    ctx.require_user()
    stmt = select(Disks).join(Machines).filter(Disks.id == disk_id)
    stmt = ctx.team_filter(stmt, Machines)
    result = await db.execute(stmt)
    disk = result.scalar_one_or_none()

    if not disk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disk not found"
        )
    return disk


@router.patch("/db/disks/{disk_id}", response_model=DiskResponse, tags=["Disks"])
async def update_disk(
    disk_id: int,
    disk_data: DiskUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update disk
    :param disk_id: Disk ID
    :param disk_data: Disk data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated disk
    """
    ctx.require_user()
    async with acquire_lock(f"disk_lock:{disk_id}"):
        stmt = select(Disks).join(Machines).filter(Disks.id == disk_id)
        stmt = ctx.team_filter(stmt, Machines)
        result = await db.execute(stmt)
        disk = result.scalar_one_or_none()

        if not disk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Disk not found"
            )
        for k, v in disk_data.model_dump(exclude_unset=True).items():
            setattr(disk, k, v)
        await db.commit()
        await db.refresh(disk)
        return disk


@router.delete(
    "/db/disks/{disk_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Disks"],
)
async def delete_disk(
    disk_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete disk
    :param disk_id: Disk ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_user()
    async with acquire_lock(f"disk_lock:{disk_id}"):
        stmt = select(Disks).join(Machines).filter(Disks.id == disk_id)
        stmt = ctx.team_filter(stmt, Machines)
        result = await db.execute(stmt)
        disk = result.scalar_one_or_none()

        if not disk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Disk not found"
            )
        await db.delete(disk)
        await db.commit()
