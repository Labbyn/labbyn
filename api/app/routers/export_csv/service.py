import csv
import json
import io
from datetime import datetime
from typing import Any, Dict, List
from app.db import models
from app.core import exceptions
from .repository import ExportRepository


class ExportService:
    """Service for handling complex CSV/JSON export operations for various system entities.

    This service manages atomic row-by-row exports, ensuring that relationships
    are resolved via human-readable names.
    """

    def __init__(self, db, ctx):
        """Initialize the Export Service.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing user authorization and team information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = ExportRepository()

        self._mappers = {
            "machines": self._map_machine,
            "racks": self._map_rack,
            "inventory": self._map_inventory,
            "user": self._map_user,
            "maps": self._map_maps,
            "rooms": self._map_room,
            "rentals": self._map_rental,
            "documentation": self._map_documentation,
            "history": self._map_history,
            "tags": lambda item: {"name": item.name, "color": item.color},
            "categories": lambda item: {"name": item.name},
        }

    async def export_data(self, entity_type: str, export_format: str = "json"):
        """Export single table.

        :param entity_type: Type of entity to export.
        :param export_format: Format of export.
        :return: Exported data.
        """
        self._validate_access(entity_type)

        raw_data = await self.repo.get_by_entity_type(self.db, entity_type)
        formatted_data = self._process_data(entity_type, raw_data)

        if export_format == "csv":
            return self._generate_csv(formatted_data)
        return formatted_data

    async def export_bulk(self) -> Dict[str, Any]:
        """Export bulk data.

        :return: Bulk data.
        """
        self.ctx.require_user()
        raw_bundle = await self.repo.get_full_bundle(self.db)

        bundle = {
            "metadata": {
                "exported_at": datetime.now().isoformat(),
                "exported_by": self.ctx.current_user.login,
                "is_full_admin_export": self.ctx.is_admin,
            },
            "data": {
                entity: self._process_data(entity, items)
                for entity, items in raw_bundle.items()
            },
        }
        bundle["data"] = {k: v for k, v in bundle["data"].items() if v}
        return bundle

    def _validate_access(self, entity_type: str):
        """Validate that entity type is accessible.
        :param entity_type: Type of entity to validate.
        """
        if self.ctx.is_admin:
            return
        restricted = ["user", "teams", "history"]
        if entity_type in restricted:
            if not (entity_type == "user" and self.ctx.user_type == "group_admin"):
                raise exceptions.AccessDeniedError(
                    f"You lack permissions to: {entity_type}"
                )

    def _process_data(
        self, entity_type: str, raw_data: List[Any]
    ) -> List[Dict[str, Any]]:
        """Filter and process data from database.

        :param entity_type: Type of entity to filter.
        :param raw_data: Raw data.
        :return: Processed and filtered by RBAC data.

        """
        results = []
        mapper = self._mappers.get(entity_type, self._generic_mapper)

        for item in raw_data:
            if not self.ctx.is_admin:
                if entity_type == "rentals":
                    if (
                        not item.inventory
                        or item.inventory.team_id not in self.ctx.team_ids
                    ):
                        continue
                elif entity_type == "history":
                    if item.user_id != self.ctx.current_user.id:
                        continue
                elif hasattr(item, "team_id"):
                    if item.team_id and item.team_id not in self.ctx.team_ids:
                        continue

            results.append(mapper(item))
        return results

    def _map_machine(self, item: models.Machines):
        """Map machine information.
        :param item: Machine information.
        """
        return {
            "name": item.name,
            "room": item.room.name if item.room else None,
            "team": item.team.name if item.team else None,
            "rack": item.shelf.rack.name if item.shelf and item.shelf.rack else None,
            "shelf": item.shelf.name if item.shelf else None,
            "ip": item.ip_address,
            "mac": item.mac_address,
            "os": item.os,
            "ram": item.ram,
            "cpu": [c.name for c in item.cpus],
            "disk": [{"n": d.name, "c": d.capacity} for d in item.disks],
            "metadata": {
                "agent_prometheus": (
                    item.machine_metadata.agent_prometheus
                    if item.machine_metadata
                    else False
                ),
                "ansible_access": (
                    item.machine_metadata.ansible_access
                    if item.machine_metadata
                    else False
                ),
            },
            "tags": [t.name for t in item.tags],
        }

    def _map_rack(self, item: models.Rack):
        """Map rack information.
        :param item: Rack information.
        """
        return {
            "name": item.name,
            "room": item.room.name if item.room else None,
            "team": item.team.name if item.team else None,
            "shelves": [s.name for s in item.shelves],
            "tags": [t.name for t in item.tags],
        }

    def _map_inventory(self, item: models.Inventory):
        """Map inventory information.
        :param item: Inventory information.
        """
        return {
            "name": item.name,
            "qty": item.quantity,
            "category": item.category.name if item.category else None,
            "room": item.room.name if item.room else None,
            "machine": item.machine.name if item.machine else None,
            "team": item.team.name if item.team else None,
        }

    def _map_user(self, item: models.User):
        """Map user information.
        :param item: User information.
        """
        return {
            "email": item.email,
            "name": f"{item.name} {item.surname}",
            # FIX: .value dla Enuma
            "type": (
                item.user_type.value
                if hasattr(item.user_type, "value")
                else item.user_type
            ),
            "teams": [ut.team.name for ut in item.teams],
        }

    def _map_maps(self, item: models.Map):
        """Map maps information.
        :param item: Maps information.
        """
        return {
            "room": item.room.name if item.room else None,
            "nodes": [{"x": n.x, "y": n.y} for n in item.nodes],
            "segments": [
                {"n1": s.node1_name, "n2": s.node2_name} for s in item.segments
            ],
            "equipment": [
                {"n": e.name, "type": e.eq_type, "x": e.x, "y": e.y}
                for e in item.equipment
            ],
        }

    def _map_room(self, item: models.Rooms):
        """Map rooms information.
        :param item: Rooms information.
        """
        return {
            "name": item.name,
            "type": item.room_type,
            "team": item.team.name if item.team else None,
            "tags": [t.name for t in item.tags],
        }

    def _map_rental(self, item: models.Rentals):
        """Map rental information.
        :param item: Rental information.
        """
        return {
            "item_name": item.inventory.name if item.inventory else "Unknown Item",
            "user_email": item.user.email if item.user else "Unknown User",
            "user_full_name": (
                f"{item.user.name} {item.user.surname}" if item.user else "N/A"
            ),
            "start_date": item.start_date.isoformat() if item.start_date else None,
            "end_date": item.end_date.isoformat() if item.end_date else None,
            "quantity": item.quantity,
            "team": (
                item.inventory.team.name
                if (item.inventory and item.inventory.team)
                else "N/A"
            ),
        }

    def _map_documentation(self, item: models.Documentation):
        """Map documentation information.
        :param item: Documentation information.
        """
        return {
            "title": item.title,
            "author": item.author,
            "content": item.content,
            "tags": [t.name for t in item.tags],
            "added_on": item.added_on.isoformat() if item.added_on else None,
            "modified_on": item.modified_on.isoformat() if item.modified_on else None,
        }

    def _map_history(self, item: models.History):
        """Map history log.
        :param item: History record.
        """
        return {
            "entity_type": (
                item.entity_type.value
                if hasattr(item.entity_type, "value")
                else item.entity_type
            ),
            "action": (
                item.action.value if hasattr(item.action, "value") else item.action
            ),
            "user_email": item.user.email if item.user else "System",
            "timestamp": item.timestamp.isoformat(),
            "extra_data": item.extra_data,
            "entity_id": item.entity_id,
        }

    def _generic_mapper(self, item: Any):
        """Generic mapper.
        :param item: Item information.
        """
        res = {}
        for c in item.__table__.columns:
            val = getattr(item, c.name)
            res[c.name] = val.value if hasattr(val, "value") else val
        return res

    def _generate_csv(self, data: List[Dict[str, Any]]) -> str:
        """Generate CSV file.
        :param data: Data information.
        :return: CSV file.
        """
        if not data:
            return ""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys(), delimiter=";")
        writer.writeheader()
        for row in data:
            flat_row = {
                k: (json.dumps(v) if isinstance(v, (list, dict)) else v)
                for k, v in row.items()
            }
            writer.writerow(flat_row)
        return output.getvalue()
