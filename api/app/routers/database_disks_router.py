"""Router for Disks Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import Disks, Machines
from app.db.schemas import (
    DiskCreate,
    DiskResponse,
    DiskUpdate,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/disks/",
    response_model=DiskCreate,
    status_code=status.HTTP_201_CREATED,
    tags=["Disks", "Machines"],
)
def create_disk(
    disk_data: DiskCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
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

    machine = db.query(Machines).filter(Machines.id == disk_data.machine_id)
    machine = ctx.team_filter(machine, Machines).first()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target machine not found or access denied.",
        )

    obj = Disks(**disk_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/disks/", response_model=List[DiskResponse], tags=["Disks"])
def get_disks(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all Disks
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all Disks
    """
    query = db.query(Disks).join(Machines)
    query = ctx.team_filter(query, Machines)
    return db.query(Disks).all()


@router.get("/db/disks/{disk_id}", response_model=DiskResponse, tags=["Disks"])
def get_disk_by_id(
    disk_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific disk by ID
    :param disk_id: Disk ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Disk object
    """

    query = db.query(Disks).join(Machines).filter(Disks.id == disk_id)
    query = ctx.team_filter(query, Machines)
    disk = query.first()

    if not disk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Disk not found"
        )
    return disk


@router.put("/db/disks/{disk_id}", response_model=DiskResponse, tags=["Disks"])
async def update_disk(
    disk_id: int,
    disk_data: DiskUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update disk
    :param disk_id: Disk ID
    :param disk_data: Disk data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated disk
    """

    async with acquire_lock(f"disk_lock:{disk_id}"):
        query = db.query(Disks).join(Machines).filter(Disks.id == disk_id)
        query = ctx.team_filter(query, Machines)
        disk = query.first()
        if not disk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Disk not found"
            )
        for k, v in disk_data.model_dump(exclude_unset=True).items():
            setattr(disk, k, v)
        db.commit()
        db.refresh(disk)
        return disk


@router.delete(
    "/db/disks/{disk_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Disks"],
)
async def delete_disk(
    disk_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete disk
    :param disk_id: Disk ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """

    async with acquire_lock(f"disk_lock:{disk_id}"):
        query = db.query(Disks).join(Machines).filter(Disks.id == disk_id)
        query = ctx.team_filter(query, Machines)
        disk = query.first()
        if not disk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Disk not found"
            )
        db.delete(disk)
        db.commit()
