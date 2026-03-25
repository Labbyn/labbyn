from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service
from .repository import CPURepository


class CPUService:
    """Service for managing CPU units and their assignments to machines.

    This service handles business logic, authorization checks, and
    concurrency locking for CPU-related operations.
    """

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init CPU Service.

        Args:
            db (AsyncSession): Active database session.
            ctx (RequestContext): User request context for security and team filtering.
        """
        self.db = db
        self.ctx = ctx
        self.repo = CPURepository()

    async def get_cpu_or_404(self, cpu_id: int) -> models.CPUs:
        """Internal helper to fetch CPU or raise 404.

        :param cpu_id: Unique ID of the CPU to find.
        :return: CPU model instance.
        """
        self.ctx.require_user()
        cpu = await self.repo.get_by_id(self.db, cpu_id, self.ctx)
        if not cpu:
            raise exceptions.ObjectNotFoundError("CPU")
        return cpu

    async def create_cpu(self, cpu_data):
        """Create new CPU and attach it to a machine.

        :param cpu_data: CPU creation schema (Pydantic model).
        :return: Newly created CPU model instance.
        """
        self.ctx.require_user()

        if not self.ctx.is_admin and not getattr(cpu_data, "machine_id", None):
            raise exceptions.AccessDeniedError(
                "Non-admin users must attach CPUs to a specific machine."
            )

        machine = await self.repo.get_machine_for_cpu(
            self.db, cpu_data.machine_id, self.ctx
        )
        if not machine:
            raise exceptions.ObjectNotFoundError("Machine for this CPU")

        try:
            obj = models.CPUs(**cpu_data.model_dump())
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to add CPU '{cpu_data.name}' to machine '{machine.name}'"
            ) from e

    async def update_cpu(self, cpu_id: int, cpu_data):
        """Update CPU data with record locking.

        :param cpu_id: Unique ID of the CPU to update.
        :param cpu_data: Schema containing fields to be updated.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"cpu_lock:{cpu_id}"):
            cpu = await self.get_cpu_or_404(cpu_id)
            try:
                for k, v in cpu_data.model_dump(exclude_unset=True).items():
                    setattr(cpu, k, v)
                await self.db.commit()
                await self.db.refresh(cpu)
                return cpu
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Update failed for CPU '{cpu.name}'"
                ) from e

    async def delete_cpu(self, cpu_id: int):
        """Delete CPU unit from a machine.

        :param cpu_id: Unique ID of the CPU to delete.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"cpu_lock:{cpu_id}"):
            cpu = await self.get_cpu_or_404(cpu_id)
            try:
                await self.db.delete(cpu)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete CPU '{cpu.name}'"
                ) from e
