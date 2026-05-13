"""Router for Machine Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import machine_schemas

from .service import MachineService

router = APIRouter(prefix="/db/machines", tags=["Machines"])


@router.post(
    "",
    response_model=machine_schemas.MachinesResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_machine(
    machine_data: machine_schemas.MachinesCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new machine to database.

    :param machine_data: Machine data
    :param ctx: Request context for user and team info
    :return: Machine object.
    """
    return await MachineService(ctx.db, ctx).create_machine(machine_data)


@router.get("", response_model=List[machine_schemas.MachinesResponse])
async def get_machines(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all machines.

    :param ctx: Request context for user and team info
    :return: List of machines.
    """
    return await MachineService(ctx.db, ctx).repo.get_all(ctx.db, ctx)


@router.get("/{machine_id}", response_model=machine_schemas.MachinesResponse)
async def get_machine_by_id(
    machine_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific machine by ID.

    :param machine_id: Machine ID
    :param ctx: Request context for user and team info
    :return: Machine object.
    """
    return await MachineService(ctx.db, ctx).get_machine_or_404(machine_id)


@router.get(
    "/{machine_id}/full", response_model=machine_schemas.MachineFullDetailResponse
)
async def get_machine_full_detail(
    machine_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific machine by ID.

    :param machine_id: Machine ID
    :param ctx: Request context for user and team info
    :return: Machine object.
    """
    return await MachineService(ctx.db, ctx).get_full_detail(machine_id)


@router.patch("/{machine_id}", response_model=machine_schemas.MachinesResponse)
async def update_machine(
    machine_id: int,
    machine_data: machine_schemas.MachinesUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update machine data.

    :param machine_id: Machine ID
    :param machine_data: Machine data schema
    :param ctx: Request context for user and team info
    :return: Updated Machine.
    """
    return await MachineService(ctx.db, ctx).update_machine(machine_id, machine_data)


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Machine.

    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    await MachineService(ctx.db, ctx).delete_machine(machine_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{machine_id}/mount/{shelf_id}", status_code=status.HTTP_200_OK)
async def mount_machine(
    machine_id: int,
    shelf_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Mounts a machine onto a specific shelf.

    :param machine_id: ID of the machine to mount
    :param shelf_id: ID of the target shelf
    :param ctx: Request context for authorization
    :return: Status message.
    """
    return await MachineService(ctx.db, ctx).mount_machine(machine_id, shelf_id)


@router.post("/{machine_id}/unmount", status_code=status.HTTP_200_OK)
async def unmount_machine(
    machine_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Removes a machine from its current shelf (sets shelf_id to NULL).

    :param machine_id: ID of the machine to unmount
    :param ctx: Request context for team-based access control
    :return: Status message.
    """
    return await MachineService(ctx.db, ctx).unmount_machine(machine_id)
