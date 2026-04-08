from datetime import datetime
from fastapi import HTTPException, status
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models
from app.core import exceptions
from .repository import ImportRepository


class ImportService:
    """Service for handling complex CSV import operations for various system entities.

    This service manages atomic row-by-row imports, ensuring that relationships
    are resolved via human-readable names and that every successful operation
    is tracked in the system history.
    """

    def __init__(self, db: AsyncSession, ctx):
        """Initialize the Import Service.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing user authorization and team information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = ImportRepository()

    async def run_import(
        self, entity_type: str, data: List[Dict[str, Any]], ui_team_id: int
    ) -> Dict[str, Any]:
        """Execute a bulk import for a specific entity type using nested transactions.

        :param entity_type: Type of entity to import ('machines', 'racks', 'inventory').
        :param data: List of dictionaries representing rows from the CSV file.
        :param ui_team_id: Default team ID selected in the UI if CSV doesn't specify one.
        :return: A dictionary containing a summary of success/failure and detailed logs for each row.
        """
        results = {
            "summary": {"total": len(data), "success": 0, "failed": 0},
            "details": [],
        }

        processors = {
            "machines": self._process_machine,
            "racks": self._process_rack,
            "inventory": self._process_inventory,
        }

        process_fn = processors.get(entity_type)
        if not process_fn:
            raise exceptions.ValidationError(f"Unsupported entity type: {entity_type}")

        for index, row in enumerate(data):
            try:
                async with self.db.begin_nested():
                    t_id = ui_team_id
                    if row.get("team_name"):
                        team = await self.repo.get_team_by_name(
                            self.db, row["team_name"]
                        )
                        if not team:
                            raise exceptions.ObjectNotFoundError(
                                "Team", row["team_name"]
                            )

                        if not self.ctx.is_admin and team.id not in self.ctx.team_ids:
                            raise exceptions.AccessDeniedError(
                                f"No access to team '{row['team_name']}'"
                            )

                        t_id = team.id

                    name = await process_fn(row, t_id)
                    results["summary"]["success"] += 1
                    results["details"].append(
                        {"row": index + 1, "name": name, "status": "success"}
                    )
            except (exceptions.AppBaseException, Exception) as e:
                results["summary"]["failed"] += 1
                error_msg = e.message if hasattr(e, "message") else str(e)
                results["details"].append(
                    {
                        "row": index + 1,
                        "name": row.get("name", "Unknown"),
                        "status": "failed",
                        "error": error_msg,
                    }
                )

        await self.db.commit()
        if len(data) > 0 and results["summary"]["success"] == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results  # Przekazujemy całą strukturę z błędami wierszy
            )

        return results

    async def _process_inventory(self, row: Dict[str, Any], t_id: int) -> str:
        """Process a single inventory item row with full relationship mapping.

        Maps to: Room (Required), Category (Required), Machine (Optional).
        """
        room = await self.repo.get_room_by_name(self.db, row.get("room_name"), t_id)
        if not room:
            raise exceptions.ObjectNotFoundError("Room", row.get("room_name"))

        cat_name = row.get("category_name", "General")
        cat = await self.repo.get_category_by_name(self.db, cat_name)
        if not cat:
            raise exceptions.ObjectNotFoundError("Category", cat_name)

        m_id = None
        if row.get("machine_name"):
            m = await self.repo.get_machine_by_name(self.db, row["machine_name"], t_id)
            if not m:
                raise exceptions.ObjectNotFoundError("Machine", row["machine_name"])
            m_id = m.id

        obj = models.Inventory(
            name=row["name"],
            quantity=int(row.get("quantity", 1)),
            team_id=t_id,
            localization_id=room.id,
            category_id=cat.id,
            machine_id=m_id,
            rental_status=bool(row.get("rental_status", False)),
        )

        self.db.add(obj)
        await self.db.flush()
        return obj.name

    async def _process_machine(self, row: Dict[str, Any], t_id: int) -> str:
        """Process a single machine row covering all model fields.

        :param row: Dictionary containing full machine data.
        :param t_id: Resolved team ID to which the machine will be assigned.
        :return: Name of the successfully processed machine.
        """
        room = await self.repo.get_room_by_name(self.db, row.get("room_name"), t_id)
        if not room:
            raise exceptions.ObjectNotFoundError("Room", row.get("room_name"))

        shelf_id = None
        if row.get("shelf_name"):
            if not row.get("rack_name"):
                raise exceptions.ValidationError(
                    "Rack name is required when shelf name is provided"
                )
            shelf = await self.repo.get_shelf_by_name(
                self.db, row["shelf_name"], row["rack_name"], room.id
            )
            if not shelf:
                raise exceptions.ObjectNotFoundError(
                    "Shelf", f"{row['shelf_name']} in {row['rack_name']}"
                )
            shelf_id = shelf.id

        meta_data = row.get("metadata", {})
        meta = models.Metadata(
            last_update=datetime.now().date(),
            agent_prometheus=bool(meta_data.get("agent_prometheus", False)),
            ansible_access=bool(meta_data.get("ansible_access", False)),
            ansible_root_access=bool(meta_data.get("ansible_root_access", False)),
        )
        self.db.add(meta)
        await self.db.flush()

        machine = models.Machines(
            name=row["name"],
            localization_id=room.id,
            mac_address=row.get("mac_address"),
            ip_address=row.get("ip_address"),
            pdu_port=row.get("pdu_port"),
            team_id=t_id,
            os=row.get("os"),
            serial_number=row.get("serial_number"),
            note=row.get("note"),
            ram=row.get("ram"),
            metadata_id=meta.id,
            shelf_id=shelf_id,
            added_on=datetime.now(),
        )

        try:
            self.db.add(machine)
            await self.db.flush()
        except Exception:
            raise exceptions.ConflictError(
                f"Machine '{row['name']}' already exists in room '{row.get('room_name')}'"
            )

        for cpu_name in row.get("cpu", []):
            self.db.add(models.CPUs(name=cpu_name, machine_id=machine.id))

        for disk_data in row.get("disk", []):
            if isinstance(disk_data, dict):
                self.db.add(
                    models.Disks(
                        name=disk_data.get("name", "Unknown"),
                        capacity=disk_data.get("capacity"),
                        machine_id=machine.id,
                    )
                )
            else:
                self.db.add(models.Disks(name=disk_data, machine_id=machine.id))

        await self.db.flush()
        return machine.name

    async def _process_rack(self, row: Dict[str, Any], t_id: int) -> str:
        """Process a single rack row and its optional shelves.

        Allows defining shelves by a list of names or by size (count).
        """
        room = await self.repo.get_room_by_name(self.db, row.get("room_name"), t_id)
        if not room:
            raise exceptions.ObjectNotFoundError("Room", row.get("room_name"))

        rack = models.Rack(name=row["name"], room_id=room.id, team_id=t_id)
        self.db.add(rack)
        await self.db.flush()

        shelf_names = row.get("shelves", [])
        rack_size = int(row.get("size", 0))

        if shelf_names:
            for index, s_name in enumerate(shelf_names):
                shelf = models.Shelf(name=str(s_name), rack_id=rack.id, order=index + 1)
                self.db.add(shelf)
        elif rack_size > 0:
            for i in range(1, rack_size + 1):
                shelf = models.Shelf(name=f"U{i}", rack_id=rack.id, order=i)
                self.db.add(shelf)

        await self.db.flush()
        return rack.name
