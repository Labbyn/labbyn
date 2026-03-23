"""Router for CPUs Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import cpu_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["CPUs"])


@router.post(
    "/cpus",
    response_model=cpu_schemas.CPUResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_cpu(
    cpu_data: cpu_schemas.CPUCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new CPU.

    :param cpu_data: CPU data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: CPU object.
    """
    ctx.require_user()

    if not ctx.is_admin:
        if not getattr(cpu_data, "machine_id", None):
            raise exceptions.AccessDeniedError(
                "Non-admin users must attach CPUs to a specific machine."
            )

    stmt = sql.select(models.Machines).where(models.Machines.id == cpu_data.machine_id)
    stmt = ctx.team_filter(stmt, models.Machines)
    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise exceptions.ObjectNotFoundError("Machine for this CPU")

    try:
        obj = models.CPUs(**cpu_data.model_dump())
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            f"Failed to add CPU '{cpu_data.name}' to machine '{machine.name}'"
        ) from e


@router.get("/cpus", response_model=List[cpu_schemas.CPUResponse])
async def get_cpus(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all CPUs.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all CPUs.
    """
    ctx.require_user()

    stmt = sql.select(models.CPUs).join(models.Machines)
    stmt = ctx.team_filter(stmt, models.Machines)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/cpus/{cpu_id}", response_model=cpu_schemas.CPUResponse)
async def get_cpu_by_id(
    cpu_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific CPU by ID.

    :param cpu_id: CPU ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: CPU object.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.CPUs).join(models.Machines).filter(models.CPUs.id == cpu_id)
    )
    stmt = ctx.team_filter(stmt, models.Machines)
    result = await db.execute(stmt)
    cpu = result.scalar_one_or_none()

    if not cpu:
        raise exceptions.ObjectNotFoundError("CPU")
    return cpu


@router.patch("/cpus/{cpu_id}", response_model=cpu_schemas.CPUResponse)
async def update_cpu(
    cpu_id: int,
    cpu_data: cpu_schemas.CPUUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update CPU.

    :param cpu_id: CPU ID
    :param cpu_data: CPU data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated CPU.
    """
    ctx.require_user()

    async with redis_service.acquire_lock(f"cpu_lock:{cpu_id}"):
        stmt = (
            sql.select(models.CPUs)
            .options(orm.selectinload(models.CPUs.machine))
            .join(models.Machines)
            .filter(models.CPUs.id == cpu_id)
        )
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        cpu = result.scalar_one_or_none()

        if not cpu:
            raise exceptions.ObjectNotFoundError("CPU")

        try:
            for k, v in cpu_data.model_dump(exclude_unset=True).items():
                setattr(cpu, k, v)
            await db.commit()
            await db.refresh(cpu)
            return cpu
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Update failed for CPU '{cpu.name}' on machine '{cpu.machine.name}'"
            ) from e


@router.delete(
    "/cpus/{cpu_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cpu(
    cpu_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete CPU.

    :param cpu_id: CPU ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    ctx.require_user()

    async with redis_service.acquire_lock(f"cpu_lock:{cpu_id}"):
        stmt = (
            sql.select(models.CPUs)
            .options(orm.selectinload(models.CPUs.machine))
            .join(models.Machines)
            .filter(models.CPUs.id == cpu_id)
        )
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        cpu = result.scalar_one_or_none()

        if not cpu:
            raise exceptions.ObjectNotFoundError("CPU")

        try:
            await db.delete(cpu)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete CPU '{cpu.name}' from {cpu.machine.name}"
            ) from e
