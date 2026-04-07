from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db import models


class ExportRepository:
    """Repository for fetching all system entities with preloaded relationships."""

    def __init__(self):
        """Init the repository.

        Map tables with known relationship.
        """
        self._load_options = {
            "machines": [
                selectinload(models.Machines.room),
                selectinload(models.Machines.team),
                selectinload(models.Machines.cpus),
                selectinload(models.Machines.disks),
                selectinload(models.Machines.machine_metadata),
                selectinload(models.Machines.shelf).selectinload(models.Shelf.rack),
                selectinload(models.Machines.tags),
            ],
            "racks": [
                selectinload(models.Rack.room),
                selectinload(models.Rack.team),
                selectinload(models.Rack.shelves),
                selectinload(models.Rack.tags),
            ],
            "inventory": [
                selectinload(models.Inventory.room),
                selectinload(models.Inventory.team),
                selectinload(models.Inventory.category),
                selectinload(models.Inventory.machine),
            ],
            "rooms": [selectinload(models.Rooms.team), selectinload(models.Rooms.tags)],
            "rentals": [
                selectinload(models.Rentals.user),
                selectinload(models.Rentals.inventory).selectinload(
                    models.Inventory.team
                ),
            ],
            "user": [
                selectinload(models.User.teams).selectinload(models.UsersTeams.team)
            ],
            "teams": [
                selectinload(models.Teams.users).selectinload(models.UsersTeams.user)
            ],
            "maps": [
                selectinload(models.Map.room),
                selectinload(models.Map.nodes),
                selectinload(models.Map.segments),
                selectinload(models.Map.labels),
                selectinload(models.Map.equipment).selectinload(models.Equipment.rack),
            ],
            "history": [selectinload(models.History.user)],
            "tags": [],
            "categories": [],
            "documentation": [selectinload(models.Documentation.tags)],
        }

        self._model_map = {
            "machines": models.Machines,
            "racks": models.Rack,
            "inventory": models.Inventory,
            "rooms": models.Rooms,
            "rentals": models.Rentals,
            "user": models.User,
            "teams": models.Teams,
            "maps": models.Map,
            "tags": models.Tags,
            "categories": models.Categories,
            "documentation": models.Documentation,
            "history": models.History,
        }

    async def get_by_entity_type(self, db: AsyncSession, entity_type: str):
        """Fetches all entities matching the given entity type.

        :param db: Database session
        :param entity_type: entity type to fetch
        """
        model = self._model_map.get(entity_type)
        if not model:
            return []

        stmt = select(model)
        options = self._load_options.get(entity_type, [])
        if options:
            stmt = stmt.options(*options)

        result = await db.execute(stmt)

        return result.scalars().unique().all()

    async def get_full_bundle(self, db: AsyncSession):
        """Fetch all entities matching the given entity type.

        :param db: Database session
        """
        entities_to_bundle = [
            "user",
            "teams",
            "tags",
            "categories",
            "rooms",
            "racks",
            "machines",
            "inventory",
            "maps",
            "documentation",
            "history",
        ]

        bundle = {}
        for entity in entities_to_bundle:
            bundle[entity] = await self.get_by_entity_type(db, entity)

        return bundle
