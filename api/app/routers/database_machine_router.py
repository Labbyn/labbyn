"""Router for Machine Database API CRUD."""

from typing import List

from app.database import get_db
from app.db.models import Machines, User, UserType
from app.db.schemas import (
    MachinesCreate,
    MachinesResponse,
    MachinesUpdate,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/machines/",
    response_model=MachinesResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Machines"],
)
def create_machine(
    machine_data: MachinesCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create and add new machine to database
    :param machine_data: Machine data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object
    """
    data = machine_data.model_dump()
    if not ctx.is_admin:
        data["team_id"] = ctx.team_id
    obj = Machines(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/machines/", response_model=List[MachinesResponse], tags=["Machines"])
def get_machines(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all machines
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of machines
    """
    query = db.query(Machines)
    query = ctx.team_filter(query, Machines)
    return query.all()


@router.get(
    "/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"]
)
def get_machine_by_id(
    machine_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific machine by ID
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object
    """
    query = db.query(Machines).filter(Machines.id == machine_id)
    query = ctx.team_filter(query, Machines)
    machine = query.first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found or access denied",
        )
    return machine


@router.put(
    "/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"]
)
async def update_machine(
    machine_id: int,
    machine_data: MachinesUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update machine data
    :param machine_id: Machine ID
    :param machine_data: Machine data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Machine
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        query = db.query(Machines).filter(Machines.id == machine_id).first()
        query = ctx.team_filter(query, Machines)
        machine = query.first()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found or access denied",
            )
        update_data = machine_data.model_dump(exclude_unset=True)
        if not ctx.is_admin and "team_id" in update_data:
            update_data["team_id"] = ctx.team_id

        for k, v in update_data.items():
            setattr(machine, k, v)

        db.commit()
        db.refresh(machine)
        return machine


@router.delete(
    "/db/machines/{machine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Machines"],
)
async def delete_machine(
    machine_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete Machine
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        query = db.Query(Machines).filter(Machines.id == machine_id)
        query = ctx.team_filter(query, Machines)
        machine = query.first()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found or access denied",
            )
        db.delete(machine)
        db.commit()
