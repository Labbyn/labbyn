"""Router for CPUs Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import cpu_schemas

from .service import CPUService

router = APIRouter(prefix="/db/cpus", tags=["CPUs"])


@router.post(
    "", response_model=cpu_schemas.CPUResponse, status_code=status.HTTP_201_CREATED
)
async def create_cpu(
    cpu_data: cpu_schemas.CPUCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new CPU.

    :param cpu_data: CPU data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: CPU object.
    """
    return await CPUService(ctx.db, ctx).create_cpu(cpu_data)


@router.get("", response_model=List[cpu_schemas.CPUResponse])
async def get_cpus(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all CPUs.

    :param ctx: Request context for user and team info
    :return: List of all CPUs.
    """
    return await CPUService(ctx.db, ctx).repo.get_all(ctx.db, ctx)


@router.get("/{cpu_id}", response_model=cpu_schemas.CPUResponse)
async def get_cpu_by_id(
    cpu_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific CPU by ID.

    :param cpu_id: CPU ID
    :param ctx: Request context for user and team info
    :return: CPU object.
    """

    return await CPUService(ctx.db, ctx).get_cpu_or_404(cpu_id)


@router.patch("/{cpu_id}", response_model=cpu_schemas.CPUResponse)
async def update_cpu(
    cpu_id: int,
    cpu_data: cpu_schemas.CPUUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update CPU.

    :param cpu_id: CPU ID
    :param cpu_data: CPU data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated CPU.
    """
    return await CPUService(ctx.db, ctx).update_cpu(cpu_id, cpu_data)


@router.delete("/{cpu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cpu(
    cpu_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete CPU.

    :param cpu_id: CPU ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    await CPUService(ctx.db, ctx).delete_cpu(cpu_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
