from typing import Any, Dict, List, Type
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.schemas import map_schemas
from app.utils import redis_service

from .repository import MapRepository


class MapService:
    """Service for managing room maps and their synchronization."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Initialize MapService.

        :param db: Active database session
        :param ctx: Request context
        """
        self.db = db
        self.ctx = ctx

    def _sync_collection(
        self,
        model_cls: Type[Any],
        db_map_id: int,
        incoming_items: List[BaseModel],
        current_items_dict: Dict[int, Any],
        update_fields: List[str],
        extra_attrs: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Generic helper to perform Upsert (Create, Update, Delete) on map components.

        Compares incoming Pydantic models against current SQLAlchemy database models.
        Deletes missing components, updates existing ones, and inserts new ones.

        :param model_cls: SQLAlchemy model class (e.g., models.WallNodes).
        :param db_map_id: ID of the parent map.
        :param incoming_items: List of incoming Pydantic payload models.
        :param current_items_dict: Dictionary of current DB models mapped by their ID.
        :param update_fields: List of model attributes allowed to be updated.
        :param extra_attrs: Optional dictionary of dynamic attributes to attach (mapped by item name).
        :return: Dictionary of created or updated SQLAlchemy models mapped by their name.
        """
        incoming_items = incoming_items or []
        incoming_ids = {item.id for item in incoming_items if item.id is not None}
        extra_attrs = extra_attrs or {}

        for item_id, db_item in current_items_dict.items():
            if item_id not in incoming_ids:
                self.db.delete(db_item)

        created_or_updated_objects = {}
        for item in incoming_items:
            item_data = item.model_dump()
            item_id = item_data.pop("id", None)
            dynamic_attrs = extra_attrs.get(item.name, {})

            if item_id and item_id in current_items_dict:
                db_item = current_items_dict[item_id]
                for field in update_fields:
                    if field in item_data:
                        setattr(db_item, field, item_data[field])

                for k, v in dynamic_attrs.items():
                    setattr(db_item, k, v)
            else:
                merged_data = {**item_data, **dynamic_attrs}

                db_item = model_cls(map_id=db_map_id, **merged_data)
                self.db.add(db_item)
            created_or_updated_objects[item.name] = db_item
        return created_or_updated_objects

    async def get_room_map(self, room_id: int) -> models.Map:
        """Get room map or raise 404.

        :param room_id: ID of the room
        :return: Map model
        """
        self.ctx.require_user()

        room = await MapRepository.get_room_with_team(self.db, room_id)
        if not room:
            raise exceptions.ObjectNotFoundError(f"Room {room_id}")

        await self.ctx.validate_team_access(room.team_id, resource_name="Map")

        db_map = await MapRepository.get_map_by_room_id(self.db, room_id)
        if not db_map:
            raise exceptions.ObjectNotFoundError(f"Map for Room ID {room_id}")

        return db_map

    async def sync_map(
        self, room_id: int, payload: map_schemas.MapUpdate
    ) -> models.Map:
        """Synchronize room map state with locking and validation.

        :param room_id: ID of the room
        :param payload: Data to sync
        :return: Updated Map model
        """
        self.ctx.require_user()

        async with redis_service.acquire_lock(f"map_lock:{room_id}"):
            room = await MapRepository.get_room_with_team(self.db, room_id)
            if not room:
                raise exceptions.ObjectNotFoundError(f"Room {room_id}")

            await self.ctx.validate_team_access(room.team_id, resource_name="Map")

            stmt = sql.select(models.Map).filter(models.Map.room_id == room_id)
            db_map = (await self.db.execute(stmt)).scalar_one_or_none()

            if not db_map:
                db_map = models.Map(room_id=room_id)
                self.db.add(db_map)
                await self.db.flush()

            current_map_state = await MapRepository.get_map_by_room_id(self.db, room_id)
            current_state_exists = current_map_state is not None

            try:
                current_nodes = (
                    {n.id: n for n in current_map_state.nodes}
                    if current_state_exists
                    else {}
                )
                node_lookup = self._sync_collection(
                    model_cls=models.WallNodes,
                    db_map_id=db_map.id,
                    incoming_items=payload.wall_nodes,
                    current_items_dict=current_nodes,
                    update_fields=["name", "x", "y"],
                )

                await self.db.flush()

                segment_extra_attrs = {}
                for s in payload.wall_segments or []:
                    n1, n2 = node_lookup.get(s.node1_name), node_lookup.get(
                        s.node2_name
                    )
                    if n1 and n2:
                        segment_extra_attrs[s.name] = {
                            "node1_id": n1.id,
                            "node2_id": n2.id,
                            "node1_name": s.node1_name,
                            "node2_name": s.node2_name,
                        }

                current_segments = (
                    {s.id: s for s in current_map_state.segments}
                    if current_state_exists
                    else {}
                )
                self._sync_collection(
                    model_cls=models.WallSegments,
                    db_map_id=db_map.id,
                    incoming_items=payload.wall_segments,
                    current_items_dict=current_segments,
                    update_fields=["name"],
                    extra_attrs=segment_extra_attrs,
                )

                current_eq = (
                    {e.id: e for e in current_map_state.equipment}
                    if current_state_exists
                    else {}
                )
                self._sync_collection(
                    model_cls=models.Equipment,
                    db_map_id=db_map.id,
                    incoming_items=payload.equipment,
                    current_items_dict=current_eq,
                    update_fields=[
                        "name",
                        "eq_type",
                        "x",
                        "y",
                        "rotation",
                        "label",
                        "color",
                        "rack_id",
                    ],
                )

                current_labels = (
                    {l.id: l for l in current_map_state.labels}
                    if current_state_exists
                    else {}
                )
                self._sync_collection(
                    model_cls=models.MapLabels,
                    db_map_id=db_map.id,
                    incoming_items=payload.labels,
                    current_items_dict=current_labels,
                    update_fields=["name", "x", "y", "color"],
                )

                await self.db.commit()
                return await MapRepository.get_map_by_room_id(self.db, room_id)

            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    "Failed to synchronize map components"
                ) from e
