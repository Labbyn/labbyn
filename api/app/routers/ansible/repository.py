from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models

class AnsibleRepository:
    """Repository for handling database operations related to Ansible discovery and machines.
    
    This class provides static methods to interact with Machines, Rooms, Metadata, 
    and hardware components (CPUs, Disks) using SQLAlchemy.
    """

    @staticmethod
    async def get_room_by_name_and_team(db: AsyncSession, name: str, team_id: int):
        """Retrieve a room by its name and associated team ID.

        :param db: Active asynchronous database session.
        :param name: The name of the room to search for.
        :param team_id: The ID of the team owning the room.
        :return: Room model instance or None if not found.
        """
        res = await db.execute(
            sql.select(models.Rooms).filter(
                models.Rooms.name == name,
                models.Rooms.team_id == team_id
            )
        )
        return res.scalar_one_or_none()

    @staticmethod
    async def get_machine_by_name(db: AsyncSession, name: str, ctx):
        """Retrieve a machine by its name, applying team-level security filters.

        :param db: Active asynchronous database session.
        :param name: Hostname or name of the machine.
        :param ctx: Request context used for applying team access filters.
        :return: Machine model instance or None if not found or access denied.
        """
        stmt = sql.select(models.Machines).filter(models.Machines.name == name)
        stmt = ctx.team_filter(stmt, models.Machines)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_machine_by_id(db: AsyncSession, machine_id: int, ctx):
        """Retrieve a machine by its unique ID, applying team-level security filters.

        :param db: Active asynchronous database session.
        :param machine_id: The primary key ID of the machine.
        :param ctx: Request context used for applying team access filters.
        :return: Machine model instance or None if not found or access denied.
        """
        stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
        res = await db.execute(ctx.team_filter(stmt, models.Machines))
        return res.scalar_one_or_none()

    @staticmethod
    async def get_metadata_by_id(db: AsyncSession, metadata_id: int):
        """Retrieve metadata entry by its ID.

        :param db: Active asynchronous database session.
        :param metadata_id: The primary key ID of the metadata.
        :return: Metadata model instance or None if not found.
        """
        res = await db.execute(
            sql.select(models.Metadata).where(models.Metadata.id == metadata_id)
        )
        return res.scalar_one_or_none()

    @staticmethod
    async def sync_hardware(db: AsyncSession, machine_id: int, specs: dict):
        """Synchronize CPUs and Disks for a machine.
        
        This method performs a 'delete-and-insert' strategy: it removes all existing 
        CPU and Disk records for the given machine_id and replaces them with new 
        data from the provided specs dictionary.

        :param db: Active asynchronous database session.
        :param machine_id: The ID of the machine to update.
        :param specs: Dictionary containing hardware specifications (cpus and disks lists).
        """
        # Remove existing CPUs and add new ones
        await db.execute(
            sql.delete(models.CPUs).where(models.CPUs.machine_id == machine_id)
        )
        for cpu_data in specs.get("cpus", []):
            db.add(models.CPUs(name=cpu_data["name"], machine_id=machine_id))

        await db.execute(
            sql.delete(models.Disks).where(models.Disks.machine_id == machine_id)
        )
        for disk_data in specs.get("disks", []):
            db.add(
                models.Disks(
                    name=disk_data["name"],
                    capacity=disk_data.get("capacity"),
                    machine_id=machine_id,
                )
            )