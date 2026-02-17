"""Router for CPUs Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import CPUs, Machines
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
    tags=["Cpus"],
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
    :param ctx: Request context for user and team info
    :return: CPU object
    """

    if not ctx.is_admin:
        if not getattr(cpu_data, "machine_id", None):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non-admin users must attach CPUs to a specific machine.",
            )

    machine = db.query(Machines).filter(Machines.id == cpu_data.machine_id)
    machine = ctx.team_filter(machine, Machines).first()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target machine not found or access denied.",
        )

    obj = CPUs(**cpu_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/cpus/", response_model=List[CPUResponse], tags=["Cpus"])
def get_cpus(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all CPUs
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all CPUs
    """

    query = db.query(CPUs).join(Machines)
    query = ctx.team_filter(query, Machines)
    return db.query(CPUs).all()


@router.get("/db/cpus/{cpu_id}", response_model=CPUResponse, tags=["Cpus"])
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

    query = db.query(CPUs).join(Machines).filter(CPUs.id == cpu_id)
    query = ctx.team_filter(query, Machines)
    cpu = query.first()

    if not cpu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CPU not found"
        )
    return cpu


@router.put("/db/cpus/{cpu_id}", response_model=CPUResponse, tags=["Cpus"])
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
        query = db.query(CPUs).join(Machines).filter(CPUs.id == cpu_id)
        query = ctx.team_filter(query, Machines)
        cpu = query.first()
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
    tags=["Cpus"],
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
        query = db.query(CPUs).join(Machines).filter(CPUs.id == cpu_id)
        query = ctx.team_filter(query, Machines)
        cpu = query.first()

        if not cpu:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CPU not found"
            )
        db.delete(cpu)
        db.commit()
