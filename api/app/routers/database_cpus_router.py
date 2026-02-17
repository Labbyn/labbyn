"""Router for CPUs Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import CPUs
from app.db.schemas import (
    CPUCreate,
    CPUResponse,
    CPUUpdate,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/cpus/",
    response_model=CPUResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Cpus", "Machines"],
)
def create_cpu(
    cpu_data: CPUCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create new CPU
    :param cpu_data: CPU data
    :param db: Active database session
    :return: CPU object
    """

    ctx.require_admin()

    obj = CPUs(**cpu_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/cpus/", response_model=List[CPUResponse], tags=["Cpus", "Machines"])
def get_cpus(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all CPUs
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all CPUs
    """
    return db.query(CPUs).all()


@router.get("/db/cpus/{cpu_id}", response_model=CPUResponse, tags=["Cpus", "Machines"])
def get_cpu_by_id(
    cpu_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific CPU by ID
    :param cpu_id: CPU ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: CPU object
    """
    cpu = db.query(CPUs).filter(CPUs.id == cpu_id).first()
    if not cpu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CPU not found"
        )
    return cpu


@router.put("/db/cpus/{cpu_id}", response_model=CPUResponse, tags=["Cpus", "Machines"])
async def update_cpu(
    cpu_id: int,
    cpu_data: CPUUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update CPU
    :param cpu_id: CPU ID
    :param cpu_data: CPU data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated CPU
    """

    ctx.require_admin()

    async with acquire_lock(f"cpu_lock:{cpu_id}"):
        cpu = db.query(CPUs).filter(CPUs.id == cpu_id).first()
        if not cpu:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CPU not found"
            )
        for k, v in cpu_data.model_dump(exclude_unset=True).items():
            setattr(cpu, k, v)
        db.commit()
        db.refresh(cpu)
        return cpu


@router.delete(
    "/db/cpus/{cpu_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Cpus", "Machines"],
)
async def delete_cpu(
    cpu_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete CPU
    :param cpu_id: CPU ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """

    ctx.require_admin()

    async with acquire_lock(f"CPU_lock:{cpu_id}"):
        cpu = db.query(CPUs).filter(CPUs.id == cpu_id).first()
        if not cpu:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CPU not found"
            )
        db.delete(cpu)
        db.commit()
