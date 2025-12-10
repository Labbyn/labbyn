"""Router for Machine Database API CRUD."""
from typing import List

from app.database import get_db
from app.db.models import (
    Machines
)
from app.db.schemas import (
    MachinesCreate,
    MachinesResponse,
    MachinesUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()

@router.post(
    "/db/machines/",
    response_model=MachinesResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Machines"],
)
def create_machine(machine_data: MachinesCreate, db: Session = Depends(get_db)):
    """
    Create and add new machine to database
    :param machine_data: Machine data
    :param db: Active database session
    :return: Machine object
    """
    obj = Machines(**machine_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/machines/", response_model=List[MachinesResponse], tags=["Machines"])
def get_machines(db: Session = Depends(get_db)):
    """
    Fetch all machines
    :param db: Active database session
    :return: List of machines
    """
    return db.query(Machines).all()


@router.get(
    "/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"]
)
def get_machine_by_id(machine_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific machine by ID
    :param machine_id: Machine ID
    :param db: Active database session
    :return: Machine object
    """
    machine = db.query(Machines).filter(Machines.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found"
        )
    return machine


@router.put(
    "/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"]
)
async def update_machine(
    machine_id: int, machine_data: MachinesUpdate, db: Session = Depends(get_db)
):
    """
    Update machine data
    :param machine_id: Machine ID
    :param machine_data: Machine data schema
    :param db: Active database session
    :return: Updated Machine
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = db.query(Machines).filter(Machines.id == machine_id).first()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found"
            )
        for k, v in machine_data.model_dump(exclude_unset=True).items():
            setattr(machine, k, v)
        db.commit()
        db.refresh(machine)
        return machine


@router.delete(
    "/db/machines/{machine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Machines"],
)
async def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    """
    Delete Machine
    :param machine_id: Machine ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = db.query(Machines).filter(Machines.id == machine_id).first()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found"
            )
        db.delete(machine)
        db.commit()